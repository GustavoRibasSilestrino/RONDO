"""loja de pacotinhos: códigos de resgate e a coleção de mascotes de cada conta

`resgates`: cada pacote aberto na loja, com o mascote sorteado e o código para resgatá-lo (vale 7 dias; quem resgatou
fica marcado). `mascotes`: a coleção de cada conta, uma linha por mascote, com quantas vezes ele foi resgatado.
As duas tabelas nascem com o RLS ligado e sem acesso dos papéis públicos do Supabase, como todas as outras (c9e4a7b2d613).

Revision ID: f4c8a2e6b913
Revises: c9e4a7b2d613
Create Date: 2026-11-18 23:40:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f4c8a2e6b913'
down_revision: Union[str, Sequence[str], None] = 'c9e4a7b2d613'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FECHAR = """
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mascotes', 'resgates'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', t);
    END IF;
  END LOOP;
END $$;
"""


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'mascotes',
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('linha', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('coluna', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('quantidade', sa.Integer(), server_default='1', nullable=False),
        sa.Column('primeiro_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ultimo_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('usuario_id', 'linha', 'coluna'),
    )
    op.create_table(
        'resgates',
        sa.Column('codigo', sa.String(length=16), nullable=False),
        sa.Column('pacote', sa.String(length=10), nullable=False),
        sa.Column('linha', sa.Integer(), nullable=False),
        sa.Column('coluna', sa.Integer(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('resgatado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('codigo'),
    )
    op.create_index(op.f('ix_resgates_criado_em'), 'resgates', ['criado_em'], unique=False)
    op.create_index(op.f('ix_resgates_usuario_id'), 'resgates', ['usuario_id'], unique=False)
    if op.get_bind().dialect.name == "postgresql":
        op.execute(_FECHAR)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_resgates_usuario_id'), table_name='resgates')
    op.drop_index(op.f('ix_resgates_criado_em'), table_name='resgates')
    op.drop_table('resgates')
    op.drop_table('mascotes')
