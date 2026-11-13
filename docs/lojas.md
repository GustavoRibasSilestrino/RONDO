# Fichas das lojas: privacidade

Respostas prontas para copiar no Google Play Console e no App Store Connect. Descrevem o app como ele é hoje
(sem análise, sem anúncios, sem rastreamento). Mudou o que o app coleta? Atualize aqui, na Política de Privacidade
(`vitrine/src/components/Legal.tsx`) e no manifesto do iOS (`app/app.json`, `ios.privacyManifests`).

## Links (as duas lojas)

| Campo | Valor |
|---|---|
| Política de Privacidade | https://userondo.vercel.app/privacidade |
| Termos de Uso | https://userondo.vercel.app/termos |
| Excluir conta (fora do app) | https://userondo.vercel.app/excluir-conta |
| E-mail de contato | rondooficial.dev@gmail.com |

No app, a exclusão fica em Configurações > Conta e segurança > Apagar conta.

## Google Play: Segurança dos dados

- O app coleta ou compartilha dados? **Sim, coleta.** Compartilha com terceiros? **Não** (os fornecedores de hospedagem tratam em nosso nome, o que não conta como compartilhamento).
- Os dados são criptografados em trânsito? **Sim** (HTTPS).
- O usuário pode pedir a exclusão? **Sim**: no app e em https://userondo.vercel.app/excluir-conta.

| Categoria do Play | Tipo | Coletado | Obrigatório? | Finalidade |
|---|---|---|---|---|
| Informações pessoais | Nome | Sim | Obrigatório | Funcionalidade do app, gerenciamento da conta |
| Informações pessoais | Endereço de e-mail | Sim | Obrigatório | Funcionalidade do app, gerenciamento da conta, comunicações (só com aceite) |
| Informações pessoais | IDs do usuário | Sim | Obrigatório | Funcionalidade do app, gerenciamento da conta |
| Informações pessoais | Outras informações (data de nascimento) | Sim | Obrigatório | Gerenciamento da conta (saber se precisa de responsável) |
| Saúde e condicionamento físico | Informações de saúde (peso, alimentação) | Sim | Obrigatório | Funcionalidade do app |
| Saúde e condicionamento físico | Informações de condicionamento físico (treinos) | Sim | Obrigatório | Funcionalidade do app |
| Fotos e vídeos | Fotos | Sim | Opcional | Funcionalidade do app (posts e stories) |
| Mensagens e conteúdo | Outro conteúdo gerado pelo usuário (posts, comentários) | Sim | Opcional | Funcionalidade do app |

Não coletado: localização, contatos, dados financeiros, histórico de navegação, IDs de publicidade, registros de falhas e diagnósticos.

Áudio dos recados de voz: **não é coletado** (fica só no aparelho, nunca vai para o servidor). O servidor guarda só a lista dos recados (a pergunta, a duração, as datas e a ordem da conversa).

"Olá Rondin" (chamar o RONDIN pela voz) existe **só na versão do navegador** (`userondo.vercel.app/app`), vem desligado e só liga se a pessoa aceitar. **Não existe no app das lojas**: ali o microfone é usado apenas para gravar as respostas do recado, a pedido da pessoa, e o áudio fica no aparelho. Se um dia a escuta chegar ao app (precisaria de um módulo nativo de reconhecimento de fala), isto muda: o reconhecimento pode enviar áudio a um serviço de fala (Apple ou Google), e aí é preciso declarar "Áudio" como coletado nos dois formulários, atualizar o manifesto de privacidade do iOS e a Política de Privacidade.

Público-alvo: o app aceita menores com autorização de um responsável. Se marcar faixas abaixo de 13 anos, o Google aplica a política "Famílias", que tem exigências próprias: confira antes de publicar.

## App Store: Privacidade do app (rótulos)

- Rastreamento: **Não**.
- Dados vinculados ao usuário, todos para **Funcionalidade do app**:
  - Informações de contato: nome, endereço de e-mail.
  - Saúde e condicionamento físico: saúde, condicionamento físico.
  - Conteúdo do usuário: fotos ou vídeos, outro conteúdo do usuário.
  - Identificadores: ID do usuário.
- Dados não coletados: localização, financeiros, contatos, histórico, uso, diagnóstico, compras.

O mesmo está declarado no manifesto de privacidade do iOS (`app/app.json` > `ios.privacyManifests`), junto com os
motivos de uso das APIs exigidas pela Apple (UserDefaults, horário de arquivos, tempo desde o boot e espaço em disco,
usadas pelo React Native e pelo Expo).

## Exclusão de conta

- No app: Configurações > Conta e segurança > Apagar conta (pede a senha).
- Na web, sem o app: https://userondo.vercel.app/excluir-conta.
- Por e-mail: rondooficial.dev@gmail.com, resposta em até 15 dias.
