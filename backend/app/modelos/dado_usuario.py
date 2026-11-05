from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base

# JSONB no Postgres (consulta e índice), JSON puro nos outros bancos (testes em SQLite)
Json = JSON().with_variant(JSONB(), "postgresql")


class DadoUsuario(Base):
    """Um pedaço dos dados pessoais do app (treinos, dieta, água...), guardado por usuário e por chave."""

    __tablename__ = "dados_usuario"

    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    chave: Mapped[str] = mapped_column(String(40), primary_key=True)
    valor: Mapped[object] = mapped_column(Json)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
