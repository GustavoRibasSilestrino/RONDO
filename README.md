# RONDO

Compita com quem você foi ontem.

App de treino, dieta, constância e comunidade, com recados de voz para o seu "eu do futuro" e profissionais verificados.
Este arquivo é a documentação geral: leia do começo ao fim para continuar o trabalho em outra máquina.

- **App (versão web):** https://userondo.vercel.app/app (o endereço antigo, rondo-app-eight.vercel.app, redireciona para ele)
- **Site:** https://userondo.vercel.app
- **API:** https://rondo-api-mt29.onrender.com (saúde em `/saude`)
- **Repositório:** https://github.com/GustavoRibasSilestrino/RONDO (branch `main`)

## 1. Visão geral

Três projetos na mesma pasta, cada um com o seu `package.json` ou `requirements.txt`:

| Pasta | O que é | Tecnologia | Onde roda |
|---|---|---|---|
| `app/` | O app (celular e web) | Expo 58, React Native 0.88, react-native-web, TypeScript | Vercel (versão web) e Expo (celular) |
| `backend/` | A API | FastAPI, SQLAlchemy, Alembic, Postgres | Render |
| `vitrine/` | O site de divulgação, cadastro de profissionais e páginas legais | Vite, React 19 | Vercel |

Outras pastas: `brand/` (símbolo da marca), `docs/` (conformidade e fichas das lojas), `site/` (versão antiga do site, não é a publicada),
`PRODUCT.md` (público e posicionamento do produto).

Fluxo de publicação: **push na `main` dispara tudo**. A Vercel publica o site e o app web; o Render publica a API e roda `alembic upgrade head`
antes de subir. Desde 2026-11-07 o dono autorizou **commitar e dar push direto na `main`, sem perguntar** (ver seção 8); migrações rodam sozinhas no deploy, então **avise quando houver migração nova**.

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
.venv/Scripts/python -m pytest -q                     # 72 testes devem passar
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
| `BREVO_API_KEY` (ou `RESEND_API_KEY`), `EMAIL_REMETENTE`, `EMAIL_REMETENTE_NOME` | E-mail da recuperação de senha, por API HTTP (o plano grátis do Render bloqueia SMTP). Sem elas o código não é enviado. `EMAIL_MODO_TESTE=true` escreve o e-mail no log, só em desenvolvimento |
| `GOOGLE_CLIENT_IDS`, `APPLE_CLIENT_IDS` | IDs de cliente para entrar com Google e Apple (separados por vírgula). Sem elas, as rotas respondem 503 |
| `DB_POOL_TAMANHO`, `DB_POOL_EXTRA`, `MAX_PEDIDOS_SIMULTANEOS`, `LIMITE_REQ_MINUTO`, `LIMITE_AUTH_MINUTO` | Ajustes de escala (padrões em `backend/app/config.py`; 0 desliga o limite) |

**App:** `EXPO_PUBLIC_API_URL`, a URL da API; `EXPO_PUBLIC_GOOGLE_CLIENT_ID` e `EXPO_PUBLIC_APPLE_CLIENT_ID` ligam os botões de login social (só aparecem com elas). **Site:** `VITE_API_URL`, a mesma URL.
Passo a passo da Brevo, do Google e da Apple em `docs/login-social.md`.

## 4. App (`app/`)

