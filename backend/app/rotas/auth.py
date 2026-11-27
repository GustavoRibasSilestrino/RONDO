import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.banco import obter_sessao
from app.deps import usuario_atual
from app.config import config
import jwt
from pydantic import BaseModel, Field

from app.esquemas import CadastroIn, CadastroSocialIn, EsqueciSenhaIn, LoginIn, LoginOut, RedefinirSenhaIn, SenhaIn, SenhaOut, SocialIn, StatusOut, UsuarioOut, conferir_cadastro
from app.legal import VERSAO_PRIVACIDADE, VERSAO_TERMOS
from app.protecao import conta_travada, registrar_falha, zerar_falhas
from app.modelos import CodigoReserva, Consentimento, RedefinicaoSenha, Usuario
from app.servicos import conta as servico_conta
from app.servicos import avisos_conta, penalidades
from app.servicos import dois_fatores as d2f
from app.servicos.email import EmailIndisponivel, enviar
from app.servicos.email_modelos import codigo_redefinicao
from app.servicos.login_social import InfoSocial, verificar_apple, verificar_google
from app.seguranca import conferir_senha, criar_token, gerar_hash, marca_da_senha, precisa_atualizar

router = APIRouter(prefix="/auth", tags=["auth"])
log = logging.getLogger("rondo.auth")

VALIDADE_CODIGO = timedelta(minutes=15)
MAX_TENTATIVAS = 5
MAX_CODIGOS_POR_HORA = 3


def _hash_codigo(codigo: str) -> str:
    return hashlib.sha256(f"{codigo}:{config().jwt_segredo}".encode()).hexdigest()


def _aware(d: datetime) -> datetime:
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _login_out(u: Usuario, dois_fatores_ok: bool = False) -> LoginOut:
    return LoginOut(
        email=u.email, nome=u.nome, papel=u.papel, verificado=u.tem_selo, pro=u.pro, selo=u.selo,
        arroba=u.arroba, bio=u.bio, foto=u.foto, capa=u.capa, mascote=u.mascote, mascote_nome=u.mascote_nome, marketing=u.marketing, dois_fatores=u.dois_fatores, xp_extra=u.xp_extra or 0,
        token=criar_token(u.id, u.senha_hash, dois_fatores=dois_fatores_ok),
    )


def _ua(request: Request) -> str:
    return request.headers.get("user-agent", "")[:400]


def _entrou(sessao: Session, usuario: Usuario, aparelho: str | None, request: Request, tarefas: BackgroundTasks) -> None:
    """Depois de uma entrada que deu certo: guarda o aparelho e, se ele é novo para a conta, avisa por e-mail."""
    if avisos_conta.registrar_aparelho(sessao, usuario.id, aparelho, _ua(request)):
        tarefas.add_task(avisos_conta.avisar_entrada_nova, avisos_conta.dados_do_aviso(usuario, _ua(request)))


def conferir_segundo_fator(sessao: Session, usuario: Usuario, codigo: str) -> bool:
    """O código do aplicativo autenticador (6 dígitos) ou um código de reserva (abcd-efgh, uso único). Grava o uso."""
    if d2f.parece_reserva(codigo):
        h = d2f.hash_reserva(codigo)
        r = sessao.scalar(select(CodigoReserva).where(CodigoReserva.usuario_id == usuario.id, CodigoReserva.codigo_hash == h, CodigoReserva.usado_em.is_(None)))
        if not r:
            return False
        r.usado_em = datetime.now(timezone.utc)
        sessao.commit()
        return True
    segredo = d2f.decifrar(usuario.totp_segredo) if usuario.totp_segredo else None
    passo = d2f.conferir(segredo, codigo, usuario.totp_passo) if segredo else None
    if passo is None:
        return False
    usuario.totp_passo = passo
    sessao.commit()
    return True


def _falta_codigo(mensagem: str) -> HTTPException:
    """Senha certa, mas a conta tem verificação em duas etapas: o app pede o código e manda de novo, junto com a senha."""
    return HTTPException(401, {"dois_fatores": True, "mensagem": mensagem})


