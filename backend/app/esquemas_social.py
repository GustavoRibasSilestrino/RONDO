"""Entrada e saída da parte social."""
from datetime import date
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
    mascote: str | None = None  # o mascote que a pessoa mostra ao lado da foto, "linha-coluna" na folha de mascotes
    mascote_nome: str | None = None  # o nome que ela deu a ele com o lápis da loja (vazio = o nome de fábrica)
    foto: str | None = None  # a foto de perfil (endereço público no Storage); vem do servidor, então aparece em qualquer aparelho e para os outros


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
    capa: str | None = None   # a capa do perfil (vazio = capa cinza)
    posts: int
    seguidores: int
    seguindo_n: int
    clubes: list[ClubeResumo] = []   # os clubes dela que quem olha pode ver: os públicos e os privados em que quem olha também está


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


SituacaoDesafio = Literal["em_breve", "em_andamento", "encerrado"]


class DesafioIn(BaseModel):
    titulo: str = Field(min_length=3, max_length=60)
    descricao: str = Field(default="", max_length=200)
    meta: str | None = Field(default=None, max_length=80)
    inicio: date
    fim: date
    cor: int = Field(default=0, ge=0, le=20)

    @field_validator("titulo", "descricao")
    @classmethod
    def limpo(cls, v: str) -> str:
        return v.strip()

    @model_validator(mode="after")
    def periodo(self) -> "DesafioIn":
        if self.fim < self.inicio:
            raise ValueError("O desafio precisa acabar depois de começar.")
        if (self.fim - self.inicio).days > 365:
            raise ValueError("Um desafio dura no máximo 1 ano.")
        return self


class DesafioOut(BaseModel):
    id: int
    titulo: str
    descricao: str
    meta: str | None = None
    inicio: date
    fim: date
    cor: int
    participantes: int
    situacao: SituacaoDesafio
    meu: bool          # quem está logado participa
    proprio: bool      # quem está logado criou
    dono: PessoaOut | None = None


class PaginaDesafios(BaseModel):
    itens: list[DesafioOut]
