# RONDO

Compita com quem você foi ontem.

App de treino, dieta, constância e comunidade, com recados de voz para o seu "eu do futuro" e profissionais verificados.
Este arquivo é a documentação geral: leia do começo ao fim para continuar o trabalho em outra máquina.

- **App (versão web):** https://rondo-app-eight.vercel.app
- **Site:** https://userondo.vercel.app
- **API:** https://rondo-api-mt29.onrender.com (saúde em `/saude`)
- **Repositório:** https://github.com/GustavoRibasSilestrino/RONDO (branch `main`)

## 1. Visão geral

Três projetos na mesma pasta, cada um com o seu `package.json` ou `requirements.txt`:

| Pasta | O que é | Tecnologia | Onde roda |
|---|---|---|---|
| `app/` | O app (celular e web) | Expo 58, React Native 0.88, react-native-web, TypeScript | Vercel (versão web) e Expo (celular) |
| `backend/` | A API | FastAPI, SQLAlchemy, Alembic, Postgres | Render |
| `vitrine/` | O site de divulgação, cadastro de profissionais e páginas legais | Vite, React 19, three.js | Vercel |

Outras pastas: `brand/` (símbolo da marca), `docs/` (conformidade e fichas das lojas), `site/` (versão antiga do site, não é a publicada),
`PRODUCT.md` (público e posicionamento do produto).

Fluxo de publicação: **push na `main` dispara tudo**. A Vercel publica o site e o app web; o Render publica a API e roda `alembic upgrade head`
antes de subir. Pelas regras do dono, **pergunte antes de qualquer push, deploy ou migração real**.

```
 app (Expo/web) ──┐                      ┌── Supabase Postgres (dados)
                  ├──►  API FastAPI ─────┤
 vitrine (site) ──┘     (Render)          └── Supabase Storage (fotos, bucket "midia")
```

## 2. Continuar em outra máquina (passo a passo)

Precisa de: Git, Node 20+ (testado com 24), Python 3.12 e, para o app no celular, o Expo Go.

```bash
git clone https://github.com/GustavoRibasSilestrino/RONDO.git
cd RONDO
```

**API local** (sem `DATABASE_URL` usa SQLite; nunca toca no banco de produção):

```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt     # Linux/Mac: .venv/bin/pip
cp .env.example .env                                  # deixe DATABASE_URL vazio para usar SQLite
.venv/Scripts/alembic upgrade head
.venv/Scripts/uvicorn app.main:app --reload --port 8123
.venv/Scripts/python -m pytest -q                     # 52 testes devem passar
```

**App:**

```bash
cd app
npm install
echo "EXPO_PUBLIC_API_URL=http://localhost:8123" > .env.local
npm run web          # abre no navegador; npm start para o celular (Expo Go)
npm run typecheck
```

**Site:**

```bash
cd vitrine
npm install
npm run dev          # http://localhost:5173
npm run build        # roda tsc e o vite build; saída em dist/
```

Arquivos que **não estão no Git** e precisam ser recriados na outra máquina: `backend/.env`, `app/.env.local`, `app/.env.production`,
`vitrine/.env.production`. As chaves reais ficam só nos painéis do Render e do Supabase. **Nunca cole chaves no chat nem no repositório.**
Na raiz há arquivos de ferramenta que não são do produto e não vão no commit: `.claude/`, `.impeccable/`, `.mcp.json`,
`PRODUCT.md`, `vitrine/app-preview.html`.

## 3. Variáveis de ambiente

**API (`backend/.env` local; painel do Render em produção):**

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Postgres. Em produção use o **pooler do Supabase em modo transação, porta 6543**, com prefixo `postgresql+psycopg://`. Sem ela, usa SQLite local |
| `JWT_SEGREDO` | Segredo longo (32+ caracteres) que assina o login. Diferente em produção |
| `ORIGENS_PERMITIDAS` | Domínios que podem chamar a API (CORS), separados por vírgula |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET` | Fotos e vídeos dos posts e stories (bucket `midia`). A chave é a `service_role`, só no servidor |
| `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Voz do RONDIN para nomes e números. Opcional |
| `DB_POOL_TAMANHO`, `DB_POOL_EXTRA`, `MAX_PEDIDOS_SIMULTANEOS`, `LIMITE_REQ_MINUTO`, `LIMITE_AUTH_MINUTO` | Ajustes de escala (padrões em `backend/app/config.py`; 0 desliga o limite) |

