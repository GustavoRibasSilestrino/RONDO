"""lápis da loja, nome próprio dos mascotes e troca de repetidos

Desde 2026-11-19 (pedido do dono): a conta guarda lápis comprados na loja (usuarios.lapis); cada lápis dá um nome próprio a
um mascote da coleção (mascotes.nome; o nome do mascote que a conta mostra fica também em usuarios.mascote_nome, para ir com
a pessoa nas publicações); e duas contas trocam mascotes repetidos por proposta (tabela trocas).
A tabela nova nasce com o RLS ligado e sem acesso dos papéis públicos do Supabase, como as outras (c9e4a7b2d613).

Revision ID: b8e4f1a3c520
Revises: b2e6f9a3c571
Create Date: 2026-11-19 20:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b8e4f1a3c520'
down_revision: Union[str, Sequence[str], None] = 'b2e6f9a3c571'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FECHAR = """
DO $$
BEGIN
  ALTER TABLE public.trocas ENABLE ROW LEVEL SECURITY;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public.trocas FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON public.trocas FROM authenticated';
  END IF;
END $$;
"""


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('mascotes', sa.Column('nome', sa.String(length=24), nullable=True))
    op.add_column('usuarios', sa.Column('mascote_nome', sa.String(length=24), nullable=True))
    op.add_column('usuarios', sa.Column('lapis', sa.Integer(), server_default='0', nullable=False))
    op.create_table(
        'trocas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('de_id', sa.Integer(), nullable=False),
        sa.Column('para_id', sa.Integer(), nullable=False),
        sa.Column('of_linha', sa.Integer(), nullable=False),
        sa.Column('of_coluna', sa.Integer(), nullable=False),
        sa.Column('pede_linha', sa.Integer(), nullable=False),
        sa.Column('pede_coluna', sa.Integer(), nullable=False),
        sa.Column('estado', sa.String(length=10), server_default='pendente', nullable=False),
        sa.Column('criada_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('respondida_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['de_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['para_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_trocas_de_id'), 'trocas', ['de_id'], unique=False)
    op.create_index(op.f('ix_trocas_para_id'), 'trocas', ['para_id'], unique=False)
    if op.get_bind().dialect.name == "postgresql":
        op.execute(_FECHAR)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_trocas_para_id'), table_name='trocas')
    op.drop_index(op.f('ix_trocas_de_id'), table_name='trocas')
    op.drop_table('trocas')
    with op.batch_alter_table('usuarios') as lote:   # em lote: o SQLite dos testes não tira coluna de outro jeito
        lote.drop_column('lapis')
        lote.drop_column('mascote_nome')
    with op.batch_alter_table('mascotes') as lote:
        lote.drop_column('nome')
