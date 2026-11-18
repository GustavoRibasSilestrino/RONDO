/* As refeições da pessoa (pedido do dono, 2026-11-18): começam com as quatro de sempre (dados.ts) e ela pode renomear, criar (uma
   ceia, um pré-treino...) e excluir. Ficam na conta (estado.refeicoesConfig). */
import { REFEICOES } from '../dados';
import type { Estado } from '../tipos';

export type ItemRefeicao = { id: string; nome: string };
export const refeicoesDe = (e: Pick<Estado, 'refeicoesConfig'>): ItemRefeicao[] => (e.refeicoesConfig?.length ? e.refeicoesConfig : REFEICOES);
