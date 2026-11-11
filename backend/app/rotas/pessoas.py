"""Buscar pessoas, ver o perfil de outra pessoa e seguir."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import StatusOut
from app.esquemas_social import ClubeResumo, PaginaPessoas, PaginaPosts, PerfilOut
from app.modelos import Clube, Membro, Post, Seguidor, Usuario
from app.servicos.busca import normalizar, pontuar
from app.servicos.social import bloqueados, condicao_post_visivel, ha_bloqueio, limite_valido, notificar, pagina_de_posts, pessoas_out

router = APIRouter(prefix="/pessoas", tags=["pessoas"])


def _usuario(sessao: Session, pessoa_id: int, uid: int | None = None) -> Usuario:
    """A pessoa; 404 se não existe ou se há bloqueio entre ela e quem pede (`uid`): quem bloqueou some para o outro."""
    u = sessao.get(Usuario, pessoa_id)
    if not u or (uid is not None and u.id != uid and ha_bloqueio(sessao, uid, u.id)):
        raise HTTPException(404, "Pessoa não encontrada.")
    return u


def _pagina(sessao: Session, uid: int, ids: list[int], proximo: int | None) -> PaginaPessoas:
    if ids:
        fora = set(sessao.scalars(bloqueados(uid)))
        ids = [i for i in ids if i not in fora]
    pessoas = pessoas_out(sessao, uid, set(ids))
    return PaginaPessoas(itens=[pessoas[i] for i in ids if i in pessoas], proximo=proximo)


@router.get("", response_model=PaginaPessoas)
def buscar(
    q: str = Query("", max_length=60),
    limite: int = Query(30, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    """Parecida com a do Instagram: sem acento e sem maiúscula, por pedaço do nome ou do @, perdoando erro de digitação, e quem você já
    segue vem na frente. Sem busca, sugere quem a pessoa ainda não segue. Nunca devolve e-mail."""
    termo = normalizar(q).lstrip("@")
    if not termo:
        consulta = select(Usuario.id).where(Usuario.id != usuario.id, Usuario.id.not_in(select(Seguidor.seguido_id).where(Seguidor.seguidor_id == usuario.id)))
        ids = list(sessao.scalars(consulta.order_by(Usuario.id.desc()).limit(limite_valido(limite))))
        return _pagina(sessao, usuario.id, ids, None)

    palavras = [p for p in termo.replace(".", " ").replace("_", " ").split() if p]
    # 1) quem contém algum pedaço da busca (rápido, no banco); 2) se sobrou pouca gente, olha os mais recentes para achar nomes parecidos (erro de digitação)
    filtros = [Usuario.busca.contains(p, autoescape=True) for p in palavras]
    candidatos = list(sessao.execute(select(Usuario.id, Usuario.nome, Usuario.arroba, Usuario.verificado).where(Usuario.id != usuario.id, or_(*filtros)).limit(400)).all())
    if len(candidatos) < limite:
        ja = {c.id for c in candidatos}
        extras = sessao.execute(select(Usuario.id, Usuario.nome, Usuario.arroba, Usuario.verificado).where(Usuario.id != usuario.id).order_by(Usuario.id.desc()).limit(2000)).all()
        candidatos += [e for e in extras if e.id not in ja]
    ids_c = [c.id for c in candidatos]
    sigo = set(sessao.scalars(select(Seguidor.seguido_id).where(Seguidor.seguidor_id == usuario.id, Seguidor.seguido_id.in_(ids_c)))) if ids_c else set()
    me_seguem = set(sessao.scalars(select(Seguidor.seguidor_id).where(Seguidor.seguido_id == usuario.id, Seguidor.seguidor_id.in_(ids_c)))) if ids_c else set()
    contagem = dict(sessao.execute(select(Seguidor.seguido_id, func.count()).where(Seguidor.seguido_id.in_(ids_c)).group_by(Seguidor.seguido_id)).all()) if ids_c else {}
    pontos = [(pontuar(termo, c.nome, c.arroba, c.id in sigo, c.id in me_seguem, bool(c.verificado), contagem.get(c.id, 0)), c) for c in candidatos]
    ordem = sorted((x for x in pontos if x[0] > 0), key=lambda x: (-x[0], normalizar(x[1].nome), x[1].id))
    ids = [c.id for _, c in ordem[:limite_valido(limite)]]
    return _pagina(sessao, usuario.id, ids, None)


@router.get("/{pessoa_id}", response_model=PerfilOut)
def perfil(pessoa_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    u = _usuario(sessao, pessoa_id, usuario.id)
    p = pessoas_out(sessao, usuario.id, {u.id})[u.id]
    posts = sessao.scalar(select(func.count()).select_from(Post).where(Post.autor_id == u.id, condicao_post_visivel(usuario.id))) or 0
    seguidores = sessao.scalar(select(func.count()).select_from(Seguidor).where(Seguidor.seguido_id == u.id)) or 0
    seguindo = sessao.scalar(select(func.count()).select_from(Seguidor).where(Seguidor.seguidor_id == u.id)) or 0
    # clubes dela: o privado só aparece para quem também é membro (nunca vaza que ele existe)
    clubes = sessao.execute(
        select(Clube.id, Clube.nome)
        .join(Membro, Membro.clube_id == Clube.id)
        .where(Membro.usuario_id == u.id, or_(Clube.privado.is_(False), Clube.id.in_(select(Membro.clube_id).where(Membro.usuario_id == usuario.id))))
        .order_by(Membro.entrou_em.desc())
        .limit(20)
    ).all()
    return PerfilOut(**p.model_dump(), bio=u.bio, posts=posts, seguidores=seguidores, seguindo_n=seguindo, clubes=[ClubeResumo(id=i, nome=n) for i, n in clubes])


@router.get("/{pessoa_id}/posts", response_model=PaginaPosts)
def posts_da_pessoa(
    pessoa_id: int,
    antes: int | None = None,
    limite: int = Query(20, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    u = _usuario(sessao, pessoa_id, usuario.id)
    consulta = select(Post).where(Post.autor_id == u.id, condicao_post_visivel(usuario.id))
    itens, proximo = pagina_de_posts(sessao, usuario.id, consulta, antes, limite)
    return PaginaPosts(itens=itens, proximo=proximo)


@router.get("/{pessoa_id}/seguidores", response_model=PaginaPessoas)
def seguidores(
    pessoa_id: int,
    antes: int | None = None,
    limite: int = Query(30, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    return _lista_de_conexoes(sessao, usuario, pessoa_id, Seguidor.seguidor_id, Seguidor.seguido_id, antes, limite)


@router.get("/{pessoa_id}/seguindo", response_model=PaginaPessoas)
def seguindo(
    pessoa_id: int,
    antes: int | None = None,
    limite: int = Query(30, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    return _lista_de_conexoes(sessao, usuario, pessoa_id, Seguidor.seguido_id, Seguidor.seguidor_id, antes, limite)


def _lista_de_conexoes(sessao, usuario, pessoa_id, coluna_pessoa, coluna_dono, antes, limite) -> PaginaPessoas:
    _usuario(sessao, pessoa_id, usuario.id)
    limite = limite_valido(limite)
    consulta = select(coluna_pessoa).where(coluna_dono == pessoa_id)
    if antes:
        consulta = consulta.where(coluna_pessoa < antes)
    ids = list(sessao.scalars(consulta.order_by(coluna_pessoa.desc()).limit(limite + 1)))
    proximo = ids[limite - 1] if len(ids) > limite else None
    return _pagina(sessao, usuario.id, ids[:limite], proximo)


@router.put("/{pessoa_id}/seguir", response_model=StatusOut)
def seguir(pessoa_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    u = _usuario(sessao, pessoa_id, usuario.id)
    if u.id == usuario.id:
        raise HTTPException(422, "Você não pode seguir a si mesmo.")
    if not sessao.get(Seguidor, (usuario.id, u.id)):
        sessao.add(Seguidor(seguidor_id=usuario.id, seguido_id=u.id))
        notificar(sessao, u.id, usuario, "seguidor")
        sessao.commit()
    return StatusOut(status="seguindo")


@router.delete("/{pessoa_id}/seguir", response_model=StatusOut)
def deixar_de_seguir(pessoa_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    _usuario(sessao, pessoa_id)
    s = sessao.get(Seguidor, (usuario.id, pessoa_id))
    if s:
        sessao.delete(s)
        sessao.commit()
    return StatusOut(status="ok")
