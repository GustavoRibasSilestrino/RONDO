"""Entrar com Google ou Apple. O app recebe do provedor um "id_token" (um JWT assinado por ele); aqui conferimos a assinatura com as
chaves públicas do provedor, o emissor, o público (o ID de cliente do RONDO) e o prazo. Só e-mail confirmado pelo provedor vale."""
from dataclasses import dataclass

import jwt
from fastapi import HTTPException

from app.config import config

GOOGLE_CHAVES = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_EMISSORES = ["https://accounts.google.com", "accounts.google.com"]
APPLE_CHAVES = "https://appleid.apple.com/auth/keys"
APPLE_EMISSOR = "https://appleid.apple.com"

_clientes: dict[str, jwt.PyJWKClient] = {}


@dataclass
class InfoSocial:
    provedor: str      # google | apple
    sub: str           # o identificador da pessoa no provedor
    email: str
    nome: str | None


def _ids(valor: str) -> list[str]:
    return [x.strip() for x in valor.split(",") if x.strip()]


def _chave(url: str, token: str):
    cliente = _clientes.setdefault(url, jwt.PyJWKClient(url, cache_keys=True, lifespan=3600))
    return cliente.get_signing_key_from_jwt(token).key


def _verdadeiro(v) -> bool:
    return v is True or str(v).lower() == "true"


def _conferir(token: str, provedor: str, url_chaves: str, publicos: list[str], emissores) -> dict:
    if not publicos:
        raise HTTPException(503, f"O login com {provedor} ainda não está configurado.")
    try:
        return jwt.decode(
            token, _chave(url_chaves, token), algorithms=["RS256"], audience=publicos, issuer=emissores,
            options={"require": ["exp", "iss", "aud", "sub"]},
        )
    except (jwt.PyJWTError, OSError):
        raise HTTPException(401, f"Não foi possível confirmar o seu login com {provedor}. Tente de novo.")


def verificar_google(token: str) -> InfoSocial:
    d = _conferir(token, "o Google", GOOGLE_CHAVES, _ids(config().google_client_ids), GOOGLE_EMISSORES)
    if not d.get("email") or not _verdadeiro(d.get("email_verified")):
        raise HTTPException(401, "O Google não confirmou o seu e-mail.")
    return InfoSocial("google", d["sub"], d["email"].lower(), d.get("name"))


def verificar_apple(token: str) -> InfoSocial:
    d = _conferir(token, "a Apple", APPLE_CHAVES, _ids(config().apple_client_ids), APPLE_EMISSOR)
    if not d.get("email") or not _verdadeiro(d.get("email_verified", True)):
        raise HTTPException(401, "A Apple não confirmou o seu e-mail.")
    return InfoSocial("apple", d["sub"], d["email"].lower(), None)