- **Entrada:** `App.tsx` (Login ou telas; menu lateral no computador, barra de abas no celular). `index.ts` registra o app.
- **Telas** (`src/telas/`): Início, Hoje, Treino, Dieta, Evolução, Comunidade e Feed (`Social.tsx` e `comunidade/`), Recado de voz, Coleções, Notificações, Perfil (`perfil/`), Rondin (assistente), busca de profissionais, Login.
- **Estado:** `src/estado/loja.tsx`. Guarda no aparelho (AsyncStorage) e **sincroniza com o servidor por chave** na tabela `dados_usuario` (`src/api/sincronia.ts`; as chaves aceitas estão em `backend/app/rotas/me.py`). Ao entrar, puxa os dados da conta.
- **API do app** (`src/api/`): `cliente.ts` (fetch com token), `sessao.ts` (token no `expo-secure-store`), `conta.ts`, `social.ts`, `seguranca.ts`, `privacidade.ts`, `sincronia.ts`.
- **Lógica** (`src/lib/`): cálculos (`calc.ts`, 1RM de Epley), nível e XP (`nivel.ts`, `patentes.ts`), medalhas, rotinas de treino, importar treino, stories, notificações, voz do Rondin, largura (`largura.ts`).
- **Componentes** (`src/componentes/`): menu lateral e painel de gráficos (só no computador), `BotaoMais` (o +), fundo (`FundoBolhas`), gráficos (`Grafico.tsx`), stories, medalhas 3D, a joia da sequência (`ChamaJoia.tsx` e `SeloSequencia.tsx`).
- **Layout:** celular usa barra de abas embaixo. Janela web a partir de **1024 px** ganha menu lateral (com hambúrguer para recolher); a partir de **1240 px** ganha a coluna da direita com os gráficos de Evolução e Constância. O + fica na borda direita da área.
- **Tema:** `src/tema.ts`. Uma aparência só: preto com bolas roxas borradas, redondo, Poppins fina. Não há troca de tema (o tema Ultra e a transição ULTRA foram removidos em 2026-11-10, para o app ficar mais original); `cores` é a paleta única e `estilos(...)` calcula os estilos uma vez.
- **Sequência:** a regra está em `src/lib/calc.ts` (`streakAtual`: dias seguidos com treino, 2 refeições ou check-in; uma falta por semana não quebra; `diasDaSequencia` devolve os dias que contam; `situacaoDaSequencia` diz se a chama está acesa, em risco ou apagada). O desenho é uma **chama roxa plana (2D), sem contorno** (`ChamaJoia.tsx`, vetorial: duas formas chapadas, a chama e o miolo mais claro; a versão em joia lapidada saiu em 2026-11-10, o nome do arquivo ficou): acesa quando já houve registro hoje, mais fraca quando a sequência vive mas hoje ainda não teve registro, cinza quando não há sequência. O `SeloSequencia` (chama + número de dias, sem fundo e sem borda) fica no **canto de cima, à esquerda**, em todas as telas (no cabeçalho no celular, antes do plano PRO e das notificações; no canto da área no computador) e abre o calendário. No canto de cima à direita fica só a lupa da busca. No celular o nome RONDO do meio do cabeçalho se ajusta ao espaço: no centro em 390 px ou mais, menor e deslocado para o vão livre em telas mais estreitas (`CabecalhoApp.tsx`). A chama também marca os dias da sequência no calendário (`CalendarioMes.tsx`) e aparece em Hoje, Evolução, no painel lateral e onde o ícone `chama` já existia (o `Icone` de nome `chama` desenha a mesma chama).
- **Popups de baixo (`Folha`, em `Estrutura.tsx`):** fecham arrastando a alça ou o título para baixo, ou tocando na alça; no celular, de qualquer ponto com o conteúdo no topo.
- **Conta:** entrar e criar conta pelo Rondin (conversa); **esqueci a senha** com código de 6 números por e-mail (`telas/RecuperarSenha.tsx`); **entrar com Google e Apple** só no navegador por enquanto (`componentes/BotoesSociais.tsx`, `telas/CadastroSocial.tsx`, `lib/loginSocial.ts`); **nome de conta único** (conferido já no cadastro). O app acorda o servidor ao abrir (`aquecerApi`), porque o plano grátis do Render dorme.
- **Perfis e stories:** a foto de perfil vem do servidor (aparece em todos os aparelhos e para os outros); o perfil de outra pessoa mostra clubes, seguidores e quem ela segue (a lista abre o perfil, com pilha de voltar); os stories têm reação (um emoji no canto de baixo à direita que abre as outras para cima), curtir e a lista de quem viu (bolinhas no canto de baixo à esquerda, `+N` quando passa de 3); a lupa de busca (nome sem acento, erro de digitação perdoado, quem você segue primeiro) fica sozinha no canto direito do cabeçalho, e no canto de cima à direita do feed no computador.
- **Treino em casa:** `src/lib/semAparelho.ts` tem 22 exercícios sem aparelho e 4 treinos prontos, no editor de treino (Criar treino > Treino para fazer em casa).
- **Social:** feed estilo Instagram, stories, curtidas ("cheers"), comentários, seguir, clubes, ranking semanal, notificações, pergunta do dia. Fotos sobem para o Supabase Storage e o post guarda a URL.
- **Recados de voz:** os áudios ficam no aparelho. A voz do Rondin vem de arquivos gerados por `npm run vozes` (`scripts/gerar-vozes.mjs`) e, para nomes e números, da API (`/rondin`).
- **Rondin com cara de "Jarvis" (2026-11-10):** o orbe ganhou moldura de instrumento (`componentes/Orbe.web.tsx`, num canvas só: espectro de voz em volta da esfera, anel de arcos, anel de marcações e um feixe que varre; no celular, `Orbe.tsx` tem a versão leve em SVG). Ele acompanha o cursor, acende quando o cursor passa por cima, solta uma onda a cada tecla digitada, e tocar nele pula a fala ou repete a pergunta. A conversa (`telas/Rondin.tsx`) mostra o estado ("FALANDO", "OUVINDO", "PROCESSANDO"), a etapa ("ETAPA 03 · 14") e, no computador, atalhos de teclado nas opções (1 a 9; Enter continua). No navegador a coluna escala com a janela (`k` entre 0,78 e 1,12; antes ia a 1,8 e as opções ficavam enormes). **Vozes: só duas**, Português (`br`) e Inglês (`gringo`, a voz americana falando o mesmo roteiro em português); as outras sete opções saíram (`lib/rondinSotaques.ts`).
- **Build web:** `npm run export:web` gera `dist/`. O `vercel.json` do app serve em `/app` e põe cache imutável nos arquivos com hash.

