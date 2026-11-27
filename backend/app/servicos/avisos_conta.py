"""Avisos de segurança por e-mail (senha alterada, entrada por aparelho novo, verificação em duas etapas ligada ou desligada)
e o link "Proteger minha conta" que vai neles.

O link leva a uma página do site (/proteger-conta) com um token no fragmento (#t=...): o fragmento não vai para o servidor do
site nem para logs. O token é assinado, vale 7 dias e carrega a marca da senha de quando foi emitido; depois que a conta é
protegida (ou a senha muda), ele não serve mais. Proteger troca a senha por uma aleatória, o que tira a conta de todos os
aparelhos (os tokens de acesso carregam a mesma marca), e cancela os códigos de redefinição pendentes."""
import hashlib
import hmac
import logging
import re
from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import config
from app.modelos import AparelhoConhecido, Usuario
from app.seguranca import marca_da_senha
from app.servicos import email_modelos
from app.servicos.email import EmailIndisponivel, enviar

log = logging.getLogger("rondo.avisos")

VALIDADE_PROTEGER = timedelta(days=7)
MAX_APARELHOS = 30
BRASILIA = timezone(timedelta(hours=-3), "Brasília")   # o Brasil não tem horário de verão desde 2019


# ---------- o link de proteger ----------
def token_proteger(usuario: Usuario) -> str:
    exp = datetime.now(timezone.utc) + VALIDADE_PROTEGER
    return jwt.encode({"typ": "proteger", "sub": str(usuario.id), "v": marca_da_senha(usuario.senha_hash), "exp": exp},
                      config().jwt_segredo, algorithm="HS256")


def link_proteger(usuario: Usuario) -> str:
    return f"{config().site_url.rstrip('/')}/proteger-conta#t={token_proteger(usuario)}"


def ler_token_proteger(token: str) -> tuple[int, str] | None:
    try:
        d = jwt.decode(token, config().jwt_segredo, algorithms=["HS256"], options={"require": ["exp", "sub", "v"]})
        if d.get("typ") != "proteger":
            return None
        return int(d["sub"]), str(d["v"])
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        return None


# ---------- quando e onde ----------
def quando_agora() -> str:
    a = datetime.now(BRASILIA)
    return f"{a:%d/%m/%Y} às {a:%H:%M} (horário de Brasília)"


def descrever_aparelho(user_agent: str | None) -> str:
    """Um nome simples do aparelho a partir do User-Agent: "Chrome no Windows", "App no iPhone"..."""
    ua = user_agent or ""
    if re.search(r"okhttp", ua, re.I):
        return "App no Android"
    if re.search(r"CFNetwork|Darwin", ua) and "Mozilla" not in ua:
        return "App no iPhone ou iPad"
    sistema = next((n for p, n in [
        (r"iPhone", "iPhone"), (r"iPad", "iPad"), (r"Android", "Android"), (r"Windows", "Windows"),
        (r"Macintosh|Mac OS X", "Mac"), (r"CrOS", "Chromebook"), (r"Linux", "Linux"),
    ] if re.search(p, ua)), "")
    navegador = next((n for p, n in [
        (r"Edg/", "Edge"), (r"OPR/|Opera", "Opera"), (r"SamsungBrowser", "Samsung Internet"), (r"Firefox/|FxiOS", "Firefox"),
        (r"Chrome/|CriOS", "Chrome"), (r"Safari/", "Safari"),
    ] if re.search(p, ua)), "")
    if navegador and sistema:
        return f"{navegador} no {sistema}"
    return navegador or sistema or "Aparelho desconhecido"


# ---------- aparelhos conhecidos ----------
def _marca_aparelho(aparelho: str) -> str:
    return hmac.new(config().jwt_segredo.encode(), ("aparelho:" + aparelho).encode(), hashlib.sha256).hexdigest()[:40]


def registrar_aparelho(sessao: Session, usuario_id: int, aparelho: str | None) -> bool:
    """Grava o aparelho como conhecido. Devolve True quando é uma entrada nova que merece aviso: a conta já tinha outros
    aparelhos e este nunca tinha aparecido. O primeiro aparelho de uma conta (e o primeiro depois desta regra existir) não
    gera aviso. Sem identificador (versões antigas do app), não faz nada."""
    if not aparelho:
        return False
    marca = _marca_aparelho(aparelho)
    agora = datetime.now(timezone.utc)
    ja = sessao.scalar(select(AparelhoConhecido).where(AparelhoConhecido.usuario_id == usuario_id, AparelhoConhecido.marca == marca))
    if ja:
        ja.visto_em = agora
        sessao.commit()
        return False
    outros = sessao.scalar(select(func.count()).select_from(AparelhoConhecido).where(AparelhoConhecido.usuario_id == usuario_id)) or 0
    sessao.add(AparelhoConhecido(usuario_id=usuario_id, marca=marca, criado_em=agora, visto_em=agora))
    if outros >= MAX_APARELHOS:   # guarda só os mais recentes
        velhos = sessao.scalars(select(AparelhoConhecido.id).where(AparelhoConhecido.usuario_id == usuario_id)
                                .order_by(AparelhoConhecido.visto_em.asc()).limit(outros - MAX_APARELHOS + 1)).all()
        sessao.execute(delete(AparelhoConhecido).where(AparelhoConhecido.id.in_(velhos)))
    sessao.commit()
    return outros > 0


# ---------- mandar (sempre em segundo plano: o e-mail não atrasa a resposta) ----------
def _mandar(para: str, m: email_modelos.Mensagem) -> None:
    try:
        enviar(para, m.assunto, m.texto, html=m.html)
    except EmailIndisponivel as e:
        log.error("Não consegui mandar o aviso de segurança (%s): %s", m.assunto, e)


def _primeiro_nome(usuario: Usuario) -> str:
    return (usuario.nome or "").split()[0] if (usuario.nome or "").strip() else "você"


def dados_do_aviso(usuario: Usuario, user_agent: str | None) -> dict:
    """O que os avisos precisam, já em texto: assim a tarefa em segundo plano não depende da sessão do banco."""
    return {"para": usuario.email, "nome": _primeiro_nome(usuario), "quando": quando_agora(),
            "aparelho": descrever_aparelho(user_agent), "link": link_proteger(usuario)}


def avisar_senha_alterada(d: dict) -> None:
    _mandar(d["para"], email_modelos.senha_alterada(d["nome"], d["para"], d["quando"], d["aparelho"], d["link"]))


def avisar_entrada_nova(d: dict) -> None:
    _mandar(d["para"], email_modelos.entrada_nova(d["nome"], d["para"], d["quando"], d["aparelho"], d["link"]))


def avisar_dois_fatores(d: dict, ligou: bool) -> None:
    _mandar(d["para"], email_modelos.dois_fatores_mudou(d["nome"], d["para"], ligou, d["quando"], d["aparelho"], d["link"]))
