from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_opcional
from app.esquemas import AssinaturaIn, StatusOut
from app.modelos import Assinatura, Usuario

router = APIRouter(prefix="/assinaturas", tags=["assinaturas"])

PLANOS = {"pro-mensal", "profissional", "profissional-plus"}


@router.post("", response_model=StatusOut, status_code=201)
def criar(
    dados: AssinaturaIn,
    sessao: Session = Depends(obter_sessao),
    usuario: Usuario | None = Depends(usuario_opcional),
):
    if dados.plano_id not in PLANOS:
        raise HTTPException(422, "Plano inexistente.")
    # TODO: cobrar no gateway (Mercado Pago ou Stripe) com dados.token e guardar o id em gateway_ref.
    # Até lá a assinatura fica pendente; o webhook do gateway a muda para ativa.
    sessao.add(Assinatura(usuario_id=usuario.id if usuario else None, plano_id=dados.plano_id, status="pendente"))
    sessao.commit()
    return StatusOut(status="pendente")
