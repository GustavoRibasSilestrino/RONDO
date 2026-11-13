/* O diário de recados: agrupa os áudios em conversas (as respostas de um mesmo dia ao RONDIN) e diz em que dias a pessoa gravou.
   Puro, sem dependências do app (conferido por scripts/testar-rondin.mjs). Recados antigos, de antes da conversa, não têm
   `grupo`: cada um é uma conversa de uma resposta só. */
import type { Recado } from '../tipos.ts';
import { iso } from './datas.ts';

export type Conversa = { id: string; dia: string; criado: number; itens: Recado[] };

/* as conversas, da mais nova para a mais antiga; dentro de cada uma, as respostas na ordem em que foram dadas */
export function agrupar(recados: Recado[]): Conversa[] {
  const mapa = new Map<string, Recado[]>();
  for (const r of recados) {
    const chave = r.grupo ?? r.id;
    const lista = mapa.get(chave);
    if (lista) lista.push(r); else mapa.set(chave, [r]);
  }
  return [...mapa.entries()]
    .map(([id, itens]) => {
      itens.sort((a, b) => (a.turno ?? 1) - (b.turno ?? 1) || a.criado - b.criado);
      return { id, dia: iso(new Date(itens[0].criado)), criado: itens[0].criado, itens };
    })
    .sort((a, b) => b.criado - a.criado);
}

/* os dias ("AAAA-MM-DD") em que houve pelo menos um recado */
export const diasComRecado = (recados: Recado[]): Set<string> => new Set(recados.map((r) => iso(new Date(r.criado))));

/* as conversas separadas por dia, do dia mais novo para o mais antigo */
export function porDia(conversas: Conversa[]): { dia: string; conversas: Conversa[] }[] {
  const dias = new Map<string, Conversa[]>();
  for (const c of conversas) {
    const lista = dias.get(c.dia);
    if (lista) lista.push(c); else dias.set(c.dia, [c]);
  }
  return [...dias.entries()].map(([dia, lista]) => ({ dia, conversas: lista })).sort((a, b) => (a.dia < b.dia ? 1 : -1));
}
