"""Verificação em duas etapas (2FA) da conta: ligar (com o aplicativo autenticador), desligar e trocar os códigos de reserva.

Ligar é em dois passos: /iniciar confere a senha e devolve o segredo (e o endereço do QR code); /ativar recebe o primeiro
código do aplicativo, prova que a pessoa configurou certo e só então liga, devolvendo os 8 códigos de reserva (mostrados uma
vez só). Desligar e trocar os códigos de reserva pedem a senha e um código. Ligar e desligar mandam aviso por e-mail.

Vale para entrar com e-mail e senha. Entrar com Google ou Apple não pede o código (a conta Google ou Apple protege essa entrada)."""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.modelos import CodigoReserva, Usuario
from app.protecao import conta_travada, registrar_falha, zerar_falhas
from app.rotas.auth import _ua, conferir_segundo_fator
from app.seguranca import conferir_senha
from app.servicos import avisos_conta
from app.servicos import dois_fatores as d2f

router = APIRouter(prefix="/auth/2fa", tags=["auth"])

MSG_SENHA = ("A senha está incorreta. Se você entra com o Google ou a Apple e nunca criou uma senha, crie uma em "
             "\"Esqueci a senha\" e volte aqui.")


class SituacaoOut(BaseModel):
    ativo: bool
    reservas_restantes: int


class SenhaIn(BaseModel):
    senha: str = Field(max_length=128)


class IniciarOut(BaseModel):
    segredo: str        # a chave para digitar à mão no aplicativo, se não der para ler o QR code
    endereco: str       # otpauth://... (o conteúdo do QR code; no celular, abre o aplicativo autenticador direto)


class CodigoIn(BaseModel):
    codigo: str = Field(min_length=6, max_length=20)


class SenhaCodigoIn(BaseModel):
    senha: str = Field(max_length=128)
    codigo: str = Field(min_length=6, max_length=20)


class ReservaOut(BaseModel):
    codigos_reserva: list[str]   # mostrados uma vez só: no banco fica só o hash


def _conferir_senha(usuario: Usuario, senha: str) -> None:
    chave = f"senha:{usuario.id}"
    if conta_travada(chave):
        raise HTTPException(429, "Muitas tentativas. Espere 15 minutos e tente de novo.", headers={"Retry-After": "900"})
    if not conferir_senha(senha, usuario.senha_hash):
        registrar_falha(chave)
        raise HTTPException(400, MSG_SENHA)   # 400, não 401: no app, 401 com token derruba a sessão
    zerar_falhas(chave)


def _conferir_codigo(sessao: Session, usuario: Usuario, codigo: str) -> None:
    chave = f"2fa:{usuario.id}"
    if conta_travada(chave):
        raise HTTPException(429, "Muitos códigos errados. Espere 15 minutos e tente de novo.", headers={"Retry-After": "900"})
    if not conferir_segundo_fator(sessao, usuario, codigo):
        registrar_falha(chave)
        raise HTTPException(400, "Código incorreto ou vencido. Confira o aplicativo e tente de novo.")
    zerar_falhas(chave)


def _novas_reservas(sessao: Session, usuario: Usuario) -> list[str]:
    codigos = d2f.novos_codigos_reserva()
    sessao.execute(delete(CodigoReserva).where(CodigoReserva.usuario_id == usuario.id))
    sessao.add_all([CodigoReserva(usuario_id=usuario.id, codigo_hash=d2f.hash_reserva(c)) for c in codigos])
    return codigos


@router.get("", response_model=SituacaoOut)
def situacao(usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    restantes = sessao.scalar(select(func.count()).select_from(CodigoReserva).where(
        CodigoReserva.usuario_id == usuario.id, CodigoReserva.usado_em.is_(None))) or 0
    return SituacaoOut(ativo=usuario.totp_ativo, reservas_restantes=restantes if usuario.totp_ativo else 0)


@router.post("/iniciar", response_model=IniciarOut)
def iniciar(dados: SenhaIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    if usuario.totp_ativo:
        raise HTTPException(409, "A verificação em duas etapas já está ligada.")
    _conferir_senha(usuario, dados.senha)
    segredo = d2f.novo_segredo()
    usuario = sessao.merge(usuario)
    usuario.totp_segredo = d2f.cifrar(segredo)
    usuario.totp_passo = None
    sessao.commit()
    return IniciarOut(segredo=segredo, endereco=d2f.endereco(segredo, usuario.email))


@router.post("/ativar", response_model=ReservaOut)
def ativar(dados: CodigoIn, request: Request, tarefas: BackgroundTasks, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    usuario = sessao.merge(usuario)
    if usuario.totp_ativo:
        raise HTTPException(409, "A verificação em duas etapas já está ligada.")
    segredo = d2f.decifrar(usuario.totp_segredo) if usuario.totp_segredo else None
    if not segredo:
        raise HTTPException(400, "Comece de novo: toque em ligar a verificação em duas etapas.")
    chave = f"2fa:{usuario.id}"
    if conta_travada(chave):
        raise HTTPException(429, "Muitos códigos errados. Espere 15 minutos e tente de novo.", headers={"Retry-After": "900"})
    passo = d2f.conferir(segredo, dados.codigo, None)
    if passo is None:
        registrar_falha(chave)
        raise HTTPException(400, "Código incorreto. Confira se o relógio do celular está certo e digite o código que aparece agora.")
    zerar_falhas(chave)
    usuario.totp_ativo = True
    usuario.totp_passo = passo
    codigos = _novas_reservas(sessao, usuario)
    sessao.commit()
    tarefas.add_task(avisos_conta.avisar_dois_fatores, avisos_conta.dados_do_aviso(usuario, _ua(request)), True)
    return ReservaOut(codigos_reserva=codigos)


@router.post("/desativar", response_model=SituacaoOut)
def desativar(dados: SenhaCodigoIn, request: Request, tarefas: BackgroundTasks, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    usuario = sessao.merge(usuario)
    if not usuario.totp_ativo:
        return SituacaoOut(ativo=False, reservas_restantes=0)
    _conferir_senha(usuario, dados.senha)
    _conferir_codigo(sessao, usuario, dados.codigo)
    usuario.totp_ativo = False
    usuario.totp_segredo = None
    usuario.totp_passo = None
    sessao.execute(delete(CodigoReserva).where(CodigoReserva.usuario_id == usuario.id))
    sessao.commit()
    tarefas.add_task(avisos_conta.avisar_dois_fatores, avisos_conta.dados_do_aviso(usuario, _ua(request)), False)
    return SituacaoOut(ativo=False, reservas_restantes=0)


@router.post("/reserva", response_model=ReservaOut)
def trocar_reservas(dados: SenhaCodigoIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    """Gera 8 códigos de reserva novos; os antigos (usados ou não) deixam de valer."""
    usuario = sessao.merge(usuario)
    if not usuario.totp_ativo:
        raise HTTPException(409, "A verificação em duas etapas está desligada.")
    _conferir_senha(usuario, dados.senha)
    _conferir_codigo(sessao, usuario, dados.codigo)
    codigos = _novas_reservas(sessao, usuario)
    sessao.commit()
    return ReservaOut(codigos_reserva=codigos)
