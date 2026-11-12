"""política de conteúdo: avisos, suspensões, banimento e o histórico

Revision ID: b8d2e5a71c64
Revises: a4c7e2f19b83
Create Date: 2026-11-12 11:30:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b8d2e5a71c64'
down_revision: Union[str, Sequence[str], None] = 'a4c7e2f19b83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('usuarios', sa.Column('avisos', sa.Integer(), server_default='0', nullable=False))
    op.add_column('usuarios', sa.Column('suspensoes', sa.Integer(), server_default='0', nullable=False))
    op.add_column('usuarios', sa.Column('suspenso_ate', sa.DateTime(timezone=True), nullable=True))
    op.add_column('usuarios', sa.Column('banido', sa.Boolean(), server_default=sa.false(), nullable=False))
    op.create_table(
        'penalidades',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('tipo', sa.String(length=12), nullable=False),
        sa.Column('motivo', sa.String(length=160), nullable=False),
        sa.Column('trecho', sa.String(length=300), nullable=True),
        sa.Column('em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_penalidades_usuario_id', 'penalidades', ['usuario_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('penalidades')
    with op.batch_alter_table('usuarios') as b:
        b.drop_column('banido')
        b.drop_column('suspenso_ate')
        b.drop_column('suspensoes')
        b.drop_column('avisos')
