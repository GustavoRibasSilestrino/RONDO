/* Exercícios que dá para fazer sozinho, em casa ou ao ar livre, sem aparelho: só o peso do corpo (ou uma cadeira, uma mesa, uma mochila).
   Carga 0 kg quer dizer "só o peso do corpo". Aparecem no editor de treino (Criar treino > Criar no app) e nos treinos prontos. */
import type { Exercicio } from '../dados';
import type { GrupoMuscular } from './musculos';

type Base = { nome: string; series: number; faixa: [number, number] };

export const GRUPOS_SEM_APARELHO: { grupo: string; itens: Base[] }[] = [
  {
    grupo: 'Pernas e glúteos',
    itens: [
      { nome: 'Agachamento livre', series: 4, faixa: [15, 20] },
      { nome: 'Agachamento sumô', series: 3, faixa: [15, 20] },
      { nome: 'Afundo (cada perna)', series: 3, faixa: [10, 12] },
      { nome: 'Agachamento búlgaro na cadeira', series: 3, faixa: [8, 12] },
      { nome: 'Ponte de glúteo', series: 3, faixa: [15, 20] },
      { nome: 'Panturrilha em pé', series: 4, faixa: [15, 25] },
    ],
  },
  {
    grupo: 'Peito, ombros e tríceps',
    itens: [
      { nome: 'Flexão de braço', series: 3, faixa: [8, 15] },
      { nome: 'Flexão com os joelhos no chão', series: 3, faixa: [10, 15] },
      { nome: 'Flexão diamante', series: 3, faixa: [6, 12] },
      { nome: 'Flexão pike (ombros)', series: 3, faixa: [6, 10] },
      { nome: 'Mergulho na cadeira (tríceps)', series: 3, faixa: [8, 12] },
    ],
  },
  {
    grupo: 'Costas',
    itens: [
      { nome: 'Remada invertida na mesa', series: 3, faixa: [6, 10] },
      { nome: 'Remada com mochila', series: 3, faixa: [10, 15] },
      { nome: 'Superman no chão', series: 3, faixa: [12, 15] },
    ],
  },
  {
    grupo: 'Abdômen e core',
    itens: [
      { nome: 'Abdominal', series: 3, faixa: [15, 25] },
      { nome: 'Prancha (segundos)', series: 3, faixa: [30, 60] },
      { nome: 'Prancha lateral (segundos)', series: 3, faixa: [20, 40] },
      { nome: 'Elevação de pernas', series: 3, faixa: [10, 15] },
      { nome: 'Bicicleta no ar', series: 3, faixa: [20, 30] },
      { nome: 'Escalador (mountain climber)', series: 3, faixa: [20, 30] },
    ],
  },
  {
    grupo: 'Corpo todo e cardio',
    itens: [
      { nome: 'Polichinelo', series: 3, faixa: [30, 50] },
      { nome: 'Burpee', series: 3, faixa: [8, 12] },
      { nome: 'Agachamento com salto', series: 3, faixa: [10, 15] },
      { nome: 'Corrida parada (segundos)', series: 3, faixa: [30, 60] },
    ],
  },
];

let seq = 0;
/* um exercício pronto para entrar no editor: id novo, carga 0 (só o peso do corpo) */
export function exercicioSemAparelho(b: Base): Exercicio {
  return { id: `h${Date.now().toString(36)}${(seq++).toString(36)}`, nome: b.nome, series: b.series, faixa: b.faixa, passo: 1, inicial: 0 };
}

const achar = (nome: string): Base => {
  for (const g of GRUPOS_SEM_APARELHO) {
    const x = g.itens.find((i) => i.nome === nome);
    if (x) return x;
  }
  throw new Error(`Exercício sem aparelho desconhecido: ${nome}`);
};

/* treinos completos para quem treina em casa: a pessoa abre no editor, confere e salva */
export const TREINOS_EM_CASA: { nome: string; sub: string; musculos: GrupoMuscular[]; exercicios: string[] }[] = [
  {
    nome: 'Corpo todo em casa', sub: '6 exercícios, uns 35 min', musculos: ['peito', 'triceps', 'dorsal', 'quadriceps', 'panturrilha'],
    exercicios: ['Agachamento livre', 'Flexão de braço', 'Afundo (cada perna)', 'Remada invertida na mesa', 'Prancha (segundos)', 'Polichinelo'],
  },
  {
    nome: 'Pernas e glúteos em casa', sub: '5 exercícios, uns 30 min', musculos: ['quadriceps', 'panturrilha'],
    exercicios: ['Agachamento livre', 'Afundo (cada perna)', 'Ponte de glúteo', 'Agachamento búlgaro na cadeira', 'Panturrilha em pé'],
  },
  {
    nome: 'Peito e braços em casa', sub: '5 exercícios, uns 30 min', musculos: ['peito', 'triceps'],
    exercicios: ['Flexão de braço', 'Flexão diamante', 'Mergulho na cadeira (tríceps)', 'Flexão pike (ombros)', 'Flexão com os joelhos no chão'],
  },
  {
    nome: 'Abdômen e core em casa', sub: '5 exercícios, uns 20 min', musculos: [],
    exercicios: ['Abdominal', 'Prancha (segundos)', 'Elevação de pernas', 'Bicicleta no ar', 'Escalador (mountain climber)'],
  },
];

export const montarTreinoEmCasa = (i: number): { nome: string; musculos: GrupoMuscular[]; exercicios: Exercicio[] } => {
  const t = TREINOS_EM_CASA[i];
  return { nome: t.nome, musculos: t.musculos, exercicios: t.exercicios.map((n) => exercicioSemAparelho(achar(n))) };
};
