from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base


class Mascote(Base):
    """Os browniezinhos da loja de pacotinhos que a conta já resgatou (desde 2026-11-18). Uma linha por mascote, com quantas
    vezes ele foi resgatado: a coleção de uma conta tem no máximo 69 linhas, por mais pacotes que ela abra.
    A posição é a da folha de mascotes do site (vitrine/src/assets/loja/mascotes.webp): a linha é a raridade (0 = comum,
    4 = lendária) e a coluna, o mascote dentro dela. O nome de cada um fica no site (vitrine/src/data/loja.ts)."""

    __tablename__ = "mascotes"

    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    linha: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    coluna: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    quantidade: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    primeiro_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ultimo_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


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
