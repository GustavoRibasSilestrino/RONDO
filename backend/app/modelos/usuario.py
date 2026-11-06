from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, String, false
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
    # selo ao lado do nome, definido só pelo banco: profissional | famoso | dono (nulo = sem selo)
    selo: Mapped[str | None] = mapped_column(String(12), nullable=True)
    arroba: Mapped[str | None] = mapped_column(String(30), unique=True, index=True, nullable=True)   # nome de usuário, sem o @
    bio: Mapped[str] = mapped_column(String(300), default="", server_default="")
    # a foto de perfil: o endereço público no Storage (a pasta do próprio usuário); nulo = sem foto
    foto: Mapped[str | None] = mapped_column(String(300), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    # só para saber se é menor de idade (precisa de responsável); contas antigas ficam sem
    nascimento: Mapped[date | None] = mapped_column(Date, nullable=True)
    # e-mails de novidades: só com consentimento separado, desligado por padrão; o histórico fica em consentimentos
    marketing: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
