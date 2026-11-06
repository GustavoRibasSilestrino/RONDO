from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import config
from app.rotas import assinaturas, auth, clubes, me, midia, pessoas, profissionais, social, treinos, voz

app = FastAPI(title="Rondo API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in config().origens_permitidas.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/saude")
def saude():
    return {"status": "ok"}