**App:** `EXPO_PUBLIC_API_URL`, a URL da API. **Site:** `VITE_API_URL`, a mesma URL.

## 4. App (`app/`)

- **Entrada:** `App.tsx` (Login ou telas; menu lateral no computador, barra de abas no celular). `index.ts` registra o app.
- **Telas** (`src/telas/`): Início, Hoje, Treino, Dieta, Evolução, Comunidade e Feed (`Social.tsx` e `comunidade/`), Recado de voz, Coleções, Notificações, Perfil (`perfil/`), Rondin (assistente), busca de profissionais, Login.
- **Estado:** `src/estado/loja.tsx`. Guarda no aparelho (AsyncStorage) e **sincroniza com o servidor por chave** na tabela `dados_usuario` (`src/api/sincronia.ts`; as chaves aceitas estão em `backend/app/rotas/me.py`). Ao entrar, puxa os dados da conta.
- **API do app** (`src/api/`): `cliente.ts` (fetch com token), `sessao.ts` (token no `expo-secure-store`), `conta.ts`, `social.ts`, `seguranca.ts`, `privacidade.ts`, `sincronia.ts`.
- **Lógica** (`src/lib/`): cálculos (`calc.ts`, 1RM de Epley), nível e XP (`nivel.ts`, `patentes.ts`), medalhas, rotinas de treino, importar treino, stories, notificações, voz do Rondin, largura (`largura.ts`).
- **Componentes** (`src/componentes/`): menu lateral e painel de gráficos (só no computador), `BotaoMais` (o +), fundos (`FundoBolhas`, `FundoUltra`), gráficos (`Grafico.tsx`), stories, medalhas 3D, `TrocaTema`.
- **Layout:** celular usa barra de abas embaixo. Janela web a partir de **1024 px** ganha menu lateral (com hambúrguer para recolher); a partir de **1240 px** ganha a coluna da direita com os gráficos de Evolução e Constância. O + fica na borda direita da área.
- **Tema:** `src/tema.ts`. Dois temas: **normal** (preto com bolas roxas borradas, redondo, Poppins fina) e **Ultra** (vidro e aurora azul-ciano; liberado no **nível 15**). `TrocaTema.tsx` faz a transição: a tela esmaece até o preto e, ao entrar no Ultra, aparece a palavra ULTRA colorida.
- **Social:** feed estilo Instagram, stories, curtidas ("cheers"), comentários, seguir, clubes, ranking semanal, notificações, pergunta do dia. Fotos sobem para o Supabase Storage e o post guarda a URL.
- **Recados de voz:** os áudios ficam no aparelho. A voz do Rondin vem de arquivos gerados por `npm run vozes` (`scripts/gerar-vozes.mjs`) e, para nomes e números, da API (`/rondin`).
- **Build web:** `npm run export:web` gera `dist/`. O `vercel.json` do app serve em `/app` e põe cache imutável nos arquivos com hash.

## 5. API (`backend/`)

- **Estrutura:** `app/main.py` (monta tudo), `config.py`, `banco.py` (pool de conexões), `deps.py` (login e usuário atual), `seguranca.py` (hash de senha, JWT), `limite.py`, `concorrencia.py`, `legal.py` (versões dos termos), `esquemas*.py` (validação), `modelos/`, `rotas/`, `servicos/`.
- **Modelos:** usuário, dado_usuario (chave/valor por conta), social (posts, curtidas, comentários, seguidores, clubes, stories, notificações), profissional, assinatura, consentimento (LGPD).
- **Rotas (46):** `/auth` (cadastro, login, eu), `/me` (perfil, dados, conta), `/social` (feed, posts, curtidas, comentários, stories, resumo, notificações), `/pessoas`, `/clubes`, `/midia` (envio de foto), `/profissionais`, `/assinaturas`, `/treinos/1rm`, `/rondin` (voz), `/saude`. A documentação interativa fica em `/docs` com a API rodando.
- **Cadastro** exige `nascimento`, `aceita_termos` e `aceita_privacidade` (LGPD); `marketing` é opcional.
- **Migrações (Alembic):** `backend/migracoes/versions/`. A última é `c3a8f5d1e702` (índices de escala). Nova: `alembic revision -m "texto"` e `alembic upgrade head`. O Render roda `upgrade head` a cada deploy.
- **Testes:** `backend/tests/` (API, LGPD, mídia, social, escala). Usam SQLite; **nunca** apontam para o banco real. Use só e-mails `@example.com`.

