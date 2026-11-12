"""Segurança da comunidade: denunciar conteúdo ou pessoa, bloquear pessoas e a fila de denúncias que o dono do RONDO analisa.

As lojas (App Store e Google Play) exigem isso de todo app com conteúdo publicado pelas pessoas: um jeito de denunciar,
um jeito de bloquear, alguém que analise as denúncias (e tire do ar o que viola as regras) e um contato visível.
"""
import logging
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import StatusOut
from app.esquemas_social import PaginaPessoas, PessoaOut
from app.modelos import Bloqueio, Comentario, Denuncia, Notificacao, Post, Seguidor, Story, StoryReacao, StoryVisto, Usuario
from app.servicos import conta as servico_conta
from app.servicos import email as servico_email
from app.servicos import penalidades
from app.servicos import midia as servico_midia
from app.servicos.social import ha_bloqueio, ms, pessoas_out, post_visivel

log = logging.getLogger("rondo.moderacao")
router = APIRouter(tags=["moderação"])

Tipo = Literal["post", "comentario", "story", "pessoa"]
Motivo = Literal["spam", "ofensa", "odio", "nudez", "violencia", "golpe", "outro"]


class DenunciaIn(BaseModel):
    tipo: Tipo
    alvo_id: int = Field(gt=0)
    motivo: Motivo
    detalhe: str | None = Field(default=None, max_length=300)

    @field_validator("detalhe")
    @classmethod
    def _limpo(cls, v: str | None) -> str | None:
        v = " ".join((v or "").split())
        return v or None


class DenunciaOut(BaseModel):
    id: int
    tipo: Tipo
    alvo_id: int
    motivo: Motivo
    detalhe: str | None
    trecho: str | None
    midia: str | None            # a foto ou o vídeo denunciado, se houver e ainda estiver no ar
    autor: PessoaOut | None      # quem publicou (ou a pessoa denunciada)
    denunciante: PessoaOut | None
    quando: int
    situacao: str
    vezes: int                   # quantas denúncias pendentes o mesmo conteúdo tem


class PaginaDenuncias(BaseModel):
    itens: list[DenunciaOut]
    pendentes: int


class DecisaoIn(BaseModel):
    acao: Literal["remover", "manter"]


# ---------- denunciar ----------

def _alvo(sessao: Session, uid: int, tipo: str, alvo_id: int) -> tuple[int, str | None]:
    """O autor e um trecho do que está sendo denunciado. Só dá para denunciar o que a pessoa consegue ver (senão 404)."""
    if tipo == "post":
        p = post_visivel(sessao, uid, alvo_id)
        return p.autor_id, p.texto or None
    if tipo == "comentario":
        c = sessao.get(Comentario, alvo_id)
        if not c:
            raise HTTPException(404, "Comentário não encontrado.")
        post_visivel(sessao, uid, c.post_id)
        return c.autor_id, c.texto
    if tipo == "story":
        s = sessao.get(Story, alvo_id)
        if not s or (s.autor_id != uid and not sessao.get(Seguidor, (uid, s.autor_id))):
            raise HTTPException(404, "Story não encontrado.")
        return s.autor_id, " · ".join(x for x in (s.texto, s.legenda) if x) or None
    u = sessao.get(Usuario, alvo_id)
    if not u or ha_bloqueio(sessao, uid, u.id) and not sessao.get(Bloqueio, (uid, u.id)):
        raise HTTPException(404, "Pessoa não encontrada.")
    return u.id, f"{u.nome}{' (@' + u.arroba + ')' if u.arroba else ''}{': ' + u.bio if u.bio else ''}"


def _avisar_moderadores(emails: list[str], tipo: str, motivo: str) -> None:
    for para in emails:
        try:
            servico_email.enviar(para, "RONDO: nova denúncia", f"Chegou uma denúncia ({tipo}, motivo: {motivo}). Abra o app em Perfil > Configurações > Denúncias para analisar.")
        except servico_email.EmailIndisponivel:
            log.warning("Denúncia nova, mas o e-mail não está configurado para avisar o moderador.")


