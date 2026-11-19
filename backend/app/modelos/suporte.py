from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, false
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base


class MensagemSuporte(Base):
    """Uma mensagem escrita na seção de suporte do site (desde 2026-11-19): o assunto, o texto e o e-mail para a resposta.
    Quem está na conta manda com o e-mail da conta; quem não está informa um. A mensagem é encaminhada por e-mail para a equipe
    (rotas/suporte.py) e fica guardada aqui por até 1 ano (app/legal.py, RETENCAO_SUPORTE)."""

    __tablename__ = "mensagens_suporte"

    id: Mapped[int] = mapped_column(primary_key=True)
    assunto: Mapped[str] = mapped_column(String(20))
    mensagem: Mapped[str] = mapped_column(Text)
    email: Mapped[str] = mapped_column(String(254))           # para a resposta
    nome: Mapped[str | None] = mapped_column(String(120), nullable=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=True, index=True)
    origem: Mapped[str] = mapped_column(String(10), default="site", server_default="site")
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    respondida: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
