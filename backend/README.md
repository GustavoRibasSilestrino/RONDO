# Rondo API (FastAPI + Postgres)

Rotas: `POST /auth/cadastro`, `POST /auth/login`, `GET /auth/eu`, `POST /profissionais`, `POST /assinaturas`, `GET /treinos/1rm`, `GET /saude`.

## Rodar local

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
cp .env.example .env        # sem DATABASE_URL usa SQLite local
.venv/Scripts/alembic upgrade head
.venv/Scripts/uvicorn app.main:app --reload
```

Testes: `PYTHONPATH=. .venv/Scripts/pytest`.

## Banco (Supabase)

Crie o projeto, copie a connection string do Postgres para `DATABASE_URL` (prefixo `postgresql+psycopg://`) e rode `alembic upgrade head`.
Defina também `JWT_SEGREDO` (32+ caracteres) e `ORIGENS_PERMITIDAS` com os domínios do site e do app.

## Hospedar (Render)

O `render.yaml` na raiz do repositório descreve o serviço `rondo-api` (plano gratuito, região Oregon, a mesma do banco).

1. No Render, crie um **Blueprint** a partir do repositório.
2. Preencha `DATABASE_URL` (a mesma do `.env`) e `JWT_SEGREDO` (um segredo longo, diferente do local).
3. A cada deploy roda `alembic upgrade head` e depois a API. O endereço `/saude` serve de health check.
4. Com a URL pronta (`https://rondo-api.onrender.com`), defina `EXPO_PUBLIC_API_URL` no app e `VITE_API_URL` no site e publique de novo.

No plano gratuito o serviço dorme após 15 minutos parado, e o primeiro acesso depois disso demora cerca de um minuto.

Testes: `pip install -r requirements-dev.txt` e `PYTHONPATH=. pytest`.

## Pendente

- Cobrança real no gateway e webhook (`/assinaturas` grava como `pendente`).
- Verificação dos profissionais (`pendente` -> `verificado`).
- App: guardar o token em `expo-secure-store` e ler/gravar treinos, dieta e pontos pela API.
