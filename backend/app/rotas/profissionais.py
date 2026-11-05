from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.esquemas import ProfissionalIn, StatusOut
from app.modelos import Profissional

router = APIRouter(prefix="/profissionais", tags=["profissionais"])


@router.post("", response_model=StatusOut, status_code=201)
def cadastrar(dados: ProfissionalIn, sessao: Session = Depends(obter_sessao)):
    email = dados.email.lower()
    repetido = sessao.scalar(
        select(Profissional).where(
            (Profissional.email == email)
            | (
                (Profissional.tipo == dados.tipo)
                & (Profissional.registro == dados.registro)
                & (Profissional.uf == dados.uf)
            )
        )
    )
    if repetido:
        raise HTTPException(409, "Este profissional já está cadastrado.")
    sessao.add(
        Profissional(nome=dados.nome.strip(), email=email, tipo=dados.tipo, registro=dados.registro, uf=dados.uf)
    )
    sessao.commit()
    return StatusOut(status="pendente")
