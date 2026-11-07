"""redefinicao de senha por codigo no e-mail

Revision ID: d5b1e8a47c30
Revises: c3a8f5d1e702
Create Date: 2026-11-06 22:10:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd5b1e8a47c30'
down_revision: Union[str, Sequence[str], None] = 'c3a8f5d1e702'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'redefinicoes_senha',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('codigo_hash', sa.String(length=64), nullable=False),
        sa.Column('expira_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('tentativas', sa.Integer(), server_default='0', nullable=False),
        sa.Column('usado', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_redefinicoes_senha_usuario_id'), 'redefinicoes_senha', ['usuario_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_redefinicoes_senha_usuario_id'), table_name='redefinicoes_senha')
    op.drop_table('redefinicoes_senha')
