"""Envio de fotos e vídeos dos posts."""
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.deps import usuario_atual
from app.modelos import Usuario
from app.servicos import midia

router = APIRouter(prefix="/midia", tags=["midia"])


class UploadIn(BaseModel):
    tipo: Literal["imagem", "video"]
    ext: str = Field(min_length=2, max_length=5)


class UploadOut(BaseModel):
    url_envio: str   # o app envia o arquivo com PUT para este endereço (vale uma vez)
    url: str         # endereço público do arquivo depois de enviado: vai dentro do post


@router.post("/upload", response_model=UploadOut)
def pedir_upload(dados: UploadIn, usuario: Usuario = Depends(usuario_atual)):
    r = midia.assinar_upload(usuario.id, dados.ext)
    return UploadOut(url_envio=r["url_envio"], url=r["url"])