## 5. API (`backend/`)

- **Estrutura:** `app/main.py` (monta tudo), `config.py`, `banco.py` (pool de conexões), `deps.py` (login e usuário atual), `seguranca.py` (hash de senha, JWT), `limite.py`, `concorrencia.py`, `legal.py` (versões dos termos), `esquemas*.py` (validação), `modelos/`, `rotas/`, `servicos/`.
- **Modelos:** usuário, dado_usuario (chave/valor por conta), social (posts, curtidas, comentários, seguidores, clubes, stories, notificações), profissional, assinatura, consentimento (LGPD).
- **Rotas:** `/auth` (cadastro, login, eu, `esqueci-senha`, `redefinir-senha`, `google`, `apple`, `social/cadastro`, `nome-livre`), `/me` (perfil, dados, conta), `/social` (feed, posts, curtidas, comentários, stories, resumo, notificações), `/pessoas`, `/clubes`, `/midia` (envio de foto), `/profissionais`, `/assinaturas`, `/treinos/1rm`, `/rondin` (voz), `/saude`. A documentação interativa fica em `/docs` com a API rodando.
- **Cadastro** exige `nascimento`, `aceita_termos` e `aceita_privacidade` (LGPD); `marketing` é opcional.
- **Migrações (Alembic):** `backend/migracoes/versions/`. A última é `f1a6d3c92b57` (coluna de busca de pessoas; antes dela `e7c2a9b15d40`, stories vistos e reações, e `d5b1e8a47c30`, redefinição de senha). Nova: `alembic revision -m "texto"` e `alembic upgrade head`. O Render roda `upgrade head` a cada deploy.
- **Testes (72):** `backend/tests/` (API, LGPD com recuperação de senha, login social e nome único, mídia, social com stories e busca, escala). Usam SQLite; **nunca** apontam para o banco real. Use só e-mails `@example.com`.

### Escala (muitos usuários ao mesmo tempo)

