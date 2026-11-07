"""quem viu e as reacoes dos stories

Revision ID: e7c2a9b15d40
Revises: d5b1e8a47c30
Create Date: 2026-11-07 10:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e7c2a9b15d40'
down_revision: Union[str, Sequence[str], None] = 'd5b1e8a47c30'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'story_vistos',
        sa.Column('story_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['story_id'], ['stories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('story_id', 'usuario_id'),
    )
    op.create_index(op.f('ix_story_vistos_usuario_id'), 'story_vistos', ['usuario_id'], unique=False)
    op.create_table(
        'story_reacoes',
        sa.Column('story_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('tipo', sa.String(length=10), nullable=False),
        sa.Column('em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['story_id'], ['stories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('story_id', 'usuario_id'),
    )
    op.create_index(op.f('ix_story_reacoes_usuario_id'), 'story_reacoes', ['usuario_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_story_reacoes_usuario_id'), table_name='story_reacoes')
    op.drop_table('story_reacoes')
    op.drop_index(op.f('ix_story_vistos_usuario_id'), table_name='story_vistos')
    op.drop_table('story_vistos')
