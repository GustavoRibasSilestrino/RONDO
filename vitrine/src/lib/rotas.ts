/* Criar conta e entrar acontecem só no app, na conversa com o RONDIN. O site apenas leva até lá: o `?conta=` diz em qual
   modo o app abre (o app lê isso em telas/Login.tsx e vai direto para o RONDIN, sem passar pela tela inicial). */
export const APP_CRIAR = "/app?conta=criar";
export const APP_ENTRAR = "/app?conta=entrar";
export const APP = "/app";
/* da loja para o app e de volta: com `volta=loja`, depois de entrar ou criar a conta o app traz a pessoa de volta à loja
   (app/src/lib/entrada.ts e App.tsx), já com a conta para comprar */
export const APP_CRIAR_LOJA = "/app?conta=criar&volta=loja";
export const APP_ENTRAR_LOJA = "/app?conta=entrar&volta=loja";