- Pool de conexões com limite (8 + 6), espera de 10 s e reciclagem a cada 280 s (`banco.py`). Na porta 6543 o código desliga comandos preparados.
- **Fila de pedidos:** no máximo 32 em andamento; o resto espera até 10 s e recebe 503 (`concorrencia.py`). Isso corrigiu um travamento em que as threads esperavam conexão e as conexões esperavam thread.
- **Limite por endereço:** 600 pedidos por minuto e 20 por minuto em login e cadastro; responde 429 (`limite.py`).
- Compressão gzip e índices nas tabelas sociais.
- Teste de carga: `node backend/scripts/teste_de_carga.mjs http://localhost:8123 400` (deve dar 400 respostas 200). **Só contra banco de teste.** Com SQLite novo, rode `alembic upgrade head` antes.
- Plano gratuito do Render: dorme após 15 minutos parado e o primeiro acesso demora cerca de um minuto. Para muita gente real, use plano pago.

### Segurança (revisão de 2026-11-10, pelos 19 pontos)

Nenhum sistema é impossível de invadir; o que existe é fechar as portas conhecidas e manter a casa em ordem. Estado de cada ponto:

| # | Ponto | Situação |
|---|---|---|
| 1 | `.env` exposta | Nenhuma `.env` com segredo no repositório nem no histórico. Os `.env.production` versionados só têm o endereço público da API. Segredos ficam no painel do Render. |
| 2, 3 | Validação só no frontend / no backend | Toda entrada é conferida de novo na API (Pydantic, com tamanhos máximos). O que o app valida é só para avisar mais cedo. |
| 4 | SQL injection | Só SQLAlchemy com parâmetros; não há SQL montado com texto. |
| 5 | Autenticação fraca | Senha nova com 8 ou mais caracteres (antes 6). A API **não sobe em produção** com o `JWT_SEGREDO` padrão. `/docs` e `/openapi.json` ficam fechados em produção. |
| 6 | IDOR | Cada rota confere o dono (post, comentário, story, clube, foto de perfil só da pasta da própria pessoa). |
| 7 | Senhas direto no banco | Argon2id; o código de redefinição também é guardado só como hash. |
| 8 | Força bruta | Limite por endereço (20 por minuto nas rotas de entrada) **e trava por conta**: 8 senhas erradas em 15 minutos travam a conta por esse tempo, venha o pedido de onde vier (`app/protecao.py`). Código de redefinição: 5 tentativas e 3 códigos por hora. |
| 9 | Envio duplo | Os botões de enviar ficam desligados enquanto o pedido está no ar (site e app). |
| 10 | CSRF | Não há cookie de sessão: o login vai no cabeçalho `Authorization`, que um site de fora não consegue mandar. |
| 11 | Upload sem validação | Só extensões de imagem e vídeo, em pasta própria de cada pessoa, com endereço assinado de uso único; a chave do Storage nunca sai do servidor. **Falta:** o limite de tamanho e o tipo real do arquivo são do bucket no Supabase (conferir no painel). |
| 12 | Erros revelando informação | Erros de validação não devolvem o que foi enviado; login e "esqueci a senha" respondem igual exista a conta ou não. |
| 13 | Dependências vulneráveis | Site: 0 (`npm audit`). App: 5 moderadas, todas em ferramenta de build do Expo (não vão para o aparelho; o conserto exige trocar a versão do Expo). API: versões atuais; `requirements.txt` não fixa versões. |
| 14 | Tokens | O token traz a marca da senha: **trocar ou redefinir a senha derruba todos os tokens antigos** (o aparelho que trocou recebe um novo). O token do login social não serve para entrar. Validade de 7 dias. |
| 15 | Rate limit | Por endereço em tudo (600 por minuto) e menor nas rotas de entrada. O endereço agora vem do cabeçalho do proxy (`CF-Connecting-IP`), não do `X-Forwarded-For`, que o visitante podia inventar para furar o limite. |
| 16 | Dados sensíveis expostos | A busca de pessoas não devolve e-mail; respostas da API saem com `Cache-Control: no-store`; no celular o token fica no cofre do sistema. Na web ele fica no armazenamento do navegador (não há cofre), por isso a política de conteúdo abaixo. |
| 17 | SSRF | O servidor só chama endereços fixos (Google, Apple, Azure, Supabase, Brevo); nenhum endereço vem de quem usa. |
| 18 | Cookies inseguros | Não há cookies. |
| 19 | CORS | Só as origens do RONDO, só os métodos e cabeçalhos usados, sem credenciais. |

