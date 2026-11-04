/* Medalhas de conquista, agrupadas em coleções. Cada uma mede um número (treinos, dias seguidos, publicações...) e abre ao chegar na meta. */
import type { NomeIcone } from '../componentes/Icone';
import type { Estado } from '../tipos';
import { streakAtual } from './calc';
import { nivelDe, xpTotal } from './nivel';

export type Medalha = { id: string; colecao: string; nome: string; desc: string; icone: NomeIcone; meta: number; valor: (e: Estado, hoje: Date) => number };

/* `cor` é a posição em CORES_GRUPO (lib/grupos.ts) */
export const COLECOES = [
  { id: 'treino', nome: 'Treino', cor: 0 },
  { id: 'constancia', nome: 'Constância', cor: 1 },
  { id: 'nutricao', nome: 'Nutrição', cor: 3 },
  { id: 'comunidade', nome: 'Comunidade', cor: 4 },
  { id: 'niveis', nome: 'Níveis', cor: 2 },
] as const;

const diasComRefeicoes = (e: Estado) => Object.values(e.refeicoes).filter((l) => l.length >= 3).length;
const diasDeAgua = (e: Estado) => Object.values(e.agua).filter((n) => n >= 8).length;
const cheersDados = (e: Estado) => Object.values(e.curtidas).filter(Boolean).length;
const seguindoN = (e: Estado) => Object.values(e.seguindo).filter(Boolean).length;
const nivel = (e: Estado) => nivelDe(xpTotal(e));

export const MEDALHAS: Medalha[] = [
  { id: 't1', colecao: 'treino', nome: 'Primeiro treino', desc: 'Registre o seu primeiro treino.', icone: 'treino', meta: 1, valor: (e) => e.treinos.length },
  { id: 't10', colecao: 'treino', nome: 'Dez treinos', desc: 'Registre 10 treinos.', icone: 'treino', meta: 10, valor: (e) => e.treinos.length },
  { id: 't50', colecao: 'treino', nome: 'Meio centenário', desc: 'Registre 50 treinos.', icone: 'treino', meta: 50, valor: (e) => e.treinos.length },
  { id: 't100', colecao: 'treino', nome: 'Cem treinos', desc: 'Registre 100 treinos.', icone: 'trofeu', meta: 100, valor: (e) => e.treinos.length },

  { id: 's7', colecao: 'constancia', nome: 'Semana viva', desc: 'Mantenha uma sequência de 7 dias.', icone: 'chama', meta: 7, valor: (e, h) => streakAtual(e, h) },
  { id: 's30', colecao: 'constancia', nome: 'Mês sem quebrar', desc: 'Mantenha uma sequência de 30 dias.', icone: 'chama', meta: 30, valor: (e, h) => streakAtual(e, h) },
  { id: 's60', colecao: 'constancia', nome: 'Dois meses', desc: 'Mantenha uma sequência de 60 dias.', icone: 'trofeu', meta: 60, valor: (e, h) => streakAtual(e, h) },
  { id: 'rec', colecao: 'constancia', nome: 'Voz do futuro', desc: 'Guarde um recado de voz para o seu eu do futuro.', icone: 'recado', meta: 1, valor: (e) => e.recados.length },

  { id: 'n7', colecao: 'nutricao', nome: 'Semana de refeições', desc: 'Registre 3 refeições ou mais em 7 dias.', icone: 'dieta', meta: 7, valor: diasComRefeicoes },
  { id: 'n30', colecao: 'nutricao', nome: 'Mestre das refeições', desc: 'Registre 3 refeições ou mais em 30 dias.', icone: 'dieta', meta: 30, valor: diasComRefeicoes },
  { id: 'a7', colecao: 'nutricao', nome: 'Hidratado', desc: 'Bata a meta de água em 7 dias.', icone: 'gota', meta: 7, valor: diasDeAgua },
  { id: 'a30', colecao: 'nutricao', nome: 'Fonte', desc: 'Bata a meta de água em 30 dias.', icone: 'gota', meta: 30, valor: diasDeAgua },

  { id: 'p1', colecao: 'comunidade', nome: 'Primeira publicação', desc: 'Publique na comunidade.', icone: 'comentario', meta: 1, valor: (e) => e.posts.length },
  { id: 'p10', colecao: 'comunidade', nome: 'Voz da comunidade', desc: 'Faça 10 publicações.', icone: 'comentario', meta: 10, valor: (e) => e.posts.length },
  { id: 'c10', colecao: 'comunidade', nome: 'Torcedor', desc: 'Dê cheers em 10 publicações.', icone: 'cheers', meta: 10, valor: cheersDados },
  { id: 'f5', colecao: 'comunidade', nome: 'Conectado', desc: 'Siga 5 pessoas.', icone: 'convidar', meta: 5, valor: seguindoN },
  { id: 'g1', colecao: 'comunidade', nome: 'Fundador', desc: 'Crie um grupo.', icone: 'grupo', meta: 1, valor: (e) => e.grupos.length },

  { id: 'l3', colecao: 'niveis', nome: 'Nível 3', desc: 'Chegue ao nível 3.', icone: 'medalha', meta: 3, valor: nivel },
  { id: 'l5', colecao: 'niveis', nome: 'Nível 5', desc: 'Chegue ao nível 5.', icone: 'medalha', meta: 5, valor: nivel },
  { id: 'l10', colecao: 'niveis', nome: 'Nível 10', desc: 'Chegue ao nível 10.', icone: 'trofeu', meta: 10, valor: nivel },
];

export type MedalhaVista = Medalha & { atual: number; aberta: boolean };

export function medalhasDe(e: Estado, hoje: Date): MedalhaVista[] {
  return MEDALHAS.map((m) => {
    const atual = Math.min(m.meta, m.valor(e, hoje));
    return { ...m, atual, aberta: atual >= m.meta };
  });
}
