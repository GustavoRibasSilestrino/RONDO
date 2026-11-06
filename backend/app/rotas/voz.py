"""Voz do RONDIN para o trecho que muda de pessoa para pessoa (nome, quilos). Sem login: a pessoa ainda está se cadastrando."""
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, field_validator

from app.servicos import voz as servico

router = APIRouter(prefix="/rondin", tags=["rondin"])


class VozIn(BaseModel):
    texto: str
    sotaque: str

    @field_validator("texto")
    @classmethod
    def texto_curto_e_simples(cls, v: str) -> str:
        v = " ".join(v.split())
        if not servico.TEXTO_VALIDO.match(v):
            raise ValueError("Texto inválido.")
        return v

    @field_validator("sotaque")
    @classmethod
    def sotaque_conhecido(cls, v: str) -> str:
        if v not in servico.SOTAQUES:
            raise ValueError("Sotaque desconhecido.")
        return v


class VozOut(BaseModel):
    url: str   # caminho do áudio, relativo à API; o texto não vai na URL


def _ip(req: Request) -> str:
    quem = req.headers.get("x-forwarded-for", "")
    return quem.split(",")[0].strip() or (req.client.host if req.client else "?")


@router.post("/voz", response_model=VozOut)
def pedir_voz(dados: VozIn, req: Request):
    ident = servico.identificador(dados.sotaque, dados.texto)
    if servico.guardado(ident) is None:
        if not servico.dentro_do_limite(_ip(req)):
            raise HTTPException(429, "Muitos pedidos. Tente de novo em instantes.")
        try:
            servico.guardar(ident, servico.gerar_mp3(dados.texto, dados.sotaque))
        except servico.VozIndisponivel as e:
            raise HTTPException(503, str(e))
    return VozOut(url=f"/rondin/voz/{ident}.mp3")


@router.get("/voz/{ident}.mp3")
def baixar_voz(ident: str):
    audio = servico.guardado(ident) if len(ident) == 24 and ident.isalnum() else None
    if audio is None:
        raise HTTPException(404, "Áudio não encontrado.")
    return Response(audio, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=86400"})