Além disso: cabeçalhos de segurança em toda resposta da API (`Blindagem`, em `app/protecao.py`: `nosniff`, `X-Frame-Options`, HSTS, CSP) e corpo de pedido limitado a 8 MB; no site (`vitrine/vercel.json`), política de conteúdo (CSP) que só deixa rodar código do próprio site, HSTS e proibição de abrir em moldura; no app web (`app/vercel.json`), os mesmos cabeçalhos com a CSP ainda em modo de relatório (`Report-Only`), para confirmar em produção que o login do Google e da Apple não é bloqueado antes de ligar de vez. Testes: `backend/tests/test_seguranca.py`.

**Atenção no deploy:** confira no painel do Render que `JWT_SEGREDO` está definido com um valor longo e aleatório. Se estiver vazio, o deploy novo falha de propósito (a versão anterior continua no ar).

## 6. Site (`vitrine/`)

- **Conteúdo (uma página, rolagem):** topo em violeta com a palavra RONDO gigante ao fundo (de margem a margem) e o título "Vença o você de ontem." (todo na mesma fonte), seção de aparelhos (halter, kettlebell, barra e banco em 3D, que giram conforme a rolagem; ver "Aparelhos em 3D" abaixo) com palavras que trocam, Constância (quadro de 12 semanas, só para ver), Recado de voz, ferramentas, comparação "Você vs. Ontem", planos e cadastro de profissionais. Também `/privacidade`, `/termos`, `/excluir-conta` e as outras páginas legais. O corredor do topo foi **removido**.
- **Cadastro e entrada:** "Criar conta" abre uma janela de cadastro (`CadastroModal.tsx`, hash `#cadastro`); "Entrar" e "Abrir o app" levam ao app web em `/app` (a Vercel do site repassa `/app` para o projeto do app).
- **Fonte:** o texto é **Bricolage Grotesque** (a do logo do GastroMatch), variável, auto-hospedada (`@fontsource-variable/bricolage-grotesque`). Os **títulos** (desde 2026-11-10) são **Climate Crisis** (`@fontsource/climate-crisis`, letra de cartaz gorda e uns 60% mais larga; por isso os tamanhos dos títulos ficam no fim de `styles/acabamento.css`), via `--font-titulo`. O "de ontem." da primeira tela e as páginas legais continuam na Bricolage. O "V" em letra de mão (Reenie Beanie) saiu, junto com o pacote da fonte.
- **Paisagens ilustradas (2026-11-10):** o site e o app têm fundos em desenho vetorial plano, em cores de verdade (pôr do sol, cidade à noite, lago de dia, pista de corrida, campo). São gerados por `vitrine/scripts/cenas/cenas.mjs` (`node cenas.mjs <pasta>`; com o `sharp` instalado, gera também os `.webp` do app), cada um em versão deitada (`-l`) e de pé (`-r`). No site ficam em `src/assets/cenas/*.svg` e entram por `styles/cenas.css`: nas seções Recado, Constância e Planos a meia força, e na chamada final dentro do quadro. A **primeira tela** é montada em três peças para o nome **RONDO fazer o papel das montanhas**: o céu (`hero-ceu`), a textura de serra que preenche as letras (`hero-serra`, com `background-clip: text`) e uma fileira só de pinheiros na frente (`hero-pinheiros`). No app ficam em `app/assets/cenas/*.webp` e entram por `componentes/FundoCena.tsx` (uma cena por aba; as bolhas roxas do fundo saíram). As imagens de referência que o dono mandou tinham só ~300 px por quadro, por isso as cenas foram redesenhadas em vetor.
- **Botões:** canto de 12 px, degradê roxo com fio de luz em cima e sombra embaixo, brilho roxo por baixo e um reflexo que atravessa com o cursor; na primeira tela o principal é branco e o segundo é de vidro (fim de `styles/acabamento.css`). O app usa o mesmo desenho (`Botao` em `app/src/componentes/Ui.tsx`).
- **Animações:** **GSAP + ScrollTrigger** (`src/lib/gsap.ts`): entrada do topo em sequência, a palavra do fundo desce mais devagar ao rolar, blocos que sobem ao aparecer (`Reveal`) e títulos palavra por palavra (`Title`, ambos em `components/ui.tsx`). A cena dos aparelhos tem código próprio, de propósito leve (`GymScene.tsx`: só transform e opacity, e o laço dorme quando a rolagem para).
- **Acabamento (`styles/acabamento.css`, o último a carregar):** só detalhes pequenos, sem mudar o desenho: títulos com linhas equilibradas e textos sem palavra sozinha no fim (`text-wrap`), números de largura fixa onde mudam ou ficam em coluna, divisória entre as seções como um fio que some nas pontas, um fio de luz na borda de cima dos cartões, resposta ao clique nos botões, sem o clarão cinza do toque no celular, sublinhado que cresce nos links do rodapé, perguntas do FAQ que respondem ao cursor e anel de foco mais claro. A linha de batimento (ECG) que se desenhava no topo de cada seção foi **removida** em 2026-11-10.
- **Aparelhos em 3D (sem WebGL):** os quatro aparelhos são modelos 3D, mas o 3D não é calculado no navegador de quem visita (a versão com three.js travava). Cada modelo é renderizado antes, por `vitrine/scripts/aparelhos3d` (traçado de raios em Node: metal refletindo um estúdio de luzes, sombra no chão e a luz da cor de cada cena), em 31 ângulos. O site recebe, por aparelho, uma folha com os 31 quadros (AVIF, em dois tamanhos: `-g` e, até 820 px de largura, `-p`), o quadro de descanso sozinho (WebP) e o contorno do "ontem" (WebP), tudo em `src/assets/gym/`, com as medidas em `components/gymQuadros.ts` (gerado). `GymScene.tsx` copia o quadro do ângulo da vez para um canvas pequeno, só quando o quadro muda; o aparelho gira ao passar (entra mostrando um lado, sai mostrando o outro). As folhas só são baixadas quando a seção está a menos de uma tela de distância, uma por vez e com prioridade baixa, e só ficam abertas na memória a do aparelho da vez e as vizinhas. Antes de a folha chegar, em navegador sem AVIF ou com economia de dados ligada, aparece o quadro de descanso (o mesmo modelo, parado); com movimento reduzido, uma grade parada com os quatro. Para mudar um modelo: editar a função dele em `render.mjs` e rodar `node cli.mjs tudo` naquela pasta (precisa de `npm install --no-save sharp`; uns 5 minutos).
- **Celular:** tudo é proporcional à largura da tela, sem degraus. Até 640 px, 1rem vale 4,2% da largura (390 px = 16,4 px; 320 px = 13,4 px; 430 px = 18,1 px); o que era em px (ícones, botões, alturas, cantos) foi para rem em `responsive.css`, `hero.css`, `legal.css` e `gym.css`, então o 390 px ficou igual e os outros celulares são o mesmo desenho, maior ou menor. Alvos de toque nunca abaixo de 44 px (`max(44px, ...)`). Tablet (641 a 980 px, rem em 17 px) e computador não mudam. Na primeira tela o texto fica no centro e os botões descem para perto da borda de baixo. Medido em 320, 360, 390, 412 e 430 px (com altura proporcional à largura): tamanho das letras idêntico em proporção, página inteira com 0,5% de diferença e sem rolagem lateral. Na seção dos aparelhos, o aparelho fica parado no centro e anda em linha reta, e o contorno do "ontem" some na troca, para os vizinhos nunca se sobreporem.
- **Arquivos:** `src/App.tsx`, `src/components/` (`Hero`, `GymScene`, `Constancia`, `Tools`, `Recado`, `Cadastro`, `CadastroModal`, `Legal`, `Nav`...), `src/styles/` (`base.css`, `hero.css`, `gym.css`, `day.css`, `legal.css`, `responsive.css`...).
- **Estilo:** violeta e preto, quinas cortadas (`clip-path`), botões de contorno fino.
- **Vercel:** o `vercel.json` do site repassa `/app` ao app web e põe cache imutável nos arquivos com hash.

