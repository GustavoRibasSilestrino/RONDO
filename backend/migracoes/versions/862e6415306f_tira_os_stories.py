"""tira os stories do RONDO

Desde 2026-11-26 (pedido do dono): o sistema de stories sai por inteiro (publicar, ver, quem viu, reações e apagar).
Apaga as tabelas story_vistos e story_reacoes (primeiro, porque apontam para stories) e depois a stories.
Os stories que estavam no ar (eles duravam 24 horas) somem junto, com quem viu e as reações. As fotos e vídeos deles no
Storage não são apagados por aqui: a migração não fala com o Storage (os arquivos já não aparecem em lugar nenhum).
Também apaga as chaves "stories" e "storiesVistos" que o app guardava em dados_usuario (não servem mais para nada).
As denúncias antigas de tipo "story" ficam na tabela denuncias, para o histórico da moderação.

O downgrade recria as três tabelas vazias como eram (e994d65b9c4f, c3a8f5d1e702 e e7c2a9b15d40), com os índices e,
no Postgres, com o RLS ligado e sem acesso dos papéis públicos do Supabase (c9e4a7b2d613). O que foi apagado não volta.

Revision ID: 862e6415306f
Revises: d8a3f6c1e925
Create Date: 2026-11-26 18:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '862e6415306f'
down_revision: Union[str, Sequence[str], None] = 'd8a3f6c1e925'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_FECHAR = """
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['stories', 'story_vistos', 'story_reacoes'] LOOP
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
    # as que dependem de stories saem antes (chave estrangeira story_id -> stories.id)
    op.drop_index(op.f('ix_story_reacoes_usuario_id'), table_name='story_reacoes')
    op.drop_table('story_reacoes')
    op.drop_index(op.f('ix_story_vistos_usuario_id'), table_name='story_vistos')
    op.drop_table('story_vistos')
    op.drop_index('ix_stories_autor_id_criado_em', table_name='stories')
    op.drop_index(op.f('ix_stories_criado_em'), table_name='stories')
    op.drop_index(op.f('ix_stories_autor_id'), table_name='stories')
    op.drop_table('stories')
    # o que o app guardava sobre os stories na sincronia (as rotas de /me já ignoram essas chaves)
    op.execute("DELETE FROM dados_usuario WHERE chave IN ('stories', 'storiesVistos')")


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table(
        'stories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('autor_id', sa.Integer(), nullable=False),
        sa.Column('texto', sa.String(length=140), nullable=True),
        sa.Column('fundo', sa.Integer(), server_default='0', nullable=False),
        sa.Column('legenda', sa.String(length=120), nullable=True),
        sa.Column('midia', sa.JSON(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['autor_id'], ['usuarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_stories_autor_id'), 'stories', ['autor_id'], unique=False)
    op.create_index(op.f('ix_stories_criado_em'), 'stories', ['criado_em'], unique=False)
    op.create_index('ix_stories_autor_id_criado_em', 'stories', ['autor_id', 'criado_em'], unique=False)
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
    if op.get_bind().dialect.name == "postgresql":
        op.execute(_FECHAR)
