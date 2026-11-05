from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import CadastroIn, LoginIn, LoginOut, SenhaIn, StatusOut, UsuarioOut
from app.modelos import Usuario
from app.seguranca import conferir_senha, criar_token, gerar_hash

router = APIRouter(prefix="/auth", tags=["auth"])


def _login_out(u: Usuario) -> LoginOut:
    return LoginOut(
        email=u.email, nome=u.nome, papel=u.papel, verificado=u.verificado, pro=u.pro, selo=u.selo,
        arroba=u.arroba, bio=u.bio, token=criar_token(u.id),
    )


@router.post("/cadastro", response_model=LoginOut, status_code=201)
def cadastro(dados: CadastroIn, sessao: Session = Depends(obter_sessao)):
    email = dados.email.lower()
    if sessao.scalar(select(Usuario).where(Usuario.email == email)):
        raise HTTPException(409, "Este e-mail já tem conta.")
    usuario = Usuario(email=email, nome=dados.nome.strip(), senha_hash=gerar_hash(dados.senha))
    sessao.add(usuario)
    sessao.commit()
    return _login_out(usuario)


@router.post("/login", response_model=LoginOut)
def login(dados: LoginIn, sessao: Session = Depends(obter_sessao)):
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == dados.email.lower()))
    if not usuario or not conferir_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(401, "E-mail ou senha incorretos.")
    return _login_out(usuario)


@router.post("/senha", response_model=StatusOut)
def trocar_senha(dados: SenhaIn, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    if not conferir_senha(dados.atual, usuario.senha_hash):
        raise HTTPException(401, "A senha atual está incorreta.")
    if dados.nova == dados.atual:
        raise HTTPException(422, "A nova senha precisa ser diferente da atual.")
    usuario.senha_hash = gerar_hash(dados.nova)
    sessao.commit()
    return StatusOut(status="ok")


@router.get("/eu", response_model=UsuarioOut)
def eu(usuario: Usuario = Depends(usuario_atual)):
    return usuario
