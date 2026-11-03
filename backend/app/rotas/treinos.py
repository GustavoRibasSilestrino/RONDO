from fastapi import APIRouter

from app.servicos.calculo_1rm import epley

router = APIRouter(prefix="/treinos", tags=["treinos"])


@router.get("/1rm")
def calcular_1rm(carga: float, repeticoes: int):
    return {"1rm": round(epley(carga, repeticoes), 1)}
