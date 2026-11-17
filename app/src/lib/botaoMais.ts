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