## 7. Conformidade e lojas

`docs/conformidade.md` (LGPD, consentimentos, exclusão de conta) e `docs/lojas.md` (respostas prontas para Google Play e App Store). O app não tem anúncios, análise nem rastreamento. Mudou o que se coleta? Atualize `docs/lojas.md`, `vitrine/src/components/Legal.tsx` e `app/app.json` (manifesto de privacidade do iOS).

## 8. Regras de trabalho do dono

- Português, frases curtas.
- **Push direto autorizado** (2026-11-07): commitar e dar push na `main` sem perguntar. Avisar quando houver migração nova no banco.
- Nunca apagar dados reais; testar só com `@example.com` e SQLite local.
- Não colar chaves nem senhas no chat.
- Commitar só os arquivos que você mudou (ver lista de arquivos de ferramenta na seção 2).
- Visual: preto com roxo. A fonte do site é a Bricolage Grotesque (a do logo do GastroMatch); sem rótulos pequenos de "eyebrow".

## 9. Estado atual e pendências

**No ar (2026-11-07):** contas, social compartilhada no banco, fotos no Supabase Storage, stories com reação e "quem viu", feed contínuo estilo timeline (sem filtros), busca de pessoas, perfis com seguidores e clubes, nome de conta único, recuperação de senha por e-mail (depende da Brevo), login com Google e Apple no navegador (depende dos IDs), treino em casa sem aparelho, layout de computador (menu lateral, coluna de gráficos, telas proporcionais), site em Bricolage Grotesque com GSAP, escala (pool, fila, limites, índices), LGPD.
Última validação: 72 testes do back, `tsc` limpo no app e no site.

