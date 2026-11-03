# Yesteryou

Monorepo com três peças que falam com a mesma API:

- `backend/`: Python + FastAPI + PostgreSQL. Regras de treino, dieta, pontos, assinaturas, webhooks e IA.
- `app/`: React Native com Expo. Hoje, Treino, Dieta, Comunidade.
- `site/`: React (Vite ou Next.js). Vitrine, assinaturas e cadastro de profissionais.
- `index.html`: protótipo visual navegável.

## Rodar

```bash
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
cd app && npx expo start
cd site && npm run dev
```
