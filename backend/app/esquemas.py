import re
from datetime import date, datetime
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
    aparelho: str | None = Field(default=None, max_length=64)   # identificador aleatório que o app/site guarda no aparelho (avisos de entrada nova)
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
    aparelho: str | None = Field(default=None, max_length=64)   # identificador aleatório que o app/site guarda no aparelho (avisos de entrada nova)


class CadastroSocialIn(BaseModel):
    """Segunda etapa de quem entrou pela primeira vez com Google ou Apple: a data de nascimento e os aceites (como no cadastro comum)."""
    token_social: str = Field(max_length=8192)
    aparelho: str | None = Field(default=None, max_length=64)   # identificador aleatório que o app/site guarda no aparelho (avisos de entrada nova)
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
    codigo: str | None = Field(default=None, max_length=20)   # o código da verificação em duas etapas, se ela estiver ligada


class LoginIn(BaseModel):
    email: EmailStr
    senha: str = Field(max_length=128)
    codigo: str | None = Field(default=None, max_length=20)   # o código do aplicativo autenticador (ou de reserva), se a conta tem 2FA
    aparelho: str | None = Field(default=None, max_length=64)   # identificador aleatório que o app/site guarda no aparelho (avisos de entrada nova)


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
    capa: str | None = None   # a capa do perfil (vazio = capa cinza)
    mascote: str | None = None   # o mascote que a conta mostra, "linha-coluna" na folha de mascotes (vazio = nenhum)
    mascote_nome: str | None = None   # o nome que a conta deu a ele com o lápis (vazio = o nome de fábrica)
    marketing: bool = False
    dois_fatores: bool = False   # a verificação em duas etapas está ligada
    xp_extra: int = 0            # XP somado ao das atividades (definido só no banco)
    # a política de conteúdo: avisos do ciclo (0 a 3), suspensões tomadas e até quando está suspensa
    avisos: int = 0
    suspensoes: int = 0
    suspenso_ate: datetime | None = None
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
    # a capa do perfil, igual à foto: só vale se vier no corpo; null tira a capa (volta o cinza)
    capa: str | None = Field(default=None, max_length=300)

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


# ---------- loja de pacotinhos (rotas/loja.py) ----------
class AbrirPacoteIn(BaseModel):
    pacote: Literal["roxo", "prata", "ouro"]


class MascoteOut(BaseModel):
    """Um mascote da coleção: a posição na folha de mascotes do site, a raridade e quantos a conta tem dele."""
    linha: int
    coluna: int
    raridade: str
    quantidade: int
    nome: str | None = None      # o nome que a conta deu a ele com o lápis (vazio = o nome de fábrica)
    # o XP do mascote (desde 2026-11-23): só o mascote escolhido ganha XP, a cada treino e a cada missão cumprida enquanto
    # ele é o escolhido. O nível sai do XP, no app (app/src/lib/nivelMascote.ts).
    xp: int = 0


class ColecaoOut(BaseModel):
    total: int                   # quantos mascotes existem (66)
    mascotes: list[MascoteOut]   # os que a conta já tem, cada um uma vez
    pode_comprar: bool = False   # o lápis: a loja está aberta para esta conta (fechada, só o dono compra)
    pode_abrir: bool = False     # os pacotes: a abertura está liberada (bloqueada para todas as contas até a loja abrir)
    escolhido: str | None = None # o mascote que a conta mostra, "linha-coluna"
    lapis: int = 0               # lápis guardados na conta (cada um dá um nome novo a um mascote)


class LapisOut(BaseModel):
    lapis: int                   # quantos lápis a conta tem agora


class NomeMascoteIn(BaseModel):
    linha: int = Field(ge=0, le=4)
    coluna: int = Field(ge=0, le=13)
    nome: str = Field(min_length=1, max_length=40)   # o tamanho de verdade (2 a 20) e as letras são conferidos no serviço


class NomeMascoteOut(BaseModel):
    linha: int
    coluna: int
    nome: str
    lapis: int                   # lápis que sobraram


class CasaMascote(BaseModel):
    """Um mascote pela posição na folha."""
    linha: int = Field(ge=0, le=4)
    coluna: int = Field(ge=0, le=13)


class PessoaDaTroca(BaseModel):
    id: int
    nome: str
    arroba: str | None = None
    foto: str | None = None


class RepetidosOut(BaseModel):
    pessoa: PessoaDaTroca
    mascotes: list[MascoteOut]   # só os que ela tem repetidos (dois ou mais)


class TrocaIn(BaseModel):
    para_id: int
    ofereco: CasaMascote         # um repetido de quem propõe
    peco: CasaMascote            # um repetido da outra pessoa


class TrocaOut(BaseModel):
    id: int
    estado: Literal["pendente", "aceita", "recusada", "cancelada"]
    recebida: bool               # verdadeiro = a proposta veio de outra pessoa para esta conta
    pessoa: PessoaDaTroca        # a outra pessoa
    dou: CasaMascote             # o que esta conta entrega se a troca acontecer
    recebo: CasaMascote          # e o que ela ganha
    criada_em: datetime


class TrocasOut(BaseModel):
    trocas: list[TrocaOut]
    pendentes_recebidas: int     # quantas esperam a resposta desta conta


class RecompensaIn(BaseModel):
    # "missao:<id da missão>" ou "nivel:<número>": o que a conta cumpriu no app
    chave: str = Field(pattern=r"^(missao:[a-z0-9-]{1,30}|nivel:[0-9]{1,3})$")


class RecompensaOut(BaseModel):
    chave: str
    nova: bool                   # falso = essa chave já tinha dado o brownie antes (o app pediu de novo)
    mascote: MascoteOut


class XpTreinosIn(BaseModel):
    # a hora em que cada treino terminou, em milissegundos (os mais recentes do app; o servidor conta só os que ainda não contou)
    treinos: list[int] = Field(max_length=60)


class XpTreinosOut(BaseModel):
    mascote: str | None          # quem ganhou o XP: o mascote escolhido, "linha-coluna" (vazio = a conta não mostra nenhum)
    ganho: int                   # o XP ganho neste pedido (0 = nenhum treino novo)
    xp: int                      # o XP que o mascote escolhido tem agora


class EscolherMascoteIn(BaseModel):
    linha: int | None = Field(default=None, ge=0, le=4)    # os dois vazios = não mostrar mascote nenhum
    coluna: int | None = Field(default=None, ge=0, le=13)


class ResgatarIn(BaseModel):
    codigo: str = Field(min_length=10, max_length=24)   # com ou sem hífen e espaços


# ---------- suporte do site (rotas/suporte.py) ----------
ROTULOS_SUPORTE = {
    "problema": "Algo não funciona", "conta": "Conta e acesso", "loja": "Loja de pacotinhos", "dados": "Seus dados",
    "denuncia": "Denúncia", "sugestao": "Sugestão", "reclamacao": "Reclamação", "outro": "Outro assunto",
}


class SuporteIn(BaseModel):
    assunto: Literal["problema", "conta", "loja", "dados", "denuncia", "sugestao", "reclamacao", "outro"]
    mensagem: str = Field(min_length=10, max_length=2000)
    email: EmailStr | None = None                       # quem não está na conta informa um e-mail para a resposta
    nome: str | None = Field(default=None, max_length=120)

    @field_validator("mensagem")
    @classmethod
    def mensagem_de_verdade(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Escreva um pouco mais (pelo menos 10 letras).")
        return v
