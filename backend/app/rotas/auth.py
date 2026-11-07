from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.esquemas import CadastroIn, LoginIn, LoginOut, SenhaIn, StatusOut, UsuarioOut
from app.legal import VERSAO_PRIVACIDADE, VERSAO_TERMOS
from app.modelos import Consentimento, Usuario
from app.seguranca import conferir_senha, criar_token, gerar_hash, precisa_atualizar

router = APIRouter(prefix="/auth", tags=["auth"])


def _login_out(u: Usuario) -> LoginOut:
    return LoginOut(
        email=u.email, nome=u.nome, papel=u.papel, verificado=u.verificado, pro=u.pro, selo=u.selo,
        arroba=u.arroba, bio=u.bio, foto=u.foto, marketing=u.marketing, token=criar_token(u.id),
    )


@router.post("/cadastro", response_model=LoginOut, status_code=201)
def cadastro(dados: CadastroIn, sessao: Session = Depends(obter_sessao)):
    email = dados.email.lower()
    if sessao.scalar(select(Usuario).where(Usuario.email == email)):
        raise HTTPException(409, "Este e-mail já tem conta.")
    usuario = Usuario(
        email=email, nome=dados.nome.strip(), senha_hash=gerar_hash(dados.senha),
        nascimento=dados.nascimento, marketing=dados.marketing,
    )
    sessao.add(usuario)
    sessao.flush()
    # o registro do aceite: o que a pessoa aceitou, em qual versão, quando e por onde
    origem = dados.origem
    sessao.add_all([
        Consentimento(usuario_id=usuario.id, tipo="termos", versao=VERSAO_TERMOS, aceito=True, origem=origem),
        Consentimento(usuario_id=usuario.id, tipo="privacidade", versao=VERSAO_PRIVACIDADE, aceito=True, origem=origem),
        Consentimento(usuario_id=usuario.id, tipo="marketing", versao=VERSAO_PRIVACIDADE, aceito=dados.marketing, origem=origem),
    ])
    if dados.responsavel:
        r = dados.responsavel
        sessao.add(Consentimento(
            usuario_id=usuario.id, tipo="responsavel", versao=VERSAO_PRIVACIDADE, aceito=True, origem=origem,
            detalhe={"nome": r.nome.strip(), "email": r.email.lower()},
        ))
    sessao.commit()
    return _login_out(usuario)


@router.post("/login", response_model=LoginOut)
def login(dados: LoginIn, sessao: Session = Depends(obter_sessao)):
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == dados.email.lower()))
    if not usuario or not conferir_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(401, "E-mail ou senha incorretos.")
    if precisa_atualizar(usuario.senha_hash):   # conta antiga, com o hash mais pesado: regrava no formato leve, uma vez só
        usuario.senha_hash = gerar_hash(dados.senha)
        sessao.commit()
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