@router.post("/denuncias", response_model=StatusOut, status_code=201)
def denunciar(dados: DenunciaIn, tarefas: BackgroundTasks, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    # quem denunciou deixa de ver o conteúdo: a segunda denúncia igual só confirma
    if sessao.scalar(select(Denuncia.id).where(Denuncia.denunciante_id == usuario.id, Denuncia.tipo == dados.tipo, Denuncia.alvo_id == dados.alvo_id)):
        return StatusOut(status="ja_denunciado")
    autor_id, trecho = _alvo(sessao, usuario.id, dados.tipo, dados.alvo_id)
    if autor_id == usuario.id:
        raise HTTPException(422, "Você não pode denunciar o que é seu.")
    sessao.add(Denuncia(
        denunciante_id=usuario.id, tipo=dados.tipo, alvo_id=dados.alvo_id, autor_id=autor_id, motivo=dados.motivo,
        detalhe=dados.detalhe, trecho=(trecho or "")[:600] or None,
    ))
    try:
        sessao.commit()
    except IntegrityError:   # duas denúncias iguais ao mesmo tempo
        sessao.rollback()
        return StatusOut(status="ja_denunciado")
    emails = list(sessao.scalars(select(Usuario.email).where(Usuario.papel == "dono")))
    tarefas.add_task(_avisar_moderadores, emails, dados.tipo, dados.motivo)
    return StatusOut(status="ok")


# ---------- bloquear ----------

@router.get("/bloqueios", response_model=PaginaPessoas)
def meus_bloqueios(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    ids = list(sessao.scalars(select(Bloqueio.bloqueado_id).where(Bloqueio.quem_id == usuario.id).order_by(Bloqueio.em.desc()).limit(500)))
    pessoas = pessoas_out(sessao, usuario.id, set(ids))
    return PaginaPessoas(itens=[pessoas[i] for i in ids if i in pessoas], proximo=None)


@router.put("/bloqueios/{pessoa_id}", response_model=StatusOut)
def bloquear(pessoa_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    if pessoa_id == usuario.id:
        raise HTTPException(422, "Você não pode bloquear a si mesmo.")
    if not sessao.get(Usuario, pessoa_id):
        raise HTTPException(404, "Pessoa não encontrada.")
    if not sessao.get(Bloqueio, (usuario.id, pessoa_id)):
        sessao.add(Bloqueio(quem_id=usuario.id, bloqueado_id=pessoa_id))
        # deixam de se seguir e somem os avisos de um para o outro
        sessao.execute(delete(Seguidor).where(or_(
            (Seguidor.seguidor_id == usuario.id) & (Seguidor.seguido_id == pessoa_id),
            (Seguidor.seguidor_id == pessoa_id) & (Seguidor.seguido_id == usuario.id),
        )))
        sessao.execute(delete(Notificacao).where(or_(
            (Notificacao.usuario_id == usuario.id) & (Notificacao.ator_id == pessoa_id),
            (Notificacao.usuario_id == pessoa_id) & (Notificacao.ator_id == usuario.id),
        )))
        try:
            sessao.commit()
        except IntegrityError:
            sessao.rollback()
    return StatusOut(status="bloqueado")


@router.delete("/bloqueios/{pessoa_id}", response_model=StatusOut)
def desbloquear(pessoa_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    b = sessao.get(Bloqueio, (usuario.id, pessoa_id))
    if b:
        sessao.delete(b)
        sessao.commit()
    return StatusOut(status="ok")


# ---------- a fila de denúncias (só o dono do RONDO) ----------

def _moderador(usuario: Usuario = Depends(usuario_atual)) -> Usuario:
    if usuario.papel != "dono":
        raise HTTPException(404, "Não encontrado.")   # nem confirma que a rota existe
    return usuario


def _midia_do_alvo(sessao: Session, tipo: str, alvo_id: int) -> str | None:
    if tipo == "post":
        p = sessao.get(Post, alvo_id)
        return next((m.get("url") for m in (p.midia or []) if m.get("url")), None) if p else None
    if tipo == "story":
        s = sessao.get(Story, alvo_id)
        return (s.midia or {}).get("url") if s else None
    return None


@router.get("/moderacao/denuncias", response_model=PaginaDenuncias)
def fila(
    situacao: Literal["pendente", "removido", "mantido"] = "pendente",
    limite: int = Query(50, ge=1, le=100),
    moderador: Usuario = Depends(_moderador),
    sessao: Session = Depends(obter_sessao),
):
    linhas = list(sessao.scalars(select(Denuncia).where(Denuncia.situacao == situacao).order_by(Denuncia.id.desc() if situacao != "pendente" else Denuncia.id).limit(limite)))
    pessoas = pessoas_out(sessao, moderador.id, {x for d in linhas for x in (d.autor_id, d.denunciante_id) if x})
    vezes = {
        (t, a): n for t, a, n in sessao.execute(
            select(Denuncia.tipo, Denuncia.alvo_id, func.count()).where(Denuncia.situacao == "pendente").group_by(Denuncia.tipo, Denuncia.alvo_id)
        ).all()
    } if linhas else {}
    pendentes = sessao.scalar(select(func.count()).select_from(Denuncia).where(Denuncia.situacao == "pendente")) or 0
    return PaginaDenuncias(pendentes=pendentes, itens=[
        DenunciaOut(
            id=d.id, tipo=d.tipo, alvo_id=d.alvo_id, motivo=d.motivo, detalhe=d.detalhe, trecho=d.trecho,
            midia=_midia_do_alvo(sessao, d.tipo, d.alvo_id), autor=pessoas.get(d.autor_id) if d.autor_id else None,
            denunciante=pessoas.get(d.denunciante_id), quando=ms(d.criado_em), situacao=d.situacao, vezes=vezes.get((d.tipo, d.alvo_id), 1),
        )
        for d in linhas
    ])


def _tirar_do_ar(sessao: Session, tipo: str, alvo_id: int) -> None:
    from app.rotas.social import apagar_posts   # aqui dentro para não criar import circular
    if tipo == "post":
        apagar_posts(sessao, [alvo_id])
    elif tipo == "comentario":
        sessao.execute(delete(Comentario).where(Comentario.id == alvo_id))
    elif tipo == "story":
        s = sessao.get(Story, alvo_id)
        if s:
            if s.midia and s.midia.get("url"):
                servico_midia.apagar_arquivos([s.midia["url"]])
            sessao.execute(delete(StoryVisto).where(StoryVisto.story_id == s.id))
            sessao.execute(delete(StoryReacao).where(StoryReacao.story_id == s.id))
            sessao.delete(s)
    elif tipo == "pessoa":
        u = sessao.get(Usuario, alvo_id)
        if u and u.papel != "dono":
            servico_conta.apagar_conta(sessao, u)   # a conta sai do RONDO, com tudo o que ela publicou


@router.post("/moderacao/denuncias/{denuncia_id}", response_model=StatusOut)
def decidir(denuncia_id: int, dados: DecisaoIn, moderador: Usuario = Depends(_moderador), sessao: Session = Depends(obter_sessao)):
    d = sessao.get(Denuncia, denuncia_id)
    if not d:
        raise HTTPException(404, "Denúncia não encontrada.")
    tipo, alvo, autor_id = d.tipo, d.alvo_id, d.autor_id
    if dados.acao == "remover":
        _tirar_do_ar(sessao, tipo, alvo)
        # conteúdo tirado do ar conta como um aviso para quem publicou (a conta removida não tem mais o que contar)
        autor = sessao.get(Usuario, autor_id) if autor_id and tipo != "pessoa" else None
        if autor and autor.papel != "dono":
            penalidades.aplicar(sessao, autor, "Conteúdo tirado do ar pela moderação após denúncia", d.trecho)
    situacao = "removido" if dados.acao == "remover" else "mantido"
    agora = datetime.now(timezone.utc)
    # a decisão vale para todas as denúncias pendentes do mesmo conteúdo
    for x in sessao.scalars(select(Denuncia).where(Denuncia.tipo == tipo, Denuncia.alvo_id == alvo, Denuncia.situacao == "pendente")):
        x.situacao, x.resolvido_em = situacao, agora
    sessao.commit()
    return StatusOut(status=situacao)
