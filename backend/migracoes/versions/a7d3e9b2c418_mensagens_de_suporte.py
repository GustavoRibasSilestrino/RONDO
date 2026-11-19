"""mensagens do suporte do site: o assunto, o texto e o e-mail para a resposta

Cada mensagem escrita na seção "Precisa de ajuda?" do site fica aqui (por até 1 ano) e vai por e-mail para a equipe.
Nasce com o RLS ligado e sem acesso dos papéis públicos do Supabase, como as outras tabelas (c9e4a7b2d613).

Revision ID: a7d3e9b2c418
Revises: f4c8a2e6b913
Create Date: 2026-11-19 01:30:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a7d3e9b2c418'
down_revision: Union[str, Sequence[str], None] = 'f4c8a2e6b913'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FECHAR = """
DO $$
BEGIN
  ALTER TABLE public.mensagens_suporte ENABLE ROW LEVEL SECURITY;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public.mensagens_suporte FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON public.mensagens_suporte FROM authenticated';
  END IF;
END $$;
"""


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'mensagens_suporte',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('assunto', sa.String(length=20), nullable=False),
        sa.Column('mensagem', sa.Text(), nullable=False),
        sa.Column('email', sa.String(length=254), nullable=False),
        sa.Column('nome', sa.String(length=120), nullable=True),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('origem', sa.String(length=10), server_default='site', nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('respondida', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_mensagens_suporte_usuario_id'), 'mensagens_suporte', ['usuario_id'], unique=False)
    op.create_index(op.f('ix_mensagens_suporte_criado_em'), 'mensagens_suporte', ['criado_em'], unique=False)
    if op.get_bind().dialect.name == "postgresql":
        op.execute(_FECHAR)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_mensagens_suporte_criado_em'), table_name='mensagens_suporte')
    op.drop_index(op.f('ix_mensagens_suporte_usuario_id'), table_name='mensagens_suporte')
    op.drop_table('mensagens_suporte')
