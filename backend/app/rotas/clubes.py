"""Clubes: criar, achar, entrar (aberto ou por código), sair e apagar."""
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import StatusOut
from app.esquemas_social import ClubeIn, ClubeOut, EntrarPorCodigoIn, PaginaClubes, PaginaPessoas
from app.modelos import Clube, Membro, Post, Usuario
from app.rotas.social import apagar_posts
from app.servicos.social import clube_visivel, clubes_out, limite_valido, pessoas_out

router = APIRouter(prefix="/clubes", tags=["clubes"])

ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"   # sem 0/O/1/I, para não confundir
MAX_CLUBES_CRIADOS = 20


def _codigo(sessao: Session) -> str:
    for _ in range(20):
        c = "".join(secrets.choice(ALFABETO) for _ in range(6))
        if not sessao.scalar(select(Clube.id).where(Clube.codigo == c)):
            return c
    raise HTTPException(503, "Não foi possível gerar o código agora. Tente de novo.")


def _saida(sessao: Session, uid: int, clube: Clube) -> ClubeOut:
    return clubes_out(sessao, uid, [clube])[0]


@router.get("", response_model=PaginaClubes)
def listar(
    q: str = Query("", max_length=60),
    meus: bool = False,
    antes: int | None = None,
    limite: int = Query(30, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    """Os públicos e os que a pessoa participa. Clube privado de outra pessoa não aparece: só se entra pelo código."""
    limite = limite_valido(limite)
    dos_meus = select(Membro.clube_id).where(Membro.usuario_id == usuario.id)
    consulta = select(Clube).where(or_(Clube.privado.is_(False), Clube.id.in_(dos_meus)))
    if meus:
        consulta = select(Clube).where(Clube.id.in_(select(Membro.clube_id).where(Membro.usuario_id == usuario.id)))
    q = q.strip()
    if q:
        consulta = consulta.where(or_(func.lower(Clube.nome).contains(q.lower(), autoescape=True), func.lower(Clube.descricao).contains(q.lower(), autoescape=True)))
    if antes:
        consulta = consulta.where(Clube.id < antes)
    linhas = list(sessao.scalars(consulta.order_by(Clube.id.desc()).limit(limite + 1)))
    proximo = linhas[limite - 1].id if len(linhas) > limite else None
    return PaginaClubes(itens=clubes_out(sessao, usuario.id, linhas[:limite]), proximo=proximo)


@router.post("", response_model=ClubeOut, status_code=201)
def criar(dados: ClubeIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    criados = sessao.scalar(select(func.count()).select_from(Clube).where(Clube.dono_id == usuario.id)) or 0
    if criados >= MAX_CLUBES_CRIADOS:
        raise HTTPException(409, "Você já criou clubes demais.")
    clube = Clube(
        nome=dados.nome, descricao=dados.descricao, categoria=dados.categoria, privado=dados.privado, cor=dados.cor,
        meta=(dados.meta or "").strip() or None, codigo=_codigo(sessao), dono_id=usuario.id,
    )
    sessao.add(clube)
    sessao.flush()
    sessao.add(Membro(clube_id=clube.id, usuario_id=usuario.id))
    sessao.commit()
    return _saida(sessao, usuario.id, clube)


@router.post("/entrar", response_model=ClubeOut)
def entrar_por_codigo(dados: EntrarPorCodigoIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    clube = sessao.scalar(select(Clube).where(Clube.codigo == dados.codigo))
    if not clube:
        raise HTTPException(404, "Código de convite inválido.")
    _adicionar(sessao, clube, usuario)
    return _saida(sessao, usuario.id, clube)


def _adicionar(sessao: Session, clube: Clube, usuario: Usuario) -> None:
    if not sessao.get(Membro, (clube.id, usuario.id)):
        sessao.add(Membro(clube_id=clube.id, usuario_id=usuario.id))
        try:
            sessao.commit()
        except IntegrityError:   # duas chamadas ao mesmo tempo: já está dentro
            sessao.rollback()


@router.get("/{clube_id}", response_model=ClubeOut)
def ver(clube_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    return _saida(sessao, usuario.id, clube_visivel(sessao, usuario.id, clube_id))


@router.post("/{clube_id}/entrar", response_model=ClubeOut)
def entrar(clube_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    clube = sessao.get(Clube, clube_id)
    if not clube or (clube.privado and not sessao.get(Membro, (clube.id, usuario.id))):
        # privado: nem confirma que existe; só o código abre a porta
        raise HTTPException(404 if not clube else 403, "Clube não encontrado." if not clube else "Este clube é privado. Entre com o código de convite.")
    _adicionar(sessao, clube, usuario)
    return _saida(sessao, usuario.id, clube)


@router.post("/{clube_id}/sair", response_model=StatusOut)
def sair(clube_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    clube = clube_visivel(sessao, usuario.id, clube_id)
    if clube.dono_id == usuario.id:
        raise HTTPException(409, "Quem criou o clube não pode sair: apague o clube.")
    m = sessao.get(Membro, (clube.id, usuario.id))
    if m:
        sessao.delete(m)
        sessao.commit()
    return StatusOut(status="ok")


@router.delete("/{clube_id}", response_model=StatusOut)
def apagar(clube_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    clube = clube_visivel(sessao, usuario.id, clube_id)
    if clube.dono_id != usuario.id:
        raise HTTPException(403, "Só quem criou o clube pode apagá-lo.")
    apagar_posts(sessao, list(sessao.scalars(select(Post.id).where(Post.clube_id == clube.id))))
    sessao.execute(delete(Membro).where(Membro.clube_id == clube.id))
    sessao.delete(clube)
    sessao.commit()
    return StatusOut(status="ok")


@router.get("/{clube_id}/membros", response_model=PaginaPessoas)
def membros(
    clube_id: int,
    limite: int = Query(12, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    clube_visivel(sessao, usuario.id, clube_id)
    ids = list(sessao.scalars(select(Membro.usuario_id).where(Membro.clube_id == clube_id).order_by(Membro.entrou_em).limit(limite_valido(limite))))
    pessoas = pessoas_out(sessao, usuario.id, set(ids))
    return PaginaPessoas(itens=[pessoas[i] for i in ids if i in pessoas])
