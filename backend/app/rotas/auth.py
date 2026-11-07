import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.config import config
import jwt
from pydantic import BaseModel

from app.esquemas import CadastroIn, CadastroSocialIn, EsqueciSenhaIn, LoginIn, LoginOut, RedefinirSenhaIn, SenhaIn, SocialIn, StatusOut, UsuarioOut, conferir_cadastro
from app.legal import VERSAO_PRIVACIDADE, VERSAO_TERMOS
from app.modelos import Consentimento, RedefinicaoSenha, Usuario
from app.servicos.email import EmailIndisponivel, enviar
from app.servicos.login_social import InfoSocial, verificar_apple, verificar_google
from app.seguranca import conferir_senha, criar_token, gerar_hash, precisa_atualizar

router = APIRouter(prefix="/auth", tags=["auth"])
log = logging.getLogger("rondo.auth")

VALIDADE_CODIGO = timedelta(minutes=15)
MAX_TENTATIVAS = 5
MAX_CODIGOS_POR_HORA = 3


def _hash_codigo(codigo: str) -> str:
    return hashlib.sha256(f"{codigo}:{config().jwt_segredo}".encode()).hexdigest()


def _aware(d: datetime) -> datetime:
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


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


# ---------- entrar com Google ou Apple ----------
class SocialOut(BaseModel):
    precisa_cadastro: bool = False          # primeira vez: falta a data de nascimento e o aceite dos documentos
    login: LoginOut | None = None           # já tinha conta: entra direto
    token_social: str | None = None         # vale 15 minutos e só serve para a segunda etapa (cadastro social)
    nome: str | None = None
    email: str | None = None


def _token_social(info: InfoSocial) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=15)
    return jwt.encode({"typ": "social", "prov": info.provedor, "psub": info.sub, "email": info.email, "nome": info.nome, "exp": exp}, config().jwt_segredo, algorithm="HS256")


def _entrada_social(info: InfoSocial, sessao: Session) -> SocialOut:
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == info.email))
    if usuario:
        return SocialOut(login=_login_out(usuario))
    return SocialOut(precisa_cadastro=True, token_social=_token_social(info), nome=info.nome, email=info.email)


@router.post("/google", response_model=SocialOut)
def entrar_com_google(dados: SocialIn, sessao: Session = Depends(obter_sessao)):
    return _entrada_social(verificar_google(dados.id_token), sessao)


@router.post("/apple", response_model=SocialOut)
def entrar_com_apple(dados: SocialIn, sessao: Session = Depends(obter_sessao)):
    return _entrada_social(verificar_apple(dados.id_token), sessao)


@router.post("/social/cadastro", response_model=LoginOut, status_code=201)
def cadastro_social(dados: CadastroSocialIn, sessao: Session = Depends(obter_sessao)):
    try:
        t = jwt.decode(dados.token_social, config().jwt_segredo, algorithms=["HS256"], options={"require": ["exp", "email"]})
        if t.get("typ") != "social":
            raise jwt.InvalidTokenError("tipo")
    except jwt.PyJWTError:
        raise HTTPException(401, "O login venceu. Entre com o Google ou a Apple de novo.")
    email = str(t["email"]).lower()
    if sessao.scalar(select(Usuario).where(Usuario.email == email)):
        raise HTTPException(409, "Este e-mail já tem conta.")
    try:
        responsavel = conferir_cadastro(dados.nascimento, dados.aceita_termos, dados.aceita_privacidade, dados.responsavel, email)
    except ValueError as e:
        raise HTTPException(422, str(e))
    nome = (dados.nome or t.get("nome") or email.split("@")[0]).strip()[:120]
    if len(nome) < 2:
        nome = "Você"
    # sem senha própria: o hash é de um valor aleatório que ninguém conhece (quem quiser uma senha usa "Esqueci a senha")
    usuario = Usuario(email=email, nome=nome, senha_hash=gerar_hash(secrets.token_urlsafe(32)), nascimento=dados.nascimento, marketing=dados.marketing)
    sessao.add(usuario)
    sessao.flush()
    origem = dados.origem
    sessao.add_all([
        Consentimento(usuario_id=usuario.id, tipo="termos", versao=VERSAO_TERMOS, aceito=True, origem=origem),
        Consentimento(usuario_id=usuario.id, tipo="privacidade", versao=VERSAO_PRIVACIDADE, aceito=True, origem=origem),
        Consentimento(usuario_id=usuario.id, tipo="marketing", versao=VERSAO_PRIVACIDADE, aceito=dados.marketing, origem=origem),
    ])
    if responsavel:
        sessao.add(Consentimento(
            usuario_id=usuario.id, tipo="responsavel", versao=VERSAO_PRIVACIDADE, aceito=True, origem=origem,
            detalhe={"nome": responsavel.nome.strip(), "email": responsavel.email.lower()},
        ))
    sessao.commit()
    return _login_out(usuario)


