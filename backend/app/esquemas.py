import re
from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.legal import MAIORIDADE


class ResponsavelIn(BaseModel):
    """Mãe, pai ou responsável legal de quem tem menos de 18 anos (LGPD, art. 14)."""
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    autoriza: bool


def idade_em(nascimento: date, hoje: date) -> int:
    return hoje.year - nascimento.year - ((hoje.month, hoje.day) < (nascimento.month, nascimento.day))


class CadastroIn(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=6, max_length=128)
    nascimento: date
    aceita_termos: bool
    aceita_privacidade: bool
    marketing: bool = False                 # separado e desligado por padrão
    responsavel: ResponsavelIn | None = None
    origem: Literal["site", "app"] = "site"

    @model_validator(mode="after")
    def conferir(self):
        hoje = date.today()
        if self.nascimento > hoje or self.nascimento.year < 1900:
            raise ValueError("Data de nascimento inválida.")
        if not (self.aceita_termos and self.aceita_privacidade):
            raise ValueError("Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.")
        if idade_em(self.nascimento, hoje) < MAIORIDADE:
            r = self.responsavel
            if not r or not r.autoriza:
                raise ValueError("Menores de 18 anos precisam da autorização de um responsável.")
            if r.email.lower() == self.email.lower():
                raise ValueError("O e-mail do responsável precisa ser diferente do seu.")
        else:
            self.responsavel = None   # adulto: não guardamos dados de responsável à toa
        return self


class MarketingIn(BaseModel):
    marketing: bool


class ApagarContaIn(BaseModel):
    senha: str = Field(max_length=128)   # confirma que é a própria pessoa


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
    foto: str | None = None
    marketing: bool = False
    model_config = {"from_attributes": True}


class LoginOut(UsuarioOut):
    token: str


class ProfissionalIn(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    tipo: Literal["CRN", "CREF"]
    registro: str = Field(min_length=1, max_length=20)
    uf: str = Field(min_length=2, max_length=2)
    aceita_termos: bool
    aceita_privacidade: bool

    @model_validator(mode="after")
    def aceitou(self):
        if not (self.aceita_termos and self.aceita_privacidade):
            raise ValueError("Para se cadastrar, aceite os Termos de Uso e a Política de Privacidade.")
        return self

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
    # só vale se vier no corpo: null apaga a foto; sem o campo, a foto não muda (quem confere o endereço é a rota)
    foto: str | None = Field(default=None, max_length=300)

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
