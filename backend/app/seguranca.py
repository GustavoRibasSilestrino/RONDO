from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.config import config

# Argon2id com 19 MiB, 2 passes e 1 thread: o mínimo que a OWASP recomenda para senhas. O padrão da biblioteca (64 MiB, 3 passes,
# 4 threads) gasta ~340 ms de processador por conferência; no plano grátis do Render (uma fração de CPU) isso virava vários segundos
# só para validar o login. Com estes valores são ~40 ms. Hashes antigos continuam valendo e são regravados no próximo login.
_hasher = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)


def gerar_hash(senha: str) -> str:
    return _hasher.hash(senha)


def conferir_senha(senha: str, hash_: str) -> bool:
    try:
        return _hasher.verify(hash_, senha)
    except VerifyMismatchError:
        return False


def precisa_atualizar(hash_: str) -> bool:
    """True se o hash foi gerado com parâmetros diferentes dos atuais (ex.: os mais pesados de antes)."""
    return _hasher.check_needs_rehash(hash_)


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
