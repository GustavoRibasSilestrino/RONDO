/* Computador: no navegador com janela larga, o app troca a barra de baixo por um menu lateral
   e, com mais espaço ainda, ganha uma coluna de resumo à direita. No celular nada muda. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

export const LARGURA_MENU = 248;
export const LARGURA_MENU_FECHADO = 72;
export const LARGURA_PAINEL = 320;
const COM_MENU = 1024;
const COM_PAINEL = 1240;

export function useLayoutLargo(): { largo: boolean; comPainel: boolean } {
  const { width } = useWindowDimensions();
  const largo = Platform.OS === 'web' && width >= COM_MENU;
  return { largo, comPainel: largo && width >= COM_PAINEL };
}

/* o menu aberto ou fechado (hambúrguer): a escolha fica guardada neste aparelho */
const CHAVE_MENU = 'yy.menu.recolhido';
export function useMenuRecolhido(): [boolean, () => void] {
  const [recolhido, setRecolhido] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(CHAVE_MENU).then((v) => { if (v === '1') setRecolhido(true); }).catch(() => {});
  }, []);
  const alternar = useCallback(() => {
    setRecolhido((r) => {
      AsyncStorage.setItem(CHAVE_MENU, r ? '0' : '1').catch(() => {});
      return !r;
    });
  }, []);
  return [recolhido, alternar];
}
