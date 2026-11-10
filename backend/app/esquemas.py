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


def conferir_cadastro(nascimento: date, aceita_termos: bool, aceita_privacidade: bool, responsavel: "ResponsavelIn | None", email: str):
    """Data de nascimento, aceite dos documentos e autorização do responsável de quem tem menos de 18 anos. Devolve o responsável
    (ou None, para adultos: não guardamos dados de responsável à toa)."""
    hoje = date.today()
    if nascimento > hoje or nascimento.year < 1900:
        raise ValueError("Data de nascimento inválida.")
    if not (aceita_termos and aceita_privacidade):
        raise ValueError("Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.")
    if idade_em(nascimento, hoje) < MAIORIDADE:
        if not responsavel or not responsavel.autoriza:
            raise ValueError("Menores de 18 anos precisam da autorização de um responsável.")
        if responsavel.email.lower() == email.lower():
            raise ValueError("O e-mail do responsável precisa ser diferente do seu.")
        return responsavel
    return None


class CadastroIn(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)
    nascimento: date
    aceita_termos: bool
    aceita_privacidade: bool
    marketing: bool = False                 # separado e desligado por padrão
    responsavel: ResponsavelIn | None = None
    origem: Literal["site", "app"] = "site"

    @model_validator(mode="after")
    def conferir(self):
        self.responsavel = conferir_cadastro(self.nascimento, self.aceita_termos, self.aceita_privacidade, self.responsavel, self.email)
        return self


class SocialIn(BaseModel):
    id_token: str = Field(min_length=20, max_length=8192)


class CadastroSocialIn(BaseModel):
    """Segunda etapa de quem entrou pela primeira vez com Google ou Apple: a data de nascimento e os aceites (como no cadastro comum)."""
    token_social: str = Field(max_length=8192)
    nome: str | None = Field(default=None, min_length=2, max_length=120)   # a Apple só dá o nome na primeira vez, e só ao app
    nascimento: date
    aceita_termos: bool
    aceita_privacidade: bool
    marketing: bool = False
    responsavel: ResponsavelIn | None = None
    origem: Literal["site", "app"] = "app"


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


class SenhaOut(BaseModel):
    status: str
    token: str   # o token antigo morreu junto com a senha antiga: este é o novo, para a pessoa continuar logada neste aparelho


class SenhaIn(BaseModel):
    atual: str = Field(max_length=128)
    nova: str = Field(min_length=8, max_length=128)


class EsqueciSenhaIn(BaseModel):
    email: EmailStr


class RedefinirSenhaIn(BaseModel):
    email: EmailStr
    codigo: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    nova: str = Field(min_length=8, max_length=128)


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
