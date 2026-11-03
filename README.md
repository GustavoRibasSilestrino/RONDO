# Yesteryou

Compita com quem você foi ontem. Treino, dieta, constância, comunidade e profissionais verificados.

O repositório tem quatro peças:

- `vitrine/`: o site, em HTML, CSS e JS puros, sem build. É o que está no ar em https://yesteryou.vercel.app (projeto `yesteryou` na Vercel, pasta raiz `vitrine`). A assinatura e o cadastro de profissionais acontecem aqui.
- `app/`: o aplicativo, em React Native com Expo e TypeScript. Só entrada com a conta e a parte funcional: Hoje, Treino, Dieta, Evolução, Comunidade, Recado de voz e Perfil. A navegação é uma roda no pé da tela.
- `backend/`: Python + FastAPI. Por enquanto, as regras de treino (1RM); dieta, pontos, assinaturas, webhooks e IA entram aqui.
- `brand/`: o símbolo da marca, só a parte branca, com fundo transparente.

Ficam também `site/`, a primeira versão do site em React/Vite (sem uso no momento), e `index.html`, o protótipo visual do celular.

## Rodar

```bash
# site: qualquer servidor estático serve
cd vitrine && npx http-server -p 5180 -c-1 .

# app: QR code para o Expo Go; a = Android, i = iOS, w = navegador
cd app && npm install && npx expo start

# backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
```

## App

- **Entrar:** o app não tem cadastro. A conta e a assinatura são criadas no site; o app só entra com ela.
- **Modo demonstração:** sem `EXPO_PUBLIC_API_URL`, qualquer e-mail válido com senha de 6 ou mais caracteres entra. Os dados ficam só no aparelho, com um histórico de 10 semanas para as telas não começarem vazias. Com `EXPO_PUBLIC_API_URL=https://sua-api`, o login chama `POST /auth/login` e nenhum dado de demonstração é criado.
- **Regras:** as contas do produto estão em `app/src/lib/calc.ts`: força estimada (Epley), progressão dupla de carga, estagnação, meta calórica (Mifflin-St Jeor com piso de segurança), streak com uma folga por semana, pontos do ranking e a comparação "Você vs. Yesteryou".
- **Conferir o código:** `cd app && npm run typecheck`. Para ver no navegador: `npm run export:web` e servir a pasta `dist`.

Antes de publicar nas lojas:

- troque o identificador `br.com.yesteryou.app` em `app/app.json` pelo definitivo;
- guarde o token do login no `expo-secure-store` (há um `TODO` em `app/src/api/conta.ts`);
- troque os dados de demonstração de comunidade e ranking por dados da API.