### Escala (muitos usuários ao mesmo tempo)

- Pool de conexões com limite (8 + 6), espera de 10 s e reciclagem a cada 280 s (`banco.py`). Na porta 6543 o código desliga comandos preparados.
- **Fila de pedidos:** no máximo 32 em andamento; o resto espera até 10 s e recebe 503 (`concorrencia.py`). Isso corrigiu um travamento em que as threads esperavam conexão e as conexões esperavam thread.
- **Limite por endereço:** 600 pedidos por minuto e 20 por minuto em login e cadastro; responde 429 (`limite.py`).
- Compressão gzip e índices nas tabelas sociais.
- Teste de carga: `node backend/scripts/teste_de_carga.mjs http://localhost:8123 400` (deve dar 400 respostas 200). **Só contra banco de teste.** Com SQLite novo, rode `alembic upgrade head` antes.
- Plano gratuito do Render: dorme após 15 minutos parado e o primeiro acesso demora cerca de um minuto. Para muita gente real, use plano pago.

## 6. Site (`vitrine/`)

- **Conteúdo (uma página, rolagem):** topo com foto de corredor sobre violeta e a palavra RONDO gigante ao fundo (de margem a margem), seção de aparelhos em 3D (three.js, carregado sob demanda) com palavras que trocam, Constância (quadro de 12 semanas, só para ver), Recado de voz, ferramentas, comparação "Você vs. Ontem", planos e cadastro de profissionais. Também `/privacidade`, `/termos` e `/excluir-conta` (usadas nas lojas).
- **Arquivos:** `src/App.tsx`, `src/components/` (`Hero`, `GymScene`, `Constancia`, `Tools`, `Recado`, `Cadastro`, `Legal`, `Nav`...), `src/styles/` (`hero.css`, `streak.css`, `components.css`, `responsive.css`...), `public/` (`corredor.webp`).
- **Estilo:** Poppins, violeta e preto, quinas cortadas (`clip-path`). No celular a escala é fluida em `rem`; medido em 390 e 320 px sem rolagem lateral.
- **Vercel:** o `vercel.json` faz o site responder em `/app` apontando para o app web e põe cache imutável nos arquivos com hash.

## 7. Conformidade e lojas

`docs/conformidade.md` (LGPD, consentimentos, exclusão de conta) e `docs/lojas.md` (respostas prontas para Google Play e App Store). O app não tem anúncios, análise nem rastreamento. Mudou o que se coleta? Atualize `docs/lojas.md`, `vitrine/src/components/Legal.tsx` e `app/app.json` (manifesto de privacidade do iOS).

## 8. Regras de trabalho do dono

- Português, frases curtas.
- Perguntar antes de push, deploy e migração real.
- Nunca apagar dados reais; testar só com `@example.com` e SQLite local.
- Não colar chaves nem senhas no chat.
- Commitar só os arquivos que você mudou (ver lista de arquivos de ferramenta na seção 2).
- Visual: preto com roxo, fontes finas, sem rótulos pequenos de "eyebrow".

## 9. Estado atual e pendências

No ar: contas, social compartilhada no banco, fotos no Supabase Storage, stories, feed estilo Instagram, gráficos na direita, tema Ultra com transição, escala (pool, fila, limites, índices), site novo, LGPD.
Última validação: 52 testes do back, `tsc` limpo no app e no site, carga de 400 pedidos sem erro, API e site respondendo em produção.

Pendente:
- **Cobrança real** no gateway com webhook (`/assinaturas` grava como `pendente`).
- **Verificação dos profissionais** (`pendente` para `verificado`).
- Conferir o deploy do **app web** na Vercel (projeto separado do site).
- A branch `yesteryou-main` do repositório pode ser apagada: `git push origin --delete yesteryou-main`.
- Para mais tráfego: plano pago no Render e conferir o limite de conexões do pooler do Supabase.
