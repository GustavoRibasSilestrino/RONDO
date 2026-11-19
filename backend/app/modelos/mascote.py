from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base


class Mascote(Base):
    """Os browniezinhos da loja de pacotinhos que a conta já resgatou (desde 2026-11-18). Uma linha por mascote, com quantas
    vezes ele foi resgatado: a coleção de uma conta tem no máximo uma linha por mascote, por mais pacotes que ela abra.
    A posição é a da folha de mascotes do site (vitrine/src/assets/loja/mascotes.webp): a linha é a raridade (0 = comum,
    4 = lendária) e a coluna, o mascote dentro dela. O nome de cada um fica no site (vitrine/src/data/loja.ts)."""

    __tablename__ = "mascotes"

    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    linha: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    coluna: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    quantidade: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    # o nome que a conta deu a este mascote com um lápis da loja (desde 2026-11-19); vazio = o nome de fábrica
    nome: Mapped[str | None] = mapped_column(String(24), nullable=True)
    primeiro_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ultimo_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Recompensa(Base):
    """Os brownies que a conta ganhou no app (desde 2026-11-19, no lugar das medalhas): um por missão cumprida e um por nível
    de conta alcançado. A chave diz qual foi ("missao:treinos-10", "nivel:5"); cada chave dá um brownie só, por mais que o app
    peça de novo. O mascote ganho vai para a coleção (tabela mascotes), como os da loja."""

    __tablename__ = "recompensas"

    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    chave: Mapped[str] = mapped_column(String(40), primary_key=True)
    linha: Mapped[int] = mapped_column(Integer)
    coluna: Mapped[int] = mapped_column(Integer)
    em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Troca(Base):
    """Uma proposta de troca de mascotes repetidos entre duas contas (desde 2026-11-19, feita no app, na aba Coleção).
    Quem propõe oferece um repetido seu e pede um repetido da outra pessoa; ela aceita ou recusa. Só repetidos entram
    (quem tem dois ou mais do mesmo), então ninguém fica sem um mascote que tinha. Ao aceitar, cada conta perde um do que
    deu e ganha um do que recebeu, de uma vez só. Estados: pendente, aceita, recusada, cancelada (por quem propôs, ou
    porque um dos dois deixou de ter o repetido)."""

    __tablename__ = "trocas"

    id: Mapped[int] = mapped_column(primary_key=True)
    de_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)     # quem propôs
    para_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)   # quem recebeu
    # o que quem propôs oferece e o que pede em troca (posições na folha de mascotes)
    of_linha: Mapped[int] = mapped_column(Integer)
    of_coluna: Mapped[int] = mapped_column(Integer)
    pede_linha: Mapped[int] = mapped_column(Integer)
    pede_coluna: Mapped[int] = mapped_column(Integer)
    estado: Mapped[str] = mapped_column(String(10), default="pendente", server_default="pendente")
    criada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    respondida_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Resgate(Base):
    """Um pacote aberto na loja, com o código para resgatar o mascote para uma conta (desde 2026-11-18).
    Qualquer pessoa abre um pacote, com ou sem conta; o mascote só vai para a coleção de alguém quando essa pessoa, já na
    conta, toca em Resgatar (ou digita o código). Sem dado pessoal até o resgate: nem IP nem navegador ficam guardados.
    O código vale 7 dias (app/legal.py, RETENCAO_RESGATES); depois disso a linha é apagada, resgatada ou não."""

    __tablename__ = "resgates"

    codigo: Mapped[str] = mapped_column(String(16), primary_key=True)
    pacote: Mapped[str] = mapped_column(String(10))
    linha: Mapped[int] = mapped_column(Integer)
    coluna: Mapped[int] = mapped_column(Integer)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    # quem resgatou e quando (vazio = ainda à espera)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True, index=True)
    resgatado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
