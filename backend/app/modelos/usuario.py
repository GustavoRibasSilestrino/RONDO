from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String, false
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    nome: Mapped[str] = mapped_column(String(120))
    senha_hash: Mapped[str] = mapped_column(String(255))
    papel: Mapped[str] = mapped_column(String(12), default="usuario", server_default="usuario")  # usuario | dono
    verificado: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    pro: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
