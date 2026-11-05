from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import config
from app.rotas import assinaturas, auth, clubes, me, midia, pessoas, profissionais, social, treinos

app = FastAPI(title="Rondo API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in config().origens_permitidas.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(me.router)
app.include_router(profissionais.router)
app.include_router(assinaturas.router)
app.include_router(treinos.router)
app.include_router(social.router)
app.include_router(pessoas.router)
app.include_router(clubes.router)
app.include_router(midia.router)


@app.get("/saude")
def saude():
    return {"status": "ok"}
