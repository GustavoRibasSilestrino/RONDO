from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.concorrencia import LimiteDeConcorrencia
from app.config import config
from app.limite import LimiteDeRequisicoes
from app.protecao import Blindagem
from app.rotas import assinaturas, auth, clubes, me, midia, moderacao, pessoas, profissionais, social, treinos, voz

SEGREDO_PADRAO = "troque-em-producao"
EM_PRODUCAO = not config().database_url.startswith("sqlite")
# Com o segredo padrão, qualquer pessoa que leia este código consegue fabricar um token e entrar em qualquer conta.
# Em produção (banco de verdade) a API se recusa a subir sem um segredo próprio: melhor não subir do que subir aberta.
if EM_PRODUCAO and config().jwt_segredo == SEGREDO_PADRAO:
    raise RuntimeError("JWT_SEGREDO não foi definido. Defina um valor longo e aleatório no painel do servidor antes de subir a API.")

# a documentação automática (/docs, /redoc, /openapi.json) é um mapa de todas as rotas: fica só no desenvolvimento
app = FastAPI(title="Rondo API", **({"docs_url": None, "redoc_url": None, "openapi_url": None} if EM_PRODUCAO else {}))
# respostas de texto (JSON) saem comprimidas: menos dados por pessoa, mais pessoas por segundo
app.add_middleware(GZipMiddleware, minimum_size=800)
if config().limite_req_minuto or config().limite_auth_minuto:
    app.add_middleware(LimiteDeRequisicoes, por_minuto=config().limite_req_minuto, auth_por_minuto=config().limite_auth_minuto)
# no máximo N pedidos em andamento (veja app/concorrencia.py): o excesso espera na fila em vez de travar o pool do banco
app.add_middleware(LimiteDeConcorrencia, maximo=config().max_pedidos_simultaneos, espera=config().espera_fila)
# só os sites do RONDO podem chamar a API pelo navegador; sem cookies (o login vai no cabeçalho Authorization), então um site
# de fora não consegue agir em nome de quem está logado (CSRF)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in config().origens_permitidas.split(",") if o.strip()],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
    max_age=600,
)
# por fora de tudo: cabeçalhos de segurança em toda resposta (inclusive nas de erro e de limite) e corpo com tamanho máximo
app.add_middleware(Blindagem, max_corpo=config().max_corpo_bytes)


@app.exception_handler(RequestValidationError)
async def erro_de_validacao(_: Request, exc: RequestValidationError):
    """Mantém a mensagem de cada erro, mas nunca devolve o que foi enviado (senha, e-mail, data de nascimento)."""
    erros = [{"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": jsonable_encoder(erros)})


app.include_router(auth.router)
app.include_router(me.router)
app.include_router(profissionais.router)
app.include_router(assinaturas.router)
app.include_router(treinos.router)
app.include_router(social.router)
app.include_router(pessoas.router)
app.include_router(clubes.router)
app.include_router(midia.router)
app.include_router(voz.router)
app.include_router(moderacao.router)


@app.get("/saude")
def saude():
    return {"status": "ok"}