@router.post("/cadastro", response_model=LoginOut, status_code=201)
def cadastro(dados: CadastroIn, sessao: Session = Depends(obter_sessao)):
    email = dados.email.lower()
    if sessao.scalar(select(Usuario).where(Usuario.email == email)):
        raise HTTPException(409, "Este e-mail já tem conta.")
    penalidades.nome_permitido(dados.nome)
    if servico_conta.nome_em_uso(sessao, dados.nome):
        raise HTTPException(409, servico_conta.MSG_NOME_EM_USO)
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
    avisos_conta.registrar_aparelho(sessao, usuario.id, dados.aparelho)   # o primeiro aparelho da conta: sem aviso
    return _login_out(usuario)


class NomeIn(BaseModel):
    nome: str = Field(min_length=2, max_length=120)


@router.post("/nome-livre")
def nome_livre(dados: NomeIn, sessao: Session = Depends(obter_sessao)):
    """O app pergunta antes de seguir no cadastro: esse nome ainda está livre? (os nomes já aparecem para todos no app)"""
    return {"livre": not servico_conta.nome_em_uso(sessao, dados.nome)}


@router.post("/login", response_model=LoginOut)
def login(dados: LoginIn, request: Request, tarefas: BackgroundTasks, sessao: Session = Depends(obter_sessao)):
    email = dados.email.lower()
    # muitas senhas erradas para a mesma conta: para de conferir por um tempo, venha o pedido de onde vier
    if conta_travada(email):
        raise HTTPException(429, "Muitas tentativas para esta conta. Espere 15 minutos ou use \"Esqueci a minha senha\".", headers={"Retry-After": "900"})
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == email))
    if not usuario or not conferir_senha(dados.senha, usuario.senha_hash):
        registrar_falha(email)   # conta que não existe também conta: a resposta é igual, e ninguém descobre quem tem conta
        raise HTTPException(401, "E-mail ou senha incorretos.")
    zerar_falhas(email)
    if usuario.banido:
        raise HTTPException(403, penalidades.MSG_BANIDA)
    if usuario.totp_ativo:   # verificação em duas etapas: além da senha, o código do aplicativo (ou um de reserva)
        if not (dados.codigo or "").strip():
            raise _falta_codigo("Digite o código de 6 números do seu aplicativo autenticador.")
        chave = f"2fa:{usuario.id}"
        if conta_travada(chave):
            raise HTTPException(429, "Muitos códigos errados. Espere 15 minutos e tente de novo.", headers={"Retry-After": "900"})
        if not conferir_segundo_fator(sessao, usuario, dados.codigo or ""):
            registrar_falha(chave)
            raise _falta_codigo("Código incorreto ou vencido. Confira o aplicativo e tente de novo.")
        zerar_falhas(chave)
    if precisa_atualizar(usuario.senha_hash):   # conta antiga, com o hash mais pesado: regrava no formato leve, uma vez só
        usuario.senha_hash = gerar_hash(dados.senha)
        sessao.commit()
    _entrou(sessao, usuario, dados.aparelho, request, tarefas)
    return _login_out(usuario, dois_fatores_ok=usuario.totp_ativo)


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


def _entrada_social(info: InfoSocial, dados: SocialIn, request: Request, tarefas: BackgroundTasks, sessao: Session) -> SocialOut:
    """Entrar com Google ou Apple não pede o código da verificação em duas etapas: a conta Google ou Apple já protege essa
    entrada. O aviso de aparelho novo vale igual."""
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == info.email))
    if usuario:
        if not usuario.email_confirmado:
            _tomar_posse(sessao, usuario)
        _entrou(sessao, usuario, dados.aparelho, request, tarefas)
        return SocialOut(login=_login_out(usuario))
    return SocialOut(precisa_cadastro=True, token_social=_token_social(info), nome=info.nome, email=info.email)


