"""Limite de pedidos em andamento ao mesmo tempo.

Por que isso existe: as rotas síncronas do FastAPI rodam numa fila de threads (40 por padrão), e cada pedido usa a fila em
dois momentos (rodar a rota e depois montar a resposta). A conexão do banco só volta ao pool quando o pedido termina.
Com centenas de pedidos juntos, as 40 threads ficam todas esperando uma conexão do pool, e quem já tem conexão não
consegue uma thread para terminar e devolvê-la: travava tudo até estourar o tempo de espera (erro 500 em massa).
Deixando entrar no máximo `maximo` pedidos por vez (menos que as threads), sempre sobra thread para quem termina, e o
excesso espera numa fila barata, sem usar conexão nem thread. Se a espera passar de `espera` segundos, responde 503.

É um middleware ASGI puro (não o BaseHTTPMiddleware), para não atrasar a devolução das conexões."""
import asyncio
import json


class LimiteDeConcorrencia:
    def __init__(self, app, maximo: int, espera: float):
        self.app = app
        self.espera = espera
        self._vagas = asyncio.Semaphore(maximo)

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path") == "/saude":
            await self.app(scope, receive, send)
            return
        try:
            await asyncio.wait_for(self._vagas.acquire(), timeout=self.espera)
        except asyncio.TimeoutError:
            corpo = json.dumps({"detail": "O servidor está ocupado agora. Tente de novo em instantes."}).encode()
            await send({"type": "http.response.start", "status": 503, "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(corpo)).encode()), (b"retry-after", b"5")]})
            await send({"type": "http.response.body", "body": corpo})
            return
        try:
            await self.app(scope, receive, send)
        finally:
            self._vagas.release()
