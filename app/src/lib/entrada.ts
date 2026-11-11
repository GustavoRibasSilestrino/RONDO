/* Como a pessoa chegou ao app. Vindo do site, o botão "Criar conta" ou "Entrar" traz `?conta=criar` ou `?conta=entrar` no
   endereço. Isso é lido uma vez, quando o app carrega, e vale para a visita inteira: o app pula a abertura (a tela preta com
   o nome RONDO) e a tela inicial, e abre direto a conversa com o RONDIN no modo pedido (telas/Login.tsx). */
import { Platform } from 'react-native';

export type ContaPedida = 'criar' | 'entrar' | null;

function ler(): ContaPedida {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const conta = new URLSearchParams(window.location.search).get('conta');
    return conta === 'criar' || conta === 'entrar' ? conta : null;
  } catch {
    return null;
  }
}

export const contaPedida: ContaPedida = ler();