**Próximo passo pedido pelo dono: colocar a Bricolage Grotesque no app.** Hoje o app usa Poppins (`@expo-google-fonts/poppins`, carregada em `App.tsx` com `useFonts` e mapeada em `FONTE` no `src/tema.ts`: os pesos `'200'`, `'300'`, `'400'` e `'500'` viram Light, Regular, Medium e SemiBold). Como fazer: `npx expo install @expo-google-fonts/bricolage-grotesque expo-font`, carregar os pesos em `App.tsx`, trocar os nomes em `FONTE` e conferir as telas (Rondin, cartões, perfil, treino), porque a Bricolage tem larguras diferentes da Poppins e pode pedir ajuste de `tam` e de `lineHeight`. O app só mostra a tela depois que as fontes carregam.

Pendente, depende do dono (contas externas):
- **Brevo** (e-mail de recuperação de senha): criar a conta, confirmar o remetente e preencher `BREVO_API_KEY` e `EMAIL_REMETENTE` no Render. Depois, listar a Brevo em Suboperadores e na Política de Privacidade (`vitrine/src/components/Legal.tsx`). Guia em `docs/login-social.md`.
- **Google e Apple:** criar os IDs de cliente (a Apple exige conta Developer paga) e preencher `GOOGLE_CLIENT_IDS`, `APPLE_CLIENT_IDS` (Render) e `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, `EXPO_PUBLIC_APPLE_CLIENT_ID` (Vercel, projeto `rondo-app`).
- Revisão jurídica dos documentos, contratos de tratamento de dados com os fornecedores, origem das imagens das medalhas, fichas das lojas (`docs/lojas.md`).
- Criar uma conta real em produção para confirmar o cadastro de ponta a ponta.

Pendente, código:
- **Login social no celular** (iPhone e Android): precisa de `expo-apple-authentication` e do login do Google para React Native, com um build novo. A Apple exige "Entrar com a Apple" quando há login com Google.
- **Cobrança real** no gateway com webhook (`/assinaturas` grava como `pendente`).
- **Verificação dos profissionais** (`pendente` para `verificado`).
- **Fotos de perfil:** só aparecem para os outros depois de a pessoa salvar a foto pelo app logado (a foto sobe para o Storage nesse momento).
- O arrastar dos popups foi testado só com mouse no navegador; falta conferir com o toque real no celular.
- Para mais tráfego: plano pago no Render (o grátis dorme após 15 minutos) e conferir o limite de conexões do pooler do Supabase.
- A branch `yesteryou-main` do repositório pode ser apagada: `git push origin --delete yesteryou-main`.