def _tomar_posse(sessao: Session, usuario: Usuario) -> None:
    """O Google ou a Apple acabaram de provar que o e-mail é desta pessoa, mas a conta foi criada com senha e o e-mail nunca
    tinha sido provado: pode ter sido outra pessoa que criou a conta com este e-mail para espiar depois. A conta passa a ser
    só de quem provou o e-mail: a senha vira uma aleatória (todos os outros aparelhos saem), a verificação em duas etapas
    configurada antes é desligada e os códigos pendentes morrem. Quem quiser senha de novo usa "Esqueci a senha"."""
    usuario.senha_hash = gerar_hash(secrets.token_urlsafe(32))
    usuario.totp_ativo = False
    usuario.totp_segredo = None
    usuario.totp_passo = None
    sessao.execute(delete(CodigoReserva).where(CodigoReserva.usuario_id == usuario.id))
    for p in sessao.scalars(select(RedefinicaoSenha).where(RedefinicaoSenha.usuario_id == usuario.id, RedefinicaoSenha.usado.is_(False))):
        p.usado = True
    usuario.email_confirmado = True
    sessao.commit()
    log.warning("Conta %s: e-mail provado pelo login social pela primeira vez; senha e 2FA de antes desfeitos", usuario.id)


@router.post("/google", response_model=SocialOut)
def entrar_com_google(dados: SocialIn, request: Request, tarefas: BackgroundTasks, sessao: Session = Depends(obter_sessao)):
    return _entrada_social(verificar_google(dados.id_token), dados, request, tarefas, sessao)


@router.post("/apple", response_model=SocialOut)
def entrar_com_apple(dados: SocialIn, request: Request, tarefas: BackgroundTasks, sessao: Session = Depends(obter_sessao)):
    return _entrada_social(verificar_apple(dados.id_token), dados, request, tarefas, sessao)


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
    penalidades.nome_permitido(nome)
    if servico_conta.nome_em_uso(sessao, nome):
        raise HTTPException(409, servico_conta.MSG_NOME_EM_USO)
    # sem senha própria: o hash é de um valor aleatório que ninguém conhece (quem quiser uma senha usa "Esqueci a senha")
    usuario = Usuario(email=email, nome=nome, senha_hash=gerar_hash(secrets.token_urlsafe(32)), nascimento=dados.nascimento, marketing=dados.marketing,
                      email_confirmado=True)   # o Google/Apple provou o e-mail
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
    avisos_conta.registrar_aparelho(sessao, usuario.id, dados.aparelho)
    return _login_out(usuario)


