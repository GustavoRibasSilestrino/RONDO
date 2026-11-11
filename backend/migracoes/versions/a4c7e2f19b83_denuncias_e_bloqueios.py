"""denúncias e bloqueios (segurança da comunidade)

Revision ID: a4c7e2f19b83
Revises: f1a6d3c92b57
Create Date: 2026-11-11 15:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a4c7e2f19b83'
down_revision: Union[str, Sequence[str], None] = 'f1a6d3c92b57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'bloqueios',
        sa.Column('quem_id', sa.Integer(), nullable=False),
        sa.Column('bloqueado_id', sa.Integer(), nullable=False),
        sa.Column('em', sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint('quem_id <> bloqueado_id', name='ck_nao_bloquear_a_si'),
        sa.ForeignKeyConstraint(['quem_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['bloqueado_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('quem_id', 'bloqueado_id'),
    )
    op.create_index('ix_bloqueios_bloqueado_id', 'bloqueios', ['bloqueado_id'])
    op.create_table(
        'denuncias',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('denunciante_id', sa.Integer(), nullable=False),
        sa.Column('tipo', sa.String(length=12), nullable=False),
        sa.Column('alvo_id', sa.Integer(), nullable=False),
        sa.Column('autor_id', sa.Integer(), nullable=True),
        sa.Column('motivo', sa.String(length=16), nullable=False),
        sa.Column('detalhe', sa.String(length=300), nullable=True),
        sa.Column('trecho', sa.String(length=600), nullable=True),
        sa.Column('situacao', sa.String(length=10), server_default='pendente', nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resolvido_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['denunciante_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['autor_id'], ['usuarios.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_denuncias_denunciante_id', 'denuncias', ['denunciante_id'])
    op.create_index('ix_denuncias_autor_id', 'denuncias', ['autor_id'])
    op.create_index('ix_denuncias_situacao_id', 'denuncias', ['situacao', 'id'])
    op.create_index('ux_denuncia_unica', 'denuncias', ['denunciante_id', 'tipo', 'alvo_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('denuncias')
    op.drop_table('bloqueios')
