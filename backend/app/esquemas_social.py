"""Entrada e saída da parte social."""
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

Categoria = Literal["treino", "corrida", "dieta", "constancia", "outro"]


class PessoaOut(BaseModel):
    id: int
    nome: str
    arroba: str | None = None
    selo: str | None = None
    verificado: bool = False
    seguindo: bool = False   # quem está logado segue esta pessoa
    voce: bool = False


class ClubeResumo(BaseModel):
    id: int
    nome: str


class PostOut(BaseModel):
    id: int
    autor: PessoaOut
    texto: str
    destaque: str | None = None
    midia: list[dict[str, Any]] | None = None
    clube: ClubeResumo | None = None
    quando: int            # ms desde 1970
    cheers: int
    comentarios: int
    curtiu: bool
    meu: bool


class PaginaPosts(BaseModel):
    itens: list[PostOut]
    proximo: int | None = None


class PostIn(BaseModel):
    texto: str = Field(default="", max_length=600)
    destaque: str | None = Field(default=None, max_length=120)
    midia: list[dict[str, Any]] | None = Field(default=None, max_length=10)
    clube_id: int | None = None

    @field_validator("texto")
    @classmethod
    def texto_limpo(cls, v: str) -> str:
        return v.strip()

    @model_validator(mode="after")
    def algo_para_publicar(self):
        if not self.texto and not self.midia and not self.destaque:
            raise ValueError("Escreva algo ou adicione uma foto.")
        return self


class ComentarioIn(BaseModel):
    texto: str = Field(max_length=280)

    @field_validator("texto")
    @classmethod
    def texto_limpo(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("O comentário está vazio.")
        return v


class ComentarioOut(BaseModel):
    id: int
    autor: PessoaOut
    texto: str
    quando: int
    meu: bool


class PaginaComentarios(BaseModel):
    itens: list[ComentarioOut]
    proximo: int | None = None


class PerfilOut(PessoaOut):
    bio: str = ""
    posts: int
    seguidores: int
    seguindo_n: int


class PaginaPessoas(BaseModel):
    itens: list[PessoaOut]
    proximo: int | None = None


class ClubeIn(BaseModel):
    nome: str = Field(min_length=3, max_length=40)
    descricao: str = Field(default="", max_length=160)
    categoria: Categoria = "outro"
    privado: bool = False
    cor: int = Field(default=0, ge=0, le=20)
    meta: str | None = Field(default=None, max_length=120)

    @field_validator("nome", "descricao")
    @classmethod
    def limpo(cls, v: str) -> str:
        return v.strip()


class ClubeOut(BaseModel):
    id: int
    nome: str
    descricao: str
    categoria: str
    privado: bool
    cor: int
    meta: str | None = None
    membros: int
    meu: bool          # quem está logado participa
    proprio: bool      # quem está logado criou
    codigo: str | None = None   # só o dono vê o código de convite


class PaginaClubes(BaseModel):
    itens: list[ClubeOut]
    proximo: int | None = None


class EntrarPorCodigoIn(BaseModel):
    codigo: str = Field(min_length=6, max_length=6)

    @field_validator("codigo")
    @classmethod
    def maiuscula(cls, v: str) -> str:
        return v.strip().upper()


class NotificacaoOut(BaseModel):
    id: int
    tipo: str
    texto: str
    ator: PessoaOut
    post_id: int | None = None
    quando: int
    lida: bool


class PaginaNotificacoes(BaseModel):
    itens: list[NotificacaoOut]
    proximo: int | None = None


class ResumoOut(BaseModel):
    id: int
    posts: int
    cheers_dados: int
    seguindo: int
    seguidores: int
    comentarios: int
    clubes_criados: int
    clubes: list[int]
    nao_lidas: int


class StoryIn(BaseModel):
    texto: str | None = Field(default=None, max_length=140)
    fundo: int = Field(default=0, ge=0, le=20)
    legenda: str | None = Field(default=None, max_length=120)
    midia: dict[str, Any] | None = None

    @model_validator(mode="after")
    def tem_conteudo(self):
        self.texto = (self.texto or "").strip() or None
        self.legenda = (self.legenda or "").strip() or None
        if not self.texto and not self.midia:
            raise ValueError("O story está vazio.")
        return self


class StoryOut(BaseModel):
    id: int
    texto: str | None = None
    fundo: int = 0
    legenda: str | None = None
    midia: dict[str, Any] | None = None
    quando: int


class StoriesDaPessoa(BaseModel):
    autor: PessoaOut
    itens: list[StoryOut]   # do mais antigo para o mais novo


class StoriesOut(BaseModel):
    pessoas: list[StoriesDaPessoa]   # você primeiro, depois quem você segue
