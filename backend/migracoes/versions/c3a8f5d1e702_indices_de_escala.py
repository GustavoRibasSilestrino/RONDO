"""indices dos caminhos mais usados: feed do perfil, comentarios, avisos e stories

Revision ID: c3a8f5d1e702
Revises: b7f3a1c9d2e4
Create Date: 2026-11-06 16:20:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c3a8f5d1e702'
down_revision: Union[str, Sequence[str], None] = 'b7f3a1c9d2e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index('ix_posts_autor_id_id', 'posts', ['autor_id', 'id'], unique=False)
    op.create_index('ix_comentarios_post_id_id', 'comentarios', ['post_id', 'id'], unique=False)
    op.create_index('ix_notificacoes_usuario_id_id', 'notificacoes', ['usuario_id', 'id'], unique=False)
    op.create_index('ix_stories_autor_id_criado_em', 'stories', ['autor_id', 'criado_em'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_stories_autor_id_criado_em', table_name='stories')
    op.drop_index('ix_notificacoes_usuario_id_id', table_name='notificacoes')
    op.drop_index('ix_comentarios_post_id_id', table_name='comentarios')
    op.drop_index('ix_posts_autor_id_id', table_name='posts')
