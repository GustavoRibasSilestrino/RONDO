from fastapi import FastAPI

from app.rotas import treinos

app = FastAPI(title="Rondo API")
app.include_router(treinos.router)


@app.get("/saude")
def saude():
    return {"status": "ok"}
