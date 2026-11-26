"""Desafios: criar, ver os que vêm aí e os que estão rolando, entrar, sair e apagar.
Não há desafio pronto: a lista começa vazia e são as pessoas que criam (pedido do dono, 2026-11-26)."""
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import StatusOut
from app.esquemas_social import DesafioIn, DesafioOut, PaginaDesafios, PaginaPessoas
from app.modelos import Desafio, Participante, Usuario
from app.servicos import penalidades
from app.servicos.social import bloqueados, limite_valido, pessoas_out

router = APIRouter(prefix="/desafios", tags=["desafios"])

MAX_DESAFIOS_ATIVOS = 10           # por pessoa, contando só os que ainda não acabaram
LISTA_MAX = 50
BRASILIA = timezone(timedelta(hours=-3))   # o Brasil não tem mais horário de verão


def hoje() -> date:
    return datetime.now(BRASILIA).date()


def situacao(d: Desafio, dia: date) -> str:
    if dia < d.inicio:
        return "em_breve"
    return "em_andamento" if dia <= d.fim else "encerrado"


def desafios_out(sessao: Session, uid: int, desafios: list[Desafio]) -> list[DesafioOut]:
    if not desafios:
        return []
    ids = [d.id for d in desafios]
    contagem = dict(sessao.execute(
        select(Participante.desafio_id, func.count()).where(Participante.desafio_id.in_(ids)).group_by(Participante.desafio_id)
    ).all())
    meus = set(sessao.scalars(select(Participante.desafio_id).where(Participante.usuario_id == uid, Participante.desafio_id.in_(ids))))
    donos = pessoas_out(sessao, uid, {d.dono_id for d in desafios})
    dia = hoje()
    return [
        DesafioOut(
            id=d.id, titulo=d.titulo, descricao=d.descricao, meta=d.meta, inicio=d.inicio, fim=d.fim, cor=d.cor,
            participantes=contagem.get(d.id, 0), situacao=situacao(d, dia), meu=d.id in meus, proprio=d.dono_id == uid,
            dono=donos.get(d.dono_id),
        )
        for d in desafios
    ]


def desafio_visivel(sessao: Session, uid: int, desafio_id: int) -> Desafio:
    """O desafio, se existe e não é de alguém com bloqueio com a pessoa; senão 404."""
    d = sessao.scalar(select(Desafio).where(Desafio.id == desafio_id, Desafio.dono_id.not_in(bloqueados(uid))))
    if not d:
        raise HTTPException(404, "Desafio não encontrado.")
    return d


