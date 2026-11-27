from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base


class AparelhoConhecido(Base):
    """Os aparelhos (app ou navegador) por onde a conta já entrou, para avisar por e-mail quando ela entra por um novo.
    O app e o site mandam um identificador aleatório que guardam no próprio aparelho; aqui fica só o hash dele (marca), sem
    nada que identifique a pessoa ou o aparelho. Some junto com a conta."""

    __tablename__ = "aparelhos_conhecidos"
    __table_args__ = (UniqueConstraint("usuario_id", "marca", name="uq_aparelho_usuario_marca"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    marca: Mapped[str] = mapped_column(String(64))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    visto_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CodigoReserva(Base):
    """Os códigos de reserva da verificação em duas etapas (para quem perdeu o celular): só o hash, cada um de uso único."""

    __tablename__ = "codigos_reserva"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    codigo_hash: Mapped[str] = mapped_column(String(64))
    usado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
