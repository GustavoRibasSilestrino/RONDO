import hashlib
import hmac
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


def marca_da_senha(senha_hash: str) -> str:
    """Uma impressão curta do hash da senha, que vai dentro do token. Trocou a senha, a impressão muda e todos os tokens
    antigos deixam de valer: quem roubou um token perde o acesso assim que a pessoa troca ou redefine a senha."""
    return hmac.new(config().jwt_segredo.encode(), senha_hash.encode(), hashlib.sha256).hexdigest()[:16]


def criar_token(usuario_id: int, senha_hash: str) -> str:
    cfg = config()
    agora = datetime.now(timezone.utc)
    exp = agora + timedelta(minutes=cfg.jwt_expira_minutos)
    return jwt.encode({"sub": str(usuario_id), "exp": exp, "iat": agora, "typ": "acesso", "v": marca_da_senha(senha_hash)}, cfg.jwt_segredo, algorithm="HS256")


def ler_token(token: str) -> tuple[int, str | None] | None:
    """Devolve (id do usuário, marca da senha) ou None. Só aceita token de acesso: o token curto do login social (typ "social")
    é assinado com o mesmo segredo e não pode ser usado para entrar."""
    try:
        dados = jwt.decode(token, config().jwt_segredo, algorithms=["HS256"], options={"require": ["exp", "sub"]})
        if dados.get("typ", "acesso") != "acesso":
            return None
        return int(dados["sub"]), dados.get("v")
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        return None
