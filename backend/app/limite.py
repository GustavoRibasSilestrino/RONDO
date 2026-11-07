"""Limite de requisições por endereço: protege a API (e o banco atrás dela) de uma pessoa, um robô ou um laço do app
que chame demais. Janela de um minuto na memória do processo; serve para uma instância, que é o que roda hoje."""
import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

JANELA = 60.0
ROTAS_DE_ENTRADA = ("/auth/login", "/auth/cadastro", "/auth/senha", "/auth/esqueci-senha", "/auth/redefinir-senha", "/auth/google", "/auth/apple", "/auth/social/cadastro")


class LimiteDeRequisicoes(BaseHTTPMiddleware):
    def __init__(self, app, por_minuto: int, auth_por_minuto: int):
        super().__init__(app)
        self.por_minuto = por_minuto
        self.auth_por_minuto = auth_por_minuto
        self._geral: dict[str, deque] = defaultdict(deque)
        self._auth: dict[str, deque] = defaultdict(deque)
        self._ultima_limpeza = time.monotonic()

    @staticmethod
    def _estourou(fila: deque, limite: int, agora: float) -> bool:
        while fila and agora - fila[0] > JANELA:
            fila.popleft()
        if len(fila) >= limite:
            return True
        fila.append(agora)
        return False

    def _limpar(self, agora: float) -> None:
        """Esquece endereços parados, para a memória não crescer com o tempo."""
        if agora - self._ultima_limpeza < JANELA * 5:
            return
        self._ultima_limpeza = agora
        for dono in (self._geral, self._auth):
            for chave in [k for k, f in dono.items() if not f or agora - f[-1] > JANELA]:
                del dono[chave]

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS" or request.url.path == "/saude":
            return await call_next(request)
        agora = time.monotonic()
        self._limpar(agora)
        quem = request.client.host if request.client else "desconhecido"
        excedeu = False
        if self.auth_por_minuto and request.url.path in ROTAS_DE_ENTRADA and request.method == "POST":
            excedeu = self._estourou(self._auth[quem], self.auth_por_minuto, agora)
        if not excedeu and self.por_minuto:
            excedeu = self._estourou(self._geral[quem], self.por_minuto, agora)
        if excedeu:
            return JSONResponse({"detail": "Muitas tentativas em pouco tempo. Espere um minuto e tente de novo."}, status_code=429, headers={"Retry-After": "60"})
        return await call_next(request)
