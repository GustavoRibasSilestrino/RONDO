# Rondo API (FastAPI + Postgres)

Rotas: `POST /auth/cadastro`, `POST /auth/login`, `GET /auth/eu`, social (`/social`, `/pessoas`, `/clubes`: feed, posts, cheers, comentários, seguir, clubes, avisos), `POST /profissionais`, `POST /assinaturas`, `GET /treinos/1rm`, `GET /saude`.

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

## Escala (muitos usuários ao mesmo tempo)

- **Banco:** o `DATABASE_URL` do Render deve ser o do **pooler do Supabase em modo transação (porta 6543)**, que divide poucas conexões entre muita gente.
  Na porta 5432 (modo sessão) cada conexão do app ocupa uma conexão real do banco. O código já liga o pool com limite (8 + 6), tempo de espera (10 s),
  reciclagem das conexões velhas (280 s) e desliga comandos preparados na porta 6543 (`app/banco.py`).
- **Fila de pedidos:** no máximo 32 pedidos em andamento; o resto espera até 10 s e, depois, recebe 503 (`app/concorrencia.py`).
  Isso evita o travamento em que as threads esperavam conexão e as conexões esperavam thread.
- **Limite por endereço:** 600 pedidos por minuto por endereço e 20 por minuto em entrar/criar conta (`app/limite.py`); responde 429.
- **Compressão** das respostas (gzip) e **índices** nas tabelas sociais.
- Ajustes por variável de ambiente: `DB_POOL_TAMANHO`, `DB_POOL_EXTRA`, `MAX_PEDIDOS_SIMULTANEOS`, `LIMITE_REQ_MINUTO`, `LIMITE_AUTH_MINUTO` (0 desliga o limite).
- Teste de carga: `node scripts/teste_de_carga.mjs http://localhost:8123 400` contra um banco de teste (nunca o de produção).
- Plano gratuito do Render: uma instância pequena que dorme após 15 minutos parada. Para muita gente de verdade, use um plano pago.

## Pendente

- Cobrança real no gateway e webhook (`/assinaturas` grava como `pendente`).
- Verificação dos profissionais (`pendente` -> `verificado`).
- App: guardar o token em `expo-secure-store` e ler/gravar treinos, dieta e pontos pela API.
