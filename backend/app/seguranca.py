from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.config import config

_hasher = PasswordHasher()


def gerar_hash(senha: str) -> str:
    return _hasher.hash(senha)


def conferir_senha(senha: str, hash_: str) -> bool:
    try:
        return _hasher.verify(hash_, senha)
    except VerifyMismatchError:
        return False


def criar_token(usuario_id: int) -> str:
    cfg = config()
    exp = datetime.now(timezone.utc) + timedelta(minutes=cfg.jwt_expira_minutos)
    return jwt.encode({"sub": str(usuario_id), "exp": exp}, cfg.jwt_segredo, algorithm="HS256")


def ler_token(token: str) -> int | None:
    try:
        dados = jwt.decode(token, config().jwt_segredo, algorithms=["HS256"])
        return int(dados["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