@router.post("/esqueci-senha", response_model=StatusOut)
def esqueci_senha(dados: EsqueciSenhaIn, sessao: Session = Depends(obter_sessao)):
    """Manda um código de 6 dígitos para o e-mail. A resposta é sempre a mesma, exista a conta ou não: ninguém descobre quem tem conta."""
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == dados.email.lower()))
    if usuario:
        agora = datetime.now(timezone.utc)
        recentes = sessao.scalar(select(func.count()).select_from(RedefinicaoSenha).where(
            RedefinicaoSenha.usuario_id == usuario.id, RedefinicaoSenha.criado_em > agora - timedelta(hours=1))) or 0
        if recentes < MAX_CODIGOS_POR_HORA:
            codigo = f"{secrets.randbelow(10**6):06d}"
            sessao.add(RedefinicaoSenha(usuario_id=usuario.id, codigo_hash=_hash_codigo(codigo), expira_em=agora + VALIDADE_CODIGO))
            sessao.commit()
            try:
                enviar(
                    usuario.email, "Seu código para redefinir a senha do RONDO",
                    f"Olá, {usuario.nome.split()[0]}!\n\nSeu código é: {codigo}\n\nEle vale por 15 minutos e só pode ser usado uma vez. "
                    "Se não foi você quem pediu, é só ignorar este e-mail: a sua senha continua a mesma.\n\nEquipe RONDO",
                )
            except EmailIndisponivel as e:
                log.error("Não consegui mandar o código de redefinição: %s", e)
    return StatusOut(status="ok")


@router.post("/redefinir-senha", response_model=StatusOut)
def redefinir_senha(dados: RedefinirSenhaIn, sessao: Session = Depends(obter_sessao)):
    erro = HTTPException(400, "Código inválido ou vencido. Peça um novo.")
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == dados.email.lower()))
    if not usuario:
        raise erro
    agora = datetime.now(timezone.utc)
    pedido = sessao.scalar(
        select(RedefinicaoSenha).where(RedefinicaoSenha.usuario_id == usuario.id, RedefinicaoSenha.usado.is_(False))
        .order_by(RedefinicaoSenha.id.desc()).limit(1)
    )
    if not pedido or _aware(pedido.expira_em) < agora or pedido.tentativas >= MAX_TENTATIVAS:
        raise erro
    if not hmac.compare_digest(pedido.codigo_hash, _hash_codigo(dados.codigo)):
        pedido.tentativas += 1
        if pedido.tentativas >= MAX_TENTATIVAS:
            pedido.usado = True   # errou demais: o código morre e é preciso pedir outro
        sessao.commit()
        raise erro
    usuario.senha_hash = gerar_hash(dados.nova)
    for p in sessao.scalars(select(RedefinicaoSenha).where(RedefinicaoSenha.usuario_id == usuario.id, RedefinicaoSenha.usado.is_(False))):
        p.usado = True
    sessao.commit()
    return StatusOut(status="ok")


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
