from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base


class Consentimento(Base):
    """Registro de cada aceite ou recusa: termos, privacidade, marketing e o do responsável por um menor de idade.
    Nunca é editado: uma mudança (ex.: sair do marketing) vira uma linha nova. Some junto com a conta."""

    __tablename__ = "consentimentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    tipo: Mapped[str] = mapped_column(String(20))           # termos | privacidade | marketing | responsavel
    versao: Mapped[str | None] = mapped_column(String(20), nullable=True)
    aceito: Mapped[bool] = mapped_column(Boolean)
    origem: Mapped[str] = mapped_column(String(10), default="site")   # site | app
    detalhe: Mapped[object | None] = mapped_column(JSON, nullable=True)   # responsável: {nome, email}
    em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
