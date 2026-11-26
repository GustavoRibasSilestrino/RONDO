"""Desafios da Comunidade: criados pelas próprias pessoas (o app não traz nenhum pronto), com data para começar e para acabar.
Quem cria já participa; os outros entram enquanto o desafio não acabou."""
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base


def _agora() -> datetime:
    return datetime.now(timezone.utc)


class Desafio(Base):
    __tablename__ = "desafios"
    __table_args__ = (Index("ix_desafios_inicio_fim", "inicio", "fim"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    titulo: Mapped[str] = mapped_column(String(60))
    descricao: Mapped[str] = mapped_column(String(200), default="", server_default="")
    meta: Mapped[str | None] = mapped_column(String(80), nullable=True)   # o que conta para cumprir ("treinar 5x por semana")
    inicio: Mapped[date] = mapped_column(Date)
    fim: Mapped[date] = mapped_column(Date)
    cor: Mapped[int] = mapped_column(Integer, default=0, server_default="0")   # a cor da capa (as mesmas dos clubes)
    dono_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class Participante(Base):
    __tablename__ = "desafio_participantes"

    desafio_id: Mapped[int] = mapped_column(ForeignKey("desafios.id", ondelete="CASCADE"), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True, index=True)
    entrou_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)
