from datetime import datetime, timezone

from sqlalchemy import DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base


class Profissional(Base):
    __tablename__ = "profissionais"
    __table_args__ = (UniqueConstraint("tipo", "registro", "uf", name="uq_registro_conselho"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    tipo: Mapped[str] = mapped_column(String(4))  # CRN ou CREF
    registro: Mapped[str] = mapped_column(String(20))
    uf: Mapped[str] = mapped_column(String(2))
    # pendente -> verificado | recusado (conferência manual na consulta pública do conselho)
    status: Mapped[str] = mapped_column(String(12), default="pendente")
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    # o registro do aceite dos Termos de Uso e da Política de Privacidade (versão vista no cadastro)
    termos_versao: Mapped[str | None] = mapped_column(String(20), nullable=True)
