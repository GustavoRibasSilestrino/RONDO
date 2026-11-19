/* Criar conta e entrar acontecem só no app, na conversa com o RONDIN. O site apenas leva até lá: o `?conta=` diz em qual
   modo o app abre (o app lê isso em telas/Login.tsx e vai direto para o RONDIN, sem passar pela tela inicial). */
export const APP_CRIAR = "/app?conta=criar";
export const APP_ENTRAR = "/app?conta=entrar";
export const APP = "/app";
/* da loja para a tela do RONDIN do próprio site (components/Entrar.tsx): entra ou cria a conta e volta para a loja, sem ir
   para o app (pedido do dono em 2026-11-18) */
export const ENTRAR_LOJA = "/entrar?volta=loja";
export const CRIAR_LOJA = "/entrar?volta=loja&modo=criar";
