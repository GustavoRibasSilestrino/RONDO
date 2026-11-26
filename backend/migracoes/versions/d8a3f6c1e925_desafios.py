"""desafios da Comunidade e quem participa deles

Desde 2026-11-26 (pedido do dono): a aba Desafios da Comunidade. São as pessoas que criam os desafios (o app não traz nenhum
pronto): título, descrição, meta, o dia de começar e o de acabar, e a cor da capa. Quem cria já participa.
Nascem com o RLS ligado e sem acesso dos papéis públicos do Supabase, como as outras tabelas (c9e4a7b2d613).

Revision ID: d8a3f6c1e925
Revises: c4f7a1d9e236
Create Date: 2026-11-26 12:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd8a3f6c1e925'
down_revision: Union[str, Sequence[str], None] = 'c4f7a1d9e236'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FECHAR = """
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['desafios', 'desafio_participantes'] LOOP
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
        'desafios',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('titulo', sa.String(length=60), nullable=False),
        sa.Column('descricao', sa.String(length=200), server_default='', nullable=False),
        sa.Column('meta', sa.String(length=80), nullable=True),
        sa.Column('inicio', sa.Date(), nullable=False),
        sa.Column('fim', sa.Date(), nullable=False),
        sa.Column('cor', sa.Integer(), server_default='0', nullable=False),
        sa.Column('dono_id', sa.Integer(), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['dono_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_desafios_dono_id'), 'desafios', ['dono_id'], unique=False)
    op.create_index('ix_desafios_inicio_fim', 'desafios', ['inicio', 'fim'], unique=False)
    op.create_table(
        'desafio_participantes',
        sa.Column('desafio_id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('entrou_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['desafio_id'], ['desafios.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('desafio_id', 'usuario_id'),
    )
    op.create_index(op.f('ix_desafio_participantes_usuario_id'), 'desafio_participantes', ['usuario_id'], unique=False)
    if op.get_bind().dialect.name == "postgresql":
        op.execute(_FECHAR)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_desafio_participantes_usuario_id'), table_name='desafio_participantes')
    op.drop_table('desafio_participantes')
    op.drop_index('ix_desafios_inicio_fim', table_name='desafios')
    op.drop_index(op.f('ix_desafios_dono_id'), table_name='desafios')
    op.drop_table('desafios')
