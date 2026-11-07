from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, false
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base


class RedefinicaoSenha(Base):
    """Um código de 6 dígitos mandado por e-mail para refazer a senha. Guardamos só o hash do código (nunca o código), ele vale
    por 15 minutos, aceita poucas tentativas e só se usa uma vez. Some junto com a conta."""

    __tablename__ = "redefinicoes_senha"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    codigo_hash: Mapped[str] = mapped_column(String(64))
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    tentativas: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    usado: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
