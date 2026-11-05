"""Regras e montagem de respostas da parte social (visibilidade, contagens, notificações)."""
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import false, func, or_, select
from sqlalchemy.orm import Session

from app.esquemas_social import ClubeOut, ClubeResumo, PessoaOut, PostOut
from app.modelos import Clube, Comentario, Curtida, Membro, Notificacao, Post, Seguidor, Usuario

LIMITE_PADRAO = 20
LIMITE_MAX = 50


def ms(d: datetime) -> int:
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return int(d.timestamp() * 1000)


def limite_valido(n: int) -> int:
    return max(1, min(n, LIMITE_MAX))


def condicao_post_visivel(uid: int):
    """Post do feed geral, de clube público ou de clube em que a pessoa está. Clube privado nunca vaza."""
    return or_(
        Post.clube_id.is_(None),
        Post.clube_id.in_(select(Clube.id).where(Clube.privado == false())),
        Post.clube_id.in_(select(Membro.clube_id).where(Membro.usuario_id == uid)),
    )


def clube_visivel(sessao: Session, uid: int, clube_id: int) -> Clube:
    """O clube, se a pessoa pode vê-lo; senão 404 (não revela que existe)."""
    c = sessao.get(Clube, clube_id)
    if not c or (c.privado and not sessao.get(Membro, (c.id, uid))):
        raise HTTPException(404, "Clube não encontrado.")
    return c


def post_visivel(sessao: Session, uid: int, post_id: int) -> Post:
    p = sessao.scalar(select(Post).where(Post.id == post_id, condicao_post_visivel(uid)))
    if not p:
        raise HTTPException(404, "Publicação não encontrada.")
    return p


def pessoas_out(sessao: Session, uid: int, ids: set[int]) -> dict[int, PessoaOut]:
    if not ids:
        return {}
    usuarios = sessao.scalars(select(Usuario).where(Usuario.id.in_(ids))).all()
    sigo = set(sessao.scalars(select(Seguidor.seguido_id).where(Seguidor.seguidor_id == uid, Seguidor.seguido_id.in_(ids))))
    return {
        u.id: PessoaOut(id=u.id, nome=u.nome, arroba=u.arroba, selo=u.selo, verificado=u.verificado, seguindo=u.id in sigo, voce=u.id == uid)
        for u in usuarios
    }


def montar_posts(sessao: Session, uid: int, posts: list[Post]) -> list[PostOut]:
    if not posts:
        return []
    ids = [p.id for p in posts]
    cheers = dict(sessao.execute(select(Curtida.post_id, func.count()).where(Curtida.post_id.in_(ids)).group_by(Curtida.post_id)).all())
    coments = dict(sessao.execute(select(Comentario.post_id, func.count()).where(Comentario.post_id.in_(ids)).group_by(Comentario.post_id)).all())
    curtidos = set(sessao.scalars(select(Curtida.post_id).where(Curtida.usuario_id == uid, Curtida.post_id.in_(ids))))
    pessoas = pessoas_out(sessao, uid, {p.autor_id for p in posts})
    clube_ids = {p.clube_id for p in posts if p.clube_id}
    clubes = {c.id: c for c in sessao.scalars(select(Clube).where(Clube.id.in_(clube_ids)))} if clube_ids else {}
    return [
        PostOut(
            id=p.id, autor=pessoas[p.autor_id], texto=p.texto, destaque=p.destaque, midia=p.midia,
            clube=ClubeResumo(id=p.clube_id, nome=clubes[p.clube_id].nome) if p.clube_id else None,
            quando=ms(p.criado_em), cheers=cheers.get(p.id, 0), comentarios=coments.get(p.id, 0),
            curtiu=p.id in curtidos, meu=p.autor_id == uid,
        )
        for p in posts
    ]


def pagina_de_posts(sessao: Session, uid: int, consulta, antes: int | None, limite: int):
    """Mais novos primeiro; `antes` é o id do último post já recebido. Pede um a mais para saber se há próxima página."""
    limite = limite_valido(limite)
    if antes:
        consulta = consulta.where(Post.id < antes)
    linhas = sessao.scalars(consulta.order_by(Post.id.desc()).limit(limite + 1)).all()
    proximo = linhas[limite - 1].id if len(linhas) > limite else None
    return montar_posts(sessao, uid, list(linhas[:limite])), proximo


def clubes_out(sessao: Session, uid: int, clubes: list[Clube]) -> list[ClubeOut]:
    if not clubes:
        return []
    ids = [c.id for c in clubes]
    membros = dict(sessao.execute(select(Membro.clube_id, func.count()).where(Membro.clube_id.in_(ids)).group_by(Membro.clube_id)).all())
    meus = set(sessao.scalars(select(Membro.clube_id).where(Membro.usuario_id == uid, Membro.clube_id.in_(ids))))
    return [
        ClubeOut(
            id=c.id, nome=c.nome, descricao=c.descricao, categoria=c.categoria, privado=c.privado, cor=c.cor, meta=c.meta,
            membros=membros.get(c.id, 0), meu=c.id in meus, proprio=c.dono_id == uid, codigo=c.codigo if c.dono_id == uid else None,
        )
        for c in clubes
    ]


def notificar(sessao: Session, destino_id: int, ator: Usuario, tipo: str, post_id: int | None = None) -> None:
    if destino_id == ator.id:
        return
    sessao.add(Notificacao(usuario_id=destino_id, ator_id=ator.id, tipo=tipo, post_id=post_id))


TEXTOS = {
    "cheers": "{nome} deu cheers na sua publicação.",
    "comentario": "{nome} comentou na sua publicação.",
    "seguidor": "{nome} começou a seguir você.",
}
