import os
import tempfile

# precisa vir antes de qualquer import do app: nos testes todas as requisições saem do mesmo endereço
os.environ.setdefault("LIMITE_REQ_MINUTO", "0")
os.environ.setdefault("LIMITE_AUTH_MINUTO", "0")

# OS TESTES NUNCA USAM O BANCO DE VERDADE. Os testes apagam e recriam as tabelas (drop_all/create_all) a cada teste. Até
# 2026-11-27 o banco vinha do backend/.env, que aponta para o Supabase de produção: rodar os testes apagava o banco do app no
# ar. Agora o banco dos testes é sempre um SQLite novo numa pasta temporária, e a checagem abaixo para tudo se não for.
_BANCO_DOS_TESTES = os.path.join(tempfile.mkdtemp(prefix="rondo-testes-"), "testes.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_BANCO_DOS_TESTES}"

from app.banco import engine  # noqa: E402

if engine.url.get_backend_name() != "sqlite":
    raise SystemExit(f"Os testes só rodam em SQLite, nunca em {engine.url.get_backend_name()} (banco de verdade).")
