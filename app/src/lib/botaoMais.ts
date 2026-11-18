/* Esconder o + do canto (componentes/BotaoMais.tsx) enquanto outra ação ocupa o pé da tela: a lixeira dos treinos (2026-11-17).
   Quem esconde chama esconderBotaoMais(true) e, ao terminar, esconderBotaoMais(false); o + lê pelo useBotaoMaisEscondido. */
import { useSyncExternalStore } from 'react';

let escondido = false;
const ouvintes = new Set<() => void>();

export function esconderBotaoMais(valor: boolean): void {
  if (valor === escondido) return;
  escondido = valor;
  ouvintes.forEach((f) => f());
}

const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };
export const useBotaoMaisEscondido = (): boolean => useSyncExternalStore(assinar, () => escondido, () => escondido);

/* onde o + está na janela (x, y, largura, altura), medido por ele mesmo: o menu do + (componentes/MenuMais.tsx) abre logo acima
   dele, em qualquer tamanho de tela (no computador o + fica na coluna do meio, não no canto da janela) */
export type Retangulo = { x: number; y: number; w: number; h: number };
let posicao: Retangulo | null = null;
export const guardarPosicaoMais = (r: Retangulo): void => { posicao = r; };
export const posicaoMais = (): Retangulo | null => posicao;
