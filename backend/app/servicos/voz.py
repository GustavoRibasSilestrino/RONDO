"""A voz do RONDIN para o que muda de pessoa para pessoa (o nome, os quilos).

As frases fixas do RONDIN são áudios prontos que o app já traz (app/scripts/gerar-vozes.mjs). Só o trecho dinâmico, curto,
é gerado aqui, na hora, no ElevenLabs. A chave fica só no servidor. Para ninguém gastar os créditos, o texto é curto e
restrito (letras, números e pontuação simples), cada trecho gerado fica guardado e há limite de pedidos por IP.

O cache é em memória (some quando o servidor reinicia; um nome pedido de novo é gerado de novo, o que custa centavos).
"""
import hashlib
import re
import time
from collections import OrderedDict, deque

import httpx

from app.config import config

# Os mesmos sotaques de app/scripts/vozes.config.json. Se trocar a voz lá, troque aqui também.
SOTAQUES: dict[str, dict[str, str]] = {
    "br": {"modelo": "eleven_multilingual_v2", "voz": "21m00Tcm4TlvDq8ikWAM", "tag": ""},
    "pt": {"modelo": "eleven_v3", "voz": "21m00Tcm4TlvDq8ikWAM", "tag": "[European Portuguese accent from Lisbon]"},
    "gringo": {"modelo": "eleven_v3", "voz": "pNInz6obpgDQGcFmaJgB", "tag": "[strong American English accent, speaking Portuguese]"},
    "espanhol": {"modelo": "eleven_v3", "voz": "pNInz6obpgDQGcFmaJgB", "tag": "[strong Spanish accent, speaking Portuguese]"},
    "italiano": {"modelo": "eleven_v3", "voz": "pNInz6obpgDQGcFmaJgB", "tag": "[strong Italian accent, speaking Portuguese, animated]"},
    "frances": {"modelo": "eleven_v3", "voz": "21m00Tcm4TlvDq8ikWAM", "tag": "[strong French accent, speaking Portuguese, elegant]"},
    "narrador": {"modelo": "eleven_v3", "voz": "pNInz6obpgDQGcFmaJgB", "tag": "[deep dramatic movie trailer narrator voice]"},
    "robo": {"modelo": "eleven_v3", "voz": "pNInz6obpgDQGcFmaJgB", "tag": "[robotic monotone voice]"},
}

TEXTO_VALIDO = re.compile(r"^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 '.,-]{0,29}$")
MAX_CACHE = 2000
LIMITE_POR_MINUTO = 20
LIMITE_POR_HORA = 120


class VozIndisponivel(Exception):
    """Sem chave configurada ou o ElevenLabs falhou."""


def identificador(sotaque: str, texto: str) -> str:
    return hashlib.sha256(f"{sotaque}|{texto}".encode()).hexdigest()[:24]


# ---------- cache ----------
_cache: "OrderedDict[str, bytes]" = OrderedDict()


def guardado(ident: str) -> bytes | None:
    audio = _cache.get(ident)
    if audio is not None:
        _cache.move_to_end(ident)
    return audio


def guardar(ident: str, audio: bytes) -> None:
    _cache[ident] = audio
    _cache.move_to_end(ident)
    while len(_cache) > MAX_CACHE:
        _cache.popitem(last=False)


# ---------- limite por IP ----------
_pedidos: dict[str, deque] = {}


def dentro_do_limite(ip: str, agora: float | None = None) -> bool:
    """Conta só o que vai ao ElevenLabs. Devolve False se o IP passou do limite (e não conta esse pedido)."""
    agora = time.monotonic() if agora is None else agora
    fila = _pedidos.setdefault(ip, deque())
    while fila and agora - fila[0] > 3600:
        fila.popleft()
    ultimo_minuto = sum(1 for t in fila if agora - t <= 60)
    if ultimo_minuto >= LIMITE_POR_MINUTO or len(fila) >= LIMITE_POR_HORA:
        return False
    fila.append(agora)
    if len(_pedidos) > 5000:   # não deixa a tabela de IPs crescer sem fim
        for k in [k for k, f in _pedidos.items() if not f or agora - f[-1] > 3600]:
            _pedidos.pop(k, None)
    return True


# ---------- ElevenLabs ----------
def gerar_mp3(texto: str, sotaque: str) -> bytes:
    chave = config().elevenlabs_api_key
    if not chave:
        raise VozIndisponivel("Voz não configurada.")
    cfg = SOTAQUES[sotaque]
    falado = f"{cfg['tag']} {texto}" if cfg["tag"] and cfg["modelo"] == "eleven_v3" else texto
    try:
        r = httpx.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{cfg['voz']}",
            params={"output_format": "mp3_44100_64"},
            headers={"xi-api-key": chave, "Accept": "audio/mpeg"},
            json={
                "text": falado, "model_id": cfg["modelo"],
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.3, "use_speaker_boost": True},
            },
            timeout=8,
        )
    except httpx.HTTPError as e:
        raise VozIndisponivel("O serviço de voz não respondeu.") from e
    if r.status_code != 200 or not r.content:
        raise VozIndisponivel(f"O serviço de voz respondeu {r.status_code}.")
    return r.content
