"""Verificação em duas etapas (2FA) por aplicativo autenticador (Google Authenticator, Authy, o do iPhone...): TOTP do RFC 6238,
com 6 dígitos, passo de 30 segundos e SHA-1, que é o que todos esses aplicativos usam por padrão.

- O segredo de cada conta fica cifrado no banco (Fernet, com a chave tirada do JWT_SEGREDO): quem lesse o banco sozinho não
  conseguiria gerar os códigos.
- Aceita o código do passo atual e o de um passo antes ou depois (o relógio do celular pode estar um pouco fora), e nunca o
  mesmo passo duas vezes: um código visto por cima do ombro não serve de novo.
- Os códigos de reserva (para quem perder o celular) são 8, de uso único, e no banco fica só o hash de cada um.

Escrito à mão, sem biblioteca: são poucas linhas e o algoritmo é fixo."""
import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

from cryptography.fernet import Fernet, InvalidToken

from app.config import config

PASSO = 30
DIGITOS = 6
JANELA = 1                 # passos aceitos antes e depois do atual
EMISSOR = "RONDO"
QTD_RESERVA = 8
_ALFABETO_RESERVA = "abcdefghjkmnpqrstuvwxyz23456789"   # sem 0/o, 1/l/i: fácil de copiar à mão


def _fernet() -> Fernet:
    chave = hashlib.sha256(("2fa:" + config().jwt_segredo).encode()).digest()
    return Fernet(base64.urlsafe_b64encode(chave))


def novo_segredo() -> str:
    """20 bytes aleatórios em base32 (sem o '=' do fim), o formato que os aplicativos leem."""
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def cifrar(segredo: str) -> str:
    return _fernet().encrypt(segredo.encode()).decode()


def decifrar(cifrado: str) -> str | None:
    try:
        return _fernet().decrypt(cifrado.encode()).decode()
    except (InvalidToken, ValueError):
        return None


def endereco(segredo: str, email: str) -> str:
    """O otpauth:// que vai no QR code (e que abre o aplicativo autenticador direto, no celular)."""
    rotulo = quote(f"{EMISSOR}:{email}", safe="@:")
    return f"otpauth://totp/{rotulo}?secret={segredo}&issuer={EMISSOR}&algorithm=SHA1&digits={DIGITOS}&period={PASSO}"


def _codigo(segredo: str, passo: int) -> str:
    chave = base64.b32decode(segredo + "=" * (-len(segredo) % 8), casefold=True)
    h = hmac.new(chave, struct.pack(">Q", passo), hashlib.sha1).digest()
    o = h[-1] & 0x0F
    n = (struct.unpack(">I", h[o:o + 4])[0] & 0x7FFFFFFF) % (10 ** DIGITOS)
    return f"{n:0{DIGITOS}d}"


def passo_atual(agora: float | None = None) -> int:
    return int((time.time() if agora is None else agora) // PASSO)


def conferir(segredo: str, codigo: str, ultimo_passo: int | None, agora: float | None = None) -> int | None:
    """Devolve o passo do código, se ele for válido e ainda não usado; senão None. Quem chama grava o passo devolvido."""
    codigo = "".join(c for c in codigo if c.isdigit())
    if len(codigo) != DIGITOS:
        return None
    atual = passo_atual(agora)
    for p in range(atual - JANELA, atual + JANELA + 1):
        if ultimo_passo is not None and p <= ultimo_passo:
            continue
        if hmac.compare_digest(_codigo(segredo, p), codigo):
            return p
    return None


# ---------- códigos de reserva ----------
def novos_codigos_reserva() -> list[str]:
    """8 códigos no formato 'abcd-efgh' (40 bits cada)."""
    def um() -> str:
        s = "".join(secrets.choice(_ALFABETO_RESERVA) for _ in range(8))
        return f"{s[:4]}-{s[4:]}"
    return [um() for _ in range(QTD_RESERVA)]


def normalizar_reserva(codigo: str) -> str:
    s = "".join(c for c in codigo.lower() if c.isalnum())
    return f"{s[:4]}-{s[4:]}" if len(s) == 8 else ""


def hash_reserva(codigo: str) -> str:
    return hmac.new(config().jwt_segredo.encode(), ("reserva:" + normalizar_reserva(codigo)).encode(), hashlib.sha256).hexdigest()


def parece_reserva(codigo: str) -> bool:
    return len(normalizar_reserva(codigo)) == 9 and not codigo.strip().isdigit()
