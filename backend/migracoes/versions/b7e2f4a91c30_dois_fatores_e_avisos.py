"""verificação em duas etapas e avisos de segurança

Desde 2026-11-27 (pedido do dono): a conta pode ligar a verificação em duas etapas com um aplicativo autenticador (segredo
cifrado em usuarios.totp_segredo, os códigos de reserva em codigos_reserva, só o hash) e recebe avisos por e-mail quando
entra por um aparelho novo (aparelhos_conhecidos guarda só o hash do identificador aleatório que o app ou o site gera).

Revision ID: b7e2f4a91c30
Revises: a5c1e9d73b42
Create Date: 2026-11-27 15:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b7e2f4a91c30'
down_revision: Union[str, Sequence[str], None] = 'a5c1e9d73b42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_FECHAR = """
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['aparelhos_conhecidos', 'codigos_reserva'] LOOP
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
    op.add_column('usuarios', sa.Column('totp_segredo', sa.String(length=255), nullable=True))
    op.add_column('usuarios', sa.Column('totp_ativo', sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column('usuarios', sa.Column('totp_passo', sa.BigInteger(), nullable=True))
    op.create_table(
        'aparelhos_conhecidos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('marca', sa.String(length=64), nullable=False),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.Column('visto_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('usuario_id', 'marca', name='uq_aparelho_usuario_marca'),
    )
    op.create_index(op.f('ix_aparelhos_conhecidos_usuario_id'), 'aparelhos_conhecidos', ['usuario_id'], unique=False)
    op.create_table(
        'codigos_reserva',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('codigo_hash', sa.String(length=64), nullable=False),
        sa.Column('usado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_codigos_reserva_usuario_id'), 'codigos_reserva', ['usuario_id'], unique=False)
    # o mesmo que a migração c9e4a7b2d613 fez com as outras tabelas: RLS ligado e sem acesso direto pelo Supabase
    if op.get_bind().dialect.name == 'postgresql':
        op.execute(_FECHAR)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_codigos_reserva_usuario_id'), table_name='codigos_reserva')
    op.drop_table('codigos_reserva')
    op.drop_index(op.f('ix_aparelhos_conhecidos_usuario_id'), table_name='aparelhos_conhecidos')
    op.drop_table('aparelhos_conhecidos')
    op.drop_column('usuarios', 'totp_passo')
    op.drop_column('usuarios', 'totp_ativo')
    op.drop_column('usuarios', 'totp_segredo')
