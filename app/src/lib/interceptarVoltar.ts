/* O botão voltar do Android passa primeiro por aqui: a tela do recado pode segurá-lo para perguntar antes de perder respostas
   ainda não guardadas (telas/Recado.tsx). Só uma tela segura por vez. */
let interceptador: (() => boolean) | null = null;

export function definirInterceptadorVoltar(f: (() => boolean) | null): void { interceptador = f; }

/* true se a tela aberta tratou o toque (o app não deve voltar sozinho) */
export const voltarInterceptado = (): boolean => (interceptador ? interceptador() : false);
