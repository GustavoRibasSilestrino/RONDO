"""A parte social: clubes, publicações, curtidas, comentários, seguidores e notificações."""
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, false
from sqlalchemy.orm import Mapped, mapped_column

from app.banco import Base


def _agora() -> datetime:
    return datetime.now(timezone.utc)


class Clube(Base):
    __tablename__ = "clubes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(40))
    descricao: Mapped[str] = mapped_column(String(160), default="", server_default="")
    categoria: Mapped[str] = mapped_column(String(12), default="outro", server_default="outro")
    privado: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    cor: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    meta: Mapped[str | None] = mapped_column(String(120), nullable=True)
    codigo: Mapped[str] = mapped_column(String(6), unique=True, index=True)   # convite
    dono_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class Membro(Base):
    __tablename__ = "clube_membros"

    clube_id: Mapped[int] = mapped_column(ForeignKey("clubes.id", ondelete="CASCADE"), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True, index=True)
    entrou_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (Index("ix_posts_clube_id_id", "clube_id", "id"), Index("ix_posts_autor_id_id", "autor_id", "id"))

    id: Mapped[int] = mapped_column(primary_key=True)
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    clube_id: Mapped[int | None] = mapped_column(ForeignKey("clubes.id", ondelete="CASCADE"), nullable=True)
    texto: Mapped[str] = mapped_column(String(600), default="")
    destaque: Mapped[str | None] = mapped_column(String(120), nullable=True)
    # só as referências (ids e medidas): os arquivos de foto e vídeo ainda ficam no aparelho de quem publicou
    midia: Mapped[object | None] = mapped_column(JSON, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class Curtida(Base):
    __tablename__ = "curtidas"

    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True, index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class Comentario(Base):
    __tablename__ = "comentarios"
    __table_args__ = (Index("ix_comentarios_post_id_id", "post_id", "id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    texto: Mapped[str] = mapped_column(String(280))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class Seguidor(Base):
    __tablename__ = "seguidores"
    __table_args__ = (CheckConstraint("seguidor_id <> seguido_id", name="ck_nao_seguir_a_si"),)

    seguidor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True)
    seguido_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True, index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class Notificacao(Base):
    __tablename__ = "notificacoes"
    __table_args__ = (Index("ix_notificacoes_usuario_id_id", "usuario_id", "id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)   # quem recebe
    ator_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"))
    tipo: Mapped[str] = mapped_column(String(12))   # cheers | comentario | seguidor
    post_id: Mapped[int | None] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    lida: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora)


class Story(Base):
    """Foto ou texto que fica no ar por 24 horas para quem segue o autor (e para o próprio autor)."""

    __tablename__ = "stories"
    __table_args__ = (Index("ix_stories_autor_id_criado_em", "autor_id", "criado_em"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    texto: Mapped[str | None] = mapped_column(String(140), nullable=True)
    fundo: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    legenda: Mapped[str | None] = mapped_column(String(120), nullable=True)
    midia: Mapped[object | None] = mapped_column(JSON, nullable=True)   # {id, tipo, largura, altura, url}
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_agora, index=True)
