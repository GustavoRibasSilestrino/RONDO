"""liga as regras de acesso (RLS) em todas as tabelas e tira o acesso dos papéis públicos do Supabase

O app e o site nunca falam com o banco direto: tudo passa pela API, que entra no Postgres como dona das tabelas. Mas o
Supabase abre por padrão uma porta de leitura das tabelas do esquema "public" (a Data API) para os papéis `anon` e
`authenticated`. Com o RLS desligado, quem tivesse a chave "anon" do projeto leria as tabelas inteiras (o "banco de dados
aberto" dos apps feitos com IA). Aqui o RLS é ligado em todas as tabelas, sem nenhuma regra de liberação (então ninguém
de fora lê nada), e os privilégios desses dois papéis são retirados. A API não muda: a dona das tabelas não é barrada
pelo RLS (não usamos FORCE ROW LEVEL SECURITY).

Só vale no Postgres; no SQLite dos testes não faz nada.

Revision ID: c9e4a7b2d613
Revises: b8d2e5a71c64
Create Date: 2026-11-16 16:30:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c9e4a7b2d613'
down_revision: Union[str, Sequence[str], None] = 'b8d2e5a71c64'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# as tabelas do esquema public, incluindo as que vierem depois (o bloco percorre o que existir na hora)
_LIGAR = """
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated';
  END IF;
END $$;
"""

_DESLIGAR = """
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
"""


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute(_LIGAR)


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute(_DESLIGAR)
