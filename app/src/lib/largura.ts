/* Computador: no navegador com janela larga, o app troca a barra de baixo por um menu lateral
   e, com mais espaço ainda, ganha uma coluna de resumo à direita. No celular nada muda. */
import { Platform, useWindowDimensions } from 'react-native';

export const LARGURA_MENU = 240;
export const LARGURA_PAINEL = 320;
const COM_MENU = 1024;
const COM_PAINEL = 1240;

export function useLayoutLargo(): { largo: boolean; comPainel: boolean } {
  const { width } = useWindowDimensions();
  const largo = Platform.OS === 'web' && width >= COM_MENU;
  return { largo, comPainel: largo && width >= COM_PAINEL };
}
