"""brownies de recompensa no lugar das medalhas e o mascote que a conta mostra

`recompensas`: um brownie por missão cumprida ou nível alcançado no app (cada chave dá um só). `usuarios.mascote`: o mascote
que a conta mostra ao lado da foto, nas publicações e passeando pelo app ("linha-coluna" na folha de mascotes).
A tabela nova nasce com o RLS ligado e sem acesso dos papéis públicos do Supabase, como todas as outras (c9e4a7b2d613).
As contas que já têm mascotes ganham como mascote o mais raro da coleção.

Revision ID: b2e6f9a3c571
Revises: a7d3e9b2c418
Create Date: 2026-11-19 10:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b2e6f9a3c571'
down_revision: Union[str, Sequence[str], None] = 'a7d3e9b2c418'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FECHAR = """
DO $$
BEGIN
  ALTER TABLE public.recompensas ENABLE ROW LEVEL SECURITY;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.recompensas FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.recompensas FROM authenticated;
  END IF;
END $$;
"""

# quem já tem mascotes da loja passa a mostrar o mais raro (e, entre os iguais, o primeiro da folha)
_PRIMEIRO_MASCOTE = """
UPDATE usuarios SET mascote = (
  SELECT m.linha || '-' || m.coluna FROM mascotes m WHERE m.usuario_id = usuarios.id
  ORDER BY m.linha DESC, m.coluna ASC LIMIT 1
) WHERE mascote IS NULL
"""


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('usuarios', sa.Column('mascote', sa.String(length=5), nullable=True))
    op.create_table(
        'recompensas',
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('chave', sa.String(length=40), nullable=False),
        sa.Column('linha', sa.Integer(), nullable=False),
        sa.Column('coluna', sa.Integer(), nullable=False),
        sa.Column('em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('usuario_id', 'chave'),
    )
    op.execute(_PRIMEIRO_MASCOTE)
    if op.get_bind().dialect.name == "postgresql":
        op.execute(_FECHAR)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('recompensas')
    with op.batch_alter_table('usuarios') as t:
        t.drop_column('mascote')
