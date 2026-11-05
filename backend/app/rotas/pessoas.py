"""Buscar pessoas, ver o perfil de outra pessoa e seguir."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import StatusOut
from app.esquemas_social import PaginaPessoas, PaginaPosts, PerfilOut
from app.modelos import Post, Seguidor, Usuario
from app.servicos.social import condicao_post_visivel, limite_valido, notificar, pagina_de_posts, pessoas_out

router = APIRouter(prefix="/pessoas", tags=["pessoas"])


def _usuario(sessao: Session, pessoa_id: int) -> Usuario:
    u = sessao.get(Usuario, pessoa_id)
    if not u:
        raise HTTPException(404, "Pessoa não encontrada.")
    return u


def _pagina(sessao: Session, uid: int, ids: list[int], proximo: int | None) -> PaginaPessoas:
    pessoas = pessoas_out(sessao, uid, set(ids))
    return PaginaPessoas(itens=[pessoas[i] for i in ids if i in pessoas], proximo=proximo)


@router.get("", response_model=PaginaPessoas)
def buscar(
    q: str = Query("", max_length=60),
    limite: int = Query(20, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    """Por nome ou @. Sem busca, sugere quem a pessoa ainda não segue. Nunca devolve e-mail."""
    q = q.strip().lstrip("@").lower()
    consulta = select(Usuario.id).where(Usuario.id != usuario.id)
    if q:
        consulta = consulta.where(or_(func.lower(Usuario.nome).contains(q, autoescape=True), Usuario.arroba.contains(q, autoescape=True)))
    else:
        consulta = consulta.where(Usuario.id.not_in(select(Seguidor.seguido_id).where(Seguidor.seguidor_id == usuario.id)))
    ids = list(sessao.scalars(consulta.order_by(Usuario.id.desc()).limit(limite_valido(limite))))
    return _pagina(sessao, usuario.id, ids, None)


@router.get("/{pessoa_id}", response_model=PerfilOut)
def perfil(pessoa_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    u = _usuario(sessao, pessoa_id)
    p = pessoas_out(sessao, usuario.id, {u.id})[u.id]
    posts = sessao.scalar(select(func.count()).select_from(Post).where(Post.autor_id == u.id, condicao_post_visivel(usuario.id))) or 0
    seguidores = sessao.scalar(select(func.count()).select_from(Seguidor).where(Seguidor.seguido_id == u.id)) or 0
    seguindo = sessao.scalar(select(func.count()).select_from(Seguidor).where(Seguidor.seguidor_id == u.id)) or 0
    return PerfilOut(**p.model_dump(), bio=u.bio, posts=posts, seguidores=seguidores, seguindo_n=seguindo)


@router.get("/{pessoa_id}/posts", response_model=PaginaPosts)
def posts_da_pessoa(
    pessoa_id: int,
    antes: int | None = None,
    limite: int = Query(20, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    u = _usuario(sessao, pessoa_id)
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
    _usuario(sessao, pessoa_id)
    limite = limite_valido(limite)
    consulta = select(coluna_pessoa).where(coluna_dono == pessoa_id)
    if antes:
        consulta = consulta.where(coluna_pessoa < antes)
    ids = list(sessao.scalars(consulta.order_by(coluna_pessoa.desc()).limit(limite + 1)))
    proximo = ids[limite - 1] if len(ids) > limite else None
    return _pagina(sessao, usuario.id, ids[:limite], proximo)


@router.put("/{pessoa_id}/seguir", response_model=StatusOut)
def seguir(pessoa_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    u = _usuario(sessao, pessoa_id)
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
