"""Proteções que valem para a API inteira: de quem é o pedido, travas contra adivinhação de senha, cabeçalhos de segurança
e tamanho máximo do corpo. Tudo em memória do processo (uma instância, que é o que roda hoje)."""
import ipaddress
import time
from collections import defaultdict, deque

from starlette.requests import Request

# ---------- de quem é o pedido ----------
# A API fica atrás do proxy do Render (Cloudflare). O cabeçalho X-Forwarded-For chega com o que o próprio visitante mandou
# na frente, então o primeiro endereço dele pode ser inventado: quem quisesse furar o limite por endereço só precisava
# mandar um X-Forwarded-For diferente a cada pedido. Os cabeçalhos abaixo são escritos pelo proxy e substituem o que vier
# de fora; sem eles (desenvolvimento, testes), vale o endereço da conexão.
_CABECALHOS_DO_PROXY = ("cf-connecting-ip", "true-client-ip")


def ip_do_cliente(request: Request) -> str:
    for nome in _CABECALHOS_DO_PROXY:
        valor = request.headers.get(nome, "").strip()
        if valor:
            try:
                return str(ipaddress.ip_address(valor))
            except ValueError:
                continue   # não é um endereço: ignora
    return request.client.host if request.client else "desconhecido"


# ---------- adivinhação de senha, por conta ----------
# O limite por endereço não segura quem troca de endereço (rede de robôs). Esta trava é por conta: depois de MAX_FALHAS
# senhas erradas em JANELA_FALHAS segundos, a conta só aceita nova tentativa quando a janela andar. Uma senha certa zera.
MAX_FALHAS = 8
JANELA_FALHAS = 15 * 60.0
_falhas: dict[str, deque] = defaultdict(deque)
_ultima_limpeza = time.monotonic()


def _podar(chave: str, agora: float) -> deque:
    fila = _falhas[chave]
    while fila and agora - fila[0] > JANELA_FALHAS:
        fila.popleft()
    return fila


def conta_travada(chave: str) -> bool:
    return len(_podar(chave, time.monotonic())) >= MAX_FALHAS


def registrar_falha(chave: str) -> None:
    global _ultima_limpeza
    agora = time.monotonic()
    _podar(chave, agora).append(agora)
    if agora - _ultima_limpeza > JANELA_FALHAS:   # esquece as contas paradas, para a memória não crescer
        _ultima_limpeza = agora
        for k in [k for k, f in _falhas.items() if not f or agora - f[-1] > JANELA_FALHAS]:
            del _falhas[k]


def zerar_falhas(chave: str) -> None:
    _falhas.pop(chave, None)


# ---------- cabeçalhos de segurança e tamanho do corpo ----------
CABECALHOS = [
    (b"x-content-type-options", b"nosniff"),                                   # o navegador não "adivinha" o tipo do arquivo
    (b"x-frame-options", b"DENY"),                                             # a API não abre dentro de outra página
    (b"referrer-policy", b"no-referrer"),
    (b"strict-transport-security", b"max-age=63072000; includeSubDomains"),    # só por HTTPS, por dois anos
    (b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'"),   # as respostas são dados, não páginas
    (b"cross-origin-resource-policy", b"cross-origin"),                        # o áudio do RONDIN é tocado pelo app, de outro endereço
    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
]
# respostas com dados da conta nunca ficam guardadas em cache de navegador ou de proxy
_SEM_CACHE = (b"cache-control", b"no-store")
_COM_CACHE_PROPRIO = ("/rondin/voz/",)   # o áudio do RONDIN define o próprio cache


class Blindagem:
    """Middleware ASGI puro: recusa corpo grande demais antes de ler e põe os cabeçalhos de segurança em toda resposta."""

    def __init__(self, app, max_corpo: int):
        self.app = app
        self.max_corpo = max_corpo

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        cabecalhos = dict(scope.get("headers") or [])
        tamanho = cabecalhos.get(b"content-length")
        if tamanho and tamanho.isdigit() and int(tamanho) > self.max_corpo:
            corpo = '{"detail":"O envio é grande demais."}'.encode()
            await send({"type": "http.response.start", "status": 413, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(corpo)).encode()), *CABECALHOS, _SEM_CACHE]})
            await send({"type": "http.response.body", "body": corpo})
            return
        # corpo sem tamanho declarado (envio em pedaços): conta os bytes e corta se passar
        recebido = 0

        async def receber():
            nonlocal recebido
            msg = await receive()
            if msg["type"] == "http.request":
                recebido += len(msg.get("body") or b"")
                if recebido > self.max_corpo:
                    return {"type": "http.disconnect"}
            return msg

        caminho = scope.get("path", "")

        async def enviar(msg):
            if msg["type"] == "http.response.start":
                atuais = {k.lower() for k, _ in msg.get("headers") or []}
                extras = [c for c in CABECALHOS if c[0] not in atuais]
                if b"cache-control" not in atuais and not caminho.startswith(_COM_CACHE_PROPRIO):
                    extras.append(_SEM_CACHE)
                msg = {**msg, "headers": [*(msg.get("headers") or []), *extras]}
            await send(msg)

        await self.app(scope, receber, enviar)