@router.get("", response_model=PaginaDesafios)
def listar(
    situacao_: Literal["ativos", "em_breve", "em_andamento", "encerrado", "meus"] = Query("ativos", alias="situacao"),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    """`ativos` (o padrão): os que vêm aí e os que estão rolando. `meus`: os que a pessoa participa, de qualquer época."""
    dia = hoje()
    consulta = select(Desafio).where(Desafio.dono_id.not_in(bloqueados(usuario.id)))
    if situacao_ == "meus":
        dela = select(Participante.desafio_id).where(Participante.usuario_id == usuario.id)
        consulta = consulta.where(Desafio.id.in_(dela)).order_by(Desafio.fim.desc(), Desafio.id.desc())
    elif situacao_ == "em_breve":
        consulta = consulta.where(Desafio.inicio > dia).order_by(Desafio.inicio, Desafio.id)
    elif situacao_ == "em_andamento":
        consulta = consulta.where(Desafio.inicio <= dia, Desafio.fim >= dia).order_by(Desafio.fim, Desafio.id)
    elif situacao_ == "encerrado":
        consulta = consulta.where(Desafio.fim < dia).order_by(Desafio.fim.desc(), Desafio.id.desc())
    else:
        consulta = consulta.where(Desafio.fim >= dia).order_by(Desafio.inicio, Desafio.id)
    return PaginaDesafios(itens=desafios_out(sessao, usuario.id, list(sessao.scalars(consulta.limit(LISTA_MAX)))))


@router.post("", response_model=DesafioOut, status_code=201)
def criar(dados: DesafioIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    penalidades.conferir_texto(sessao, usuario, dados.titulo, dados.descricao, dados.meta)
    dia = hoje()
    if dados.inicio < dia:
        raise HTTPException(422, "O desafio não pode começar no passado.")
    if dados.inicio > dia + timedelta(days=365):
        raise HTTPException(422, "O desafio precisa começar dentro de 1 ano.")
    ativos = sessao.scalar(select(func.count()).select_from(Desafio).where(Desafio.dono_id == usuario.id, Desafio.fim >= dia)) or 0
    if ativos >= MAX_DESAFIOS_ATIVOS:
        raise HTTPException(409, "Você já tem desafios demais rolando. Espere um deles acabar.")
    d = Desafio(
        titulo=dados.titulo, descricao=dados.descricao, meta=(dados.meta or "").strip() or None,
        inicio=dados.inicio, fim=dados.fim, cor=dados.cor, dono_id=usuario.id,
    )
    sessao.add(d)
    sessao.flush()
    sessao.add(Participante(desafio_id=d.id, usuario_id=usuario.id))
    sessao.commit()
    return desafios_out(sessao, usuario.id, [d])[0]


@router.get("/{desafio_id}", response_model=DesafioOut)
def ver(desafio_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    return desafios_out(sessao, usuario.id, [desafio_visivel(sessao, usuario.id, desafio_id)])[0]


@router.post("/{desafio_id}/entrar", response_model=DesafioOut)
def entrar(desafio_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    d = desafio_visivel(sessao, usuario.id, desafio_id)
    if d.fim < hoje():
        raise HTTPException(409, "Este desafio já acabou.")
    if not sessao.get(Participante, (d.id, usuario.id)):
        sessao.add(Participante(desafio_id=d.id, usuario_id=usuario.id))
        try:
            sessao.commit()
        except IntegrityError:   # duas chamadas ao mesmo tempo: já está dentro
            sessao.rollback()
    return desafios_out(sessao, usuario.id, [d])[0]


@router.post("/{desafio_id}/sair", response_model=DesafioOut)
def sair(desafio_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    d = desafio_visivel(sessao, usuario.id, desafio_id)
    if d.dono_id == usuario.id:
        raise HTTPException(409, "Quem criou o desafio não pode sair: apague o desafio.")
    p = sessao.get(Participante, (d.id, usuario.id))
    if p:
        sessao.delete(p)
        sessao.commit()
    return desafios_out(sessao, usuario.id, [d])[0]


@router.delete("/{desafio_id}", response_model=StatusOut)
def apagar(desafio_id: int, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    d = desafio_visivel(sessao, usuario.id, desafio_id)
    if d.dono_id != usuario.id:
        raise HTTPException(403, "Só quem criou o desafio pode apagá-lo.")
    sessao.execute(delete(Participante).where(Participante.desafio_id == d.id))
    sessao.delete(d)
    sessao.commit()
    return StatusOut(status="ok")


@router.get("/{desafio_id}/participantes", response_model=PaginaPessoas)
def participantes(
    desafio_id: int,
    limite: int = Query(12, ge=1, le=50),
    usuario: Usuario = Depends(usuario_atual),
    sessao: Session = Depends(obter_sessao),
):
    desafio_visivel(sessao, usuario.id, desafio_id)
    ids = list(sessao.scalars(
        select(Participante.usuario_id)
        .where(Participante.desafio_id == desafio_id, Participante.usuario_id.not_in(bloqueados(usuario.id)))
        .order_by(Participante.entrou_em).limit(limite_valido(limite))
    ))
    pessoas = pessoas_out(sessao, usuario.id, set(ids))
    return PaginaPessoas(itens=[pessoas[i] for i in ids if i in pessoas])
