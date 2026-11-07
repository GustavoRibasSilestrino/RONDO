# E-mail da recuperação de senha e login com Google e Apple

O código está pronto e testado. Falta você criar as contas nos serviços abaixo e colar as chaves. Sem elas, a tela de **Esqueci a senha**
funciona, mas o e-mail não sai, e os botões do Google e da Apple não aparecem.

## 1. E-mail da recuperação de senha (Brevo, grátis)

O plano grátis do Render bloqueia SMTP, por isso o envio é por API HTTP.

1. Crie a conta em https://www.brevo.com (grátis: 300 e-mails por dia).
2. Em **Senders & IP > Senders**, adicione e confirme o e-mail que vai aparecer como remetente (ex.: `rondooficial.dev@gmail.com`).
3. Em **SMTP & API > API Keys**, crie uma chave.
4. No painel do Render, serviço `rondo-api`, em **Environment**, preencha:
   - `BREVO_API_KEY` = a chave
   - `EMAIL_REMETENTE` = o e-mail confirmado
5. Atualize a página **Suboperadores** do site (`vitrine/src/components/Legal.tsx`) e a Política de Privacidade: a Brevo passa a tratar o
   e-mail das pessoas que pedirem a recuperação de senha.

Como funciona: a pessoa digita o e-mail, recebe um código de 6 números (vale 15 minutos, 5 tentativas, uso único, no máximo 3 pedidos por
hora) e define a senha nova. O servidor responde igual exista a conta ou não. O código nunca é guardado, só o hash dele.

## 2. Entrar com Google

1. Em https://console.cloud.google.com, crie um projeto e configure a **tela de consentimento OAuth** (escopos: e-mail e perfil).
2. Em **Credenciais > Criar credenciais > ID do cliente OAuth**, tipo **Aplicativo da Web**.
   - Origens JavaScript autorizadas: `https://userondo.vercel.app`
3. Copie o **ID do cliente** e use em dois lugares:
   - Render: `GOOGLE_CLIENT_IDS` = o ID (para o app de celular, some os IDs de iOS e Android, separados por vírgula).
   - Vercel, projeto `rondo-app`: `EXPO_PUBLIC_GOOGLE_CLIENT_ID` = o ID. Depois, publique o app de novo.

## 3. Entrar com a Apple

Exige a conta Apple Developer (US$ 99 por ano).

1. Em https://developer.apple.com > Identifiers, crie um **Services ID** (ex.: `br.rondo.web`) com **Sign in with Apple** ativo.
   - Domínio: `userondo.vercel.app`, Return URL: `https://userondo.vercel.app/app/`
2. Use o Services ID em dois lugares:
   - Render: `APPLE_CLIENT_IDS` = o Services ID (e, no app de iPhone, o Bundle ID, separados por vírgula).
   - Vercel, projeto `rondo-app`: `EXPO_PUBLIC_APPLE_CLIENT_ID` = o Services ID. Publique o app de novo.

## O que ainda não existe: login social no celular

Os botões funcionam **no navegador** (o app web em `userondo.vercel.app/app`). No app de iPhone e Android, o login social usa bibliotecas
nativas (`expo-apple-authentication` e o login do Google para React Native), que exigem um novo build com as contas acima. Isso fica para
quando o app for para as lojas. A Apple exige "Entrar com a Apple" em todo app de iPhone que oferece login com Google.

## Como o login social funciona por dentro

- O provedor entrega um `id_token`. O servidor confere a assinatura com as chaves públicas do provedor, o emissor, o público e o prazo
  (`backend/app/servicos/login_social.py`) e só aceita e-mail confirmado pelo provedor.
- Quem já tem conta com aquele e-mail entra direto. Quem é novo faz uma segunda etapa curta, com a data de nascimento e o aceite dos
  Termos e da Política (menores de 18 anos precisam do responsável), igual ao cadastro comum.
- A conta criada assim não tem senha. Se a pessoa quiser uma, usa **Esqueci a senha**.
