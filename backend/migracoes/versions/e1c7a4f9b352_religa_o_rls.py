"""religa o RLS em todas as tabelas e tira de novo o acesso dos papéis públicos do Supabase (depois do incidente de 2026-11-27)

De 2026-11-06 a 2026-11-27, os testes da API rodaram no banco de produção (o backend/.env de um computador apontava para o
Supabase) e, a cada execução, apagaram e recriaram as tabelas com drop_all/create_all. Uma tabela recriada nasce com o RLS
desligado, e as migrações que o ligaram (c9e4a7b2d613 e as das tabelas novas) não rodam de novo, porque a tabela
alembic_version não é apagada pelos testes: para o Alembic, elas já tinham rodado. Esta migração faz de novo o que a
c9e4a7b2d613 fez, em todas as tabelas que existirem: RLS ligado, sem nenhuma regra de liberação, e nenhum privilégio para
`anon` e `authenticated`. Pode rodar quantas vezes for preciso; a API não muda (a dona das tabelas não é barrada pelo RLS).

Só vale no Postgres; no SQLite dos testes não faz nada. O downgrade não desliga nada (desligar seria abrir o banco).

Revision ID: e1c7a4f9b352
Revises: d5a1c8e3f204
Create Date: 2026-11-27 18:00:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e1c7a4f9b352'
down_revision: Union[str, Sequence[str], None] = 'd5a1c8e3f204'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

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


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute(_LIGAR)


def downgrade() -> None:
    """Nada a desfazer: desligar o RLS abriria as tabelas para a Data API do Supabase."""
