/* Criar conta e entrar acontecem só no app, na conversa com o RONDIN. O site apenas leva até lá: o `?conta=` diz em qual
   modo o app abre (o app lê isso em telas/Login.tsx e vai direto para o RONDIN, sem passar pela tela inicial). */
export const APP_CRIAR = "/app?conta=criar";
export const APP_ENTRAR = "/app?conta=entrar";