def _mandar_codigo(para: str, nome: str, codigo: str) -> None:
    m = codigo_redefinicao(nome, para, codigo, minutos=int(VALIDADE_CODIGO.total_seconds() // 60))
    try:
        enviar(para, m.assunto, m.texto, html=m.html)
    except EmailIndisponivel as e:
        log.error("Não consegui mandar o código de redefinição: %s", e)


@router.post("/esqueci-senha", response_model=StatusOut)
def esqueci_senha(dados: EsqueciSenhaIn, tarefas: BackgroundTasks, sessao: Session = Depends(obter_sessao)):
    """Manda um código de 6 dígitos para o e-mail. A resposta é sempre a mesma, exista a conta ou não: ninguém descobre quem tem conta.
    O e-mail sai depois da resposta: antes a resposta demorava mais quando a conta existia, e o tempo entregava quem tem conta."""
    usuario = sessao.scalar(select(Usuario).where(Usuario.email == dados.email.lower()))
    if usuario:
        agora = datetime.now(timezone.utc)
        recentes = sessao.scalar(select(func.count()).select_from(RedefinicaoSenha).where(
            RedefinicaoSenha.usuario_id == usuario.id, RedefinicaoSenha.criado_em > agora - timedelta(hours=1))) or 0
        if recentes < MAX_CODIGOS_POR_HORA:
            codigo = f"{secrets.randbelow(10**6):06d}"
            sessao.add(RedefinicaoSenha(usuario_id=usuario.id, codigo_hash=_hash_codigo(codigo), expira_em=agora + VALIDADE_CODIGO))
            sessao.commit()
            tarefas.add_task(_mandar_codigo, usuario.email, usuario.nome.split()[0], codigo)
    return StatusOut(status="ok")


@router.post("/redefinir-senha", response_model=StatusOut)
def redefinir_senha(dados: RedefinirSenhaIn, request: Request, tarefas: BackgroundTasks, sessao: Session = Depends(obter_sessao)):
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
    usuario.email_confirmado = True   # o código chegou no e-mail: ele é desta pessoa
    for p in sessao.scalars(select(RedefinicaoSenha).where(RedefinicaoSenha.usuario_id == usuario.id, RedefinicaoSenha.usado.is_(False))):
        p.usado = True
    sessao.commit()
    tarefas.add_task(avisos_conta.avisar_senha_alterada, avisos_conta.dados_do_aviso(usuario, _ua(request)))
    return StatusOut(status="ok")


@router.post("/senha", response_model=SenhaOut)
def trocar_senha(dados: SenhaIn, request: Request, tarefas: BackgroundTasks, usuario: Usuario = Depends(usuario_atual), sessao: Session = Depends(obter_sessao)):
    chave = f"senha:{usuario.id}"
    if conta_travada(chave):
        raise HTTPException(429, "Muitas tentativas. Espere 15 minutos e tente de novo.", headers={"Retry-After": "900"})
    if not conferir_senha(dados.atual, usuario.senha_hash):
        registrar_falha(chave)
        # 400, não 401: no app, um 401 com token derruba a sessão. Com 401, errar a senha atual tirava a pessoa da conta (2026-11-27)
        raise HTTPException(400, "A senha atual está incorreta.")
    zerar_falhas(chave)
    if dados.nova == dados.atual:
        raise HTTPException(422, "A nova senha precisa ser diferente da atual.")
    usuario.senha_hash = gerar_hash(dados.nova)
    sessao.commit()
    tarefas.add_task(avisos_conta.avisar_senha_alterada, avisos_conta.dados_do_aviso(usuario, _ua(request)))
    # todos os tokens antigos (deste e de outros aparelhos) deixam de valer; este aparelho recebe um novo e segue logado
    return SenhaOut(status="ok", token=criar_token(usuario.id, usuario.senha_hash))


@router.get("/eu", response_model=UsuarioOut)
def eu(usuario: Usuario = Depends(usuario_atual)):
    return usuario


# ---------- "Não foi você? Proteger minha conta" (o botão dos avisos por e-mail) ----------
class ProtegerIn(BaseModel):
    token: str = Field(min_length=20, max_length=2048)


@router.post("/proteger", response_model=StatusOut)
def proteger(dados: ProtegerIn, sessao: Session = Depends(obter_sessao)):
    """Tira a conta de todos os aparelhos na hora (a senha vira uma aleatória, e os tokens carregam a marca da senha) e cancela
    os códigos de redefinição pendentes. Para voltar, a pessoa cria uma senha nova em "Esqueci a senha" (o código vai para o
    e-mail dela) ou entra com o Google ou a Apple. O link serve uma vez só: depois disso a marca da senha muda."""
    lido = avisos_conta.ler_token_proteger(dados.token)
    usuario = sessao.get(Usuario, lido[0]) if lido else None
    if not usuario or lido[1] != marca_da_senha(usuario.senha_hash):
        raise HTTPException(400, "Este link venceu ou já foi usado. Se ainda precisar, use \"Esqueci a senha\" para criar uma senha nova: isso também tira a conta dos outros aparelhos.")
    usuario.senha_hash = gerar_hash(secrets.token_urlsafe(32))
    for p in sessao.scalars(select(RedefinicaoSenha).where(RedefinicaoSenha.usuario_id == usuario.id, RedefinicaoSenha.usado.is_(False))):
        p.usado = True
    sessao.commit()
    log.warning("Conta %s protegida pelo link do aviso de segurança", usuario.id)
    return StatusOut(status="ok")
