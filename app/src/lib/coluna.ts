/* Onde fica a coluna do conteúdo na janela (computador: entre o menu lateral e o painel da direita). O App.tsx mede e guarda; os
   painéis que sobem de baixo (componentes/Estrutura.tsx, Folha) se centralizam nela, alinhados com os textos de trás, e não na
   janela inteira (pedido do dono, 2026-11-18). No celular a coluna é a tela toda. */
import { useSyncExternalStore } from 'react';

export type Coluna = { x: number; w: number };
let coluna: Coluna | null = null;
const ouvintes = new Set<() => void>();

export function guardarColuna(c: Coluna): void {
  if (coluna && coluna.x === c.x && coluna.w === c.w) return;
  coluna = c;
  ouvintes.forEach((f) => f());
}

const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };
export const useColuna = (): Coluna | null => useSyncExternalStore(assinar, () => coluna, () => coluna);
