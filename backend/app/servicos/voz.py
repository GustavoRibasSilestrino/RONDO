"""A voz do RONDIN para o que muda de pessoa para pessoa (o nome, os quilos).

As frases fixas do RONDIN são áudios prontos que o app já traz (app/scripts/gerar-vozes.mjs). Só o trecho dinâmico, curto,
é gerado aqui, na hora, no Azure (voz neural). A chave fica só no servidor. Para ninguém gastar a cota, o texto é curto e
restrito (letras, números e pontuação simples), cada trecho gerado fica guardado e há limite de pedidos por IP.

O cache é em memória (some quando o servidor reinicia; um nome pedido de novo é gerado de novo, o que custa quase nada).
"""
import hashlib
import re
import time
from collections import OrderedDict, deque

import httpx
from xml.sax.saxutils import escape

from app.config import config

# Os mesmos sotaques de app/scripts/vozes.config.json. Se trocar a voz lá, troque aqui também.
SOTAQUES: dict[str, dict[str, str]] = {
    "br": {"voz": "pt-BR-AntonioNeural", "lang": "pt-BR"},
    "pt": {"voz": "pt-PT-DuarteNeural", "lang": "pt-PT"},
    "gringo": {"voz": "en-US-AndrewNeural", "lang": "en-US"},
    "espanhol": {"voz": "es-ES-AlvaroNeural", "lang": "es-ES"},
    "italiano": {"voz": "it-IT-DiegoNeural", "lang": "it-IT"},
    "frances": {"voz": "fr-FR-HenriNeural", "lang": "fr-FR"},
    "narrador": {"voz": "pt-BR-AntonioNeural", "lang": "pt-BR", "tom": "-28%", "taxa": "-12%"},
    "robo": {"voz": "pt-BR-AntonioNeural", "lang": "pt-BR", "tom": "-45%", "taxa": "-15%"},
}
FORMATO_AUDIO = "audio-24khz-48kbitrate-mono-mp3"

TEXTO_VALIDO = re.compile(r"^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 '.,-]{0,29}$")
MAX_CACHE = 2000
LIMITE_POR_MINUTO = 20
LIMITE_POR_HORA = 120


class VozIndisponivel(Exception):
    """Sem chave configurada ou o Azure falhou."""


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
    """Conta só o que vai ao Azure. Devolve False se o IP passou do limite (e não conta esse pedido)."""
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


# ---------- Azure ----------
def montar_ssml(texto: str, sotaque: str) -> str:
    cfg = SOTAQUES[sotaque]
    limpo = escape(texto, {'"': "&quot;", "'": "&apos;"})
    if cfg.get("tom") or cfg.get("taxa"):
        atributos = "".join(f' {nome}="{cfg[chave]}"' for nome, chave in (("pitch", "tom"), ("rate", "taxa")) if cfg.get(chave))
        limpo = f"<prosody{atributos}>{limpo}</prosody>"
    return (
        f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{cfg["lang"]}">'
        f'<voice name="{cfg["voz"]}">{limpo}</voice></speak>'
    )


def gerar_mp3(texto: str, sotaque: str) -> bytes:
    chave, regiao = config().azure_speech_key, config().azure_speech_region
    if not chave or not regiao:
        raise VozIndisponivel("Voz não configurada.")
    try:
        r = httpx.post(
            f"https://{regiao}.tts.speech.microsoft.com/cognitiveservices/v1",
            headers={
                "Ocp-Apim-Subscription-Key": chave, "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": FORMATO_AUDIO, "User-Agent": "rondo-api",
            },
            content=montar_ssml(texto, sotaque).encode("utf-8"),
            timeout=8,
        )
    except httpx.HTTPError as e:
        raise VozIndisponivel("O serviço de voz não respondeu.") from e
    if r.status_code != 200 or not r.content:
        raise VozIndisponivel(f"O serviço de voz respondeu {r.status_code}.")
    return r.content
