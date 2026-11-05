import re
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class CadastroIn(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    senha: str = Field(max_length=128)


class UsuarioOut(BaseModel):
    email: str
    nome: str
    papel: str = "usuario"
    verificado: bool = False
    pro: bool = False
    selo: str | None = None
    arroba: str | None = None
    bio: str = ""
    model_config = {"from_attributes": True}


class LoginOut(UsuarioOut):
    token: str


class ProfissionalIn(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    tipo: Literal["CRN", "CREF"]
    registro: str = Field(min_length=1, max_length=20)
    uf: str = Field(min_length=2, max_length=2)

    @field_validator("uf")
    @classmethod
    def uf_maiuscula(cls, v: str) -> str:
        return v.upper()

    @field_validator("registro")
    @classmethod
    def registro_limpo(cls, v: str) -> str:
        return v.strip()


class AssinaturaIn(BaseModel):
    plano_id: str = Field(max_length=40)
    token: str = Field(max_length=500)  # token do gateway; o cartão nunca chega aqui


class StatusOut(BaseModel):
    status: str


class SenhaIn(BaseModel):
    atual: str = Field(max_length=128)
    nova: str = Field(min_length=6, max_length=128)


class PerfilIn(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=120)
    arroba: str | None = Field(default=None, max_length=30)   # vazio apaga; sem o @
    bio: str | None = Field(default=None, max_length=300)

    @field_validator("arroba")
    @classmethod
    def arroba_valida(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip().lstrip("@").lower()
        if v and not re.fullmatch(r"[a-z0-9_.]{3,30}", v):
            raise ValueError("Use de 3 a 30 letras minúsculas, números, ponto ou sublinhado.")
        return v


class DadosIn(BaseModel):
    itens: dict[str, Any]


class DadosOut(BaseModel):
    itens: dict[str, Any]
