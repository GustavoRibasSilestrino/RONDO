/* Medalhas de conquista, agrupadas em coleções. Cada medalha é a recompensa de uma missão: um número a alcançar
   (treinos, dias seguidos, carga, publicações...). Ao chegar na meta, a missão se cumpre e a medalha abre. */
import type { ImageSourcePropType } from 'react-native';
import type { Estado } from '../tipos';
import { streakAtual } from './calc';
import { nivelDe, xpTotal } from './nivel';

export type Medalha = {
  id: string;
  colecao: string;
  nome: string;
  desc: string;                                    // a missão, em uma frase
  img: ImageSourcePropType;
  meta: number;
  valor: (e: Estado, hoje: Date) => number;
  mostrar?: (n: number) => string;                 // como escrever o número (ex.: "92 kg"); por padrão, o inteiro
};

export const COLECOES = [
  { id: 'treino', nome: 'Treino' },
  { id: 'constancia', nome: 'Constância' },
  { id: 'corpo', nome: 'Força e corpo' },
  { id: 'comunidade', nome: 'Comunidade' },
  { id: 'niveis', nome: 'Níveis' },
] as const;

const cheersDados = (e: Estado) => Object.values(e.curtidas).filter(Boolean).length;
const seguindoN = (e: Estado) => Object.values(e.seguindo).filter(Boolean).length;
const nivel = (e: Estado) => nivelDe(xpTotal(e));
const treinos = (e: Estado) => e.treinos.length;
const diasDeTreino = (e: Estado) => new Set(e.treinos.map((t) => t.data)).size;
const checkins = (e: Estado) => Object.values(e.checkins).filter(Boolean).length;
const rotinas = (e: Estado) => new Set(e.treinos.map((t) => t.rotina)).size;
const volume = (e: Estado) => Math.round(e.treinos.reduce((s, t) => s + t.exercicios.reduce((a, x) => a + x.series.reduce((b, y) => b + y.kg * y.reps, 0), 0), 0));
const cargaMax = (e: Estado) => e.treinos.reduce((m, t) => Math.max(m, ...t.exercicios.flatMap((x) => x.series.map((y) => y.kg)), 0), 0);
const minutosMax = (e: Estado) => Math.round(e.treinos.reduce((m, t) => Math.max(m, (t.fim - t.inicio) / 60000), 0));
const treinoEComida = (e: Estado) => new Set(e.treinos.map((t) => t.data).filter((d) => (e.refeicoes[d] ?? []).length >= 3)).size;

/* recorde de carga: a maior carga de um exercício passou a anterior (a primeira vez que se faz um exercício não conta) */
function recordes(e: Estado): number {
  const melhor: Record<string, number> = {};
  let n = 0;
  for (const t of [...e.treinos].sort((a, b) => a.inicio - b.inicio)) {
    for (const x of t.exercicios) {
      const m = Math.max(0, ...x.series.map((s) => s.kg));
      if (x.id in melhor && m > melhor[x.id]) n++;
      melhor[x.id] = Math.max(melhor[x.id] ?? 0, m);
    }
  }
  return n;
}

const kg = (n: number) => `${n.toLocaleString('pt-BR')} kg`;
const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;
const A = (nome: string): ImageSourcePropType => ASSETS[nome];

/* o bundler exige caminhos fixos: um mapa de require */
const ASSETS: Record<string, ImageSourcePropType> = {
  'first-gym': require('../../assets/medalhas/first-gym.png'),
  'week-warrior': require('../../assets/medalhas/week-warrior.png'),
  'focused': require('../../assets/medalhas/focused.png'),
  'top-performer': require('../../assets/medalhas/top-performer.png'),
  'gym-legend': require('../../assets/medalhas/gym-legend.png'),
  'on-fire': require('../../assets/medalhas/on-fire.png'),
  'consistent': require('../../assets/medalhas/consistent.png'),
  'long-run': require('../../assets/medalhas/long-run.png'),
  'consistent-30': require('../../assets/medalhas/consistent-30.png'),
  'dedicated': require('../../assets/medalhas/dedicated.png'),
  'on-fire-180': require('../../assets/medalhas/on-fire-180.png'),
  'discipline': require('../../assets/medalhas/discipline.png'),
  'new-pr': require('../../assets/medalhas/new-pr.png'),
  'stronger': require('../../assets/medalhas/stronger.png'),
  'lifter': require('../../assets/medalhas/lifter.png'),
  'pr-breaker': require('../../assets/medalhas/pr-breaker.png'),
  'progress': require('../../assets/medalhas/progress.png'),
  'endurance': require('../../assets/medalhas/endurance.png'),
  'all-rounder': require('../../assets/medalhas/all-rounder.png'),
  'balanced': require('../../assets/medalhas/balanced.png'),
  'challenge-accepted': require('../../assets/medalhas/challenge-accepted.png'),
  'got-a-pulse': require('../../assets/medalhas/got-a-pulse.png'),
  'social-beast': require('../../assets/medalhas/social-beast.png'),
  'community': require('../../assets/medalhas/community.png'),
  'higher': require('../../assets/medalhas/higher.png'),
  'top-10': require('../../assets/medalhas/top-10.png'),
  'fitness-star': require('../../assets/medalhas/fitness-star.png'),
  'legend': require('../../assets/medalhas/legend.png'),
};

export const MEDALHAS: Medalha[] = [
  { id: 't1', colecao: 'treino', nome: 'Primeira academia', desc: 'Complete o seu primeiro treino.', img: A('first-gym'), meta: 1, valor: treinos },
  { id: 't10', colecao: 'treino', nome: 'Guerreiro da semana', desc: 'Complete 10 treinos.', img: A('week-warrior'), meta: 10, valor: treinos },
  { id: 't50', colecao: 'treino', nome: 'Focado', desc: 'Complete 50 treinos.', img: A('focused'), meta: 50, valor: treinos },
  { id: 't75', colecao: 'treino', nome: 'Alto desempenho', desc: 'Complete 75 treinos.', img: A('top-performer'), meta: 75, valor: treinos },
  { id: 't100', colecao: 'treino', nome: 'Lenda da academia', desc: 'Chegue a 100 treinos.', img: A('gym-legend'), meta: 100, valor: treinos },

  { id: 's7', colecao: 'constancia', nome: 'Em chamas', desc: 'Mantenha uma sequência de 7 dias.', img: A('on-fire'), meta: 7, valor: (e, h) => streakAtual(e, h), mostrar: dias },
  { id: 's30', colecao: 'constancia', nome: 'Constante', desc: 'Mantenha uma sequência de 30 dias.', img: A('consistent'), meta: 30, valor: (e, h) => streakAtual(e, h), mostrar: dias },
  { id: 's60', colecao: 'constancia', nome: 'Fôlego longo', desc: 'Mantenha uma sequência de 60 dias.', img: A('long-run'), meta: 60, valor: (e, h) => streakAtual(e, h), mostrar: dias },
  { id: 'd30', colecao: 'constancia', nome: 'Treino em dia', desc: 'Treine em 30 dias diferentes.', img: A('consistent-30'), meta: 30, valor: diasDeTreino, mostrar: dias },
  { id: 'd90', colecao: 'constancia', nome: 'Dedicado', desc: 'Treine em 90 dias diferentes.', img: A('dedicated'), meta: 90, valor: diasDeTreino, mostrar: dias },
  { id: 'd180', colecao: 'constancia', nome: 'Fogo de 180', desc: 'Treine em 180 dias diferentes.', img: A('on-fire-180'), meta: 180, valor: diasDeTreino, mostrar: dias },
  { id: 'ck30', colecao: 'constancia', nome: 'Disciplina', desc: 'Faça check-in em 30 dias.', img: A('discipline'), meta: 30, valor: checkins, mostrar: dias },
  { id: 'rec', colecao: 'constancia', nome: 'Voz do futuro', desc: 'Guarde um recado de voz para o seu eu do futuro.', img: A('new-pr'), meta: 1, valor: (e) => e.recados.length },

  { id: 'v1000', colecao: 'corpo', nome: 'Mais forte', desc: 'Levante 1.000 kg no total.', img: A('stronger'), meta: 1000, valor: volume, mostrar: kg },
  { id: 'c100', colecao: 'corpo', nome: 'Levantador', desc: 'Levante 100 kg em uma série.', img: A('lifter'), meta: 100, valor: cargaMax, mostrar: kg },
  { id: 'pr1', colecao: 'corpo', nome: 'Quebra-recordes', desc: 'Bata o seu recorde de carga em um exercício.', img: A('pr-breaker'), meta: 1, valor: recordes },
  { id: 'pr5', colecao: 'corpo', nome: 'Em evolução', desc: 'Bata 5 recordes de carga.', img: A('progress'), meta: 5, valor: recordes },
  { id: 'min90', colecao: 'corpo', nome: 'Resistência', desc: 'Faça um treino de 90 minutos.', img: A('endurance'), meta: 90, valor: minutosMax, mostrar: (n) => `${n} min` },
  { id: 'rot3', colecao: 'corpo', nome: 'Completo', desc: 'Treine 3 rotinas diferentes.', img: A('all-rounder'), meta: 3, valor: rotinas },
  { id: 'eq7', colecao: 'corpo', nome: 'Equilíbrio', desc: 'Treine e registre 3 refeições no mesmo dia, 7 vezes.', img: A('balanced'), meta: 7, valor: treinoEComida },

  { id: 'p1', colecao: 'comunidade', nome: 'Desafio aceito', desc: 'Publique na comunidade.', img: A('challenge-accepted'), meta: 1, valor: (e) => e.posts.length },
  { id: 'c10', colecao: 'comunidade', nome: 'Torcedor', desc: 'Dê cheers em 10 publicações.', img: A('got-a-pulse'), meta: 10, valor: cheersDados },
  { id: 'f5', colecao: 'comunidade', nome: 'Conectado', desc: 'Siga 5 pessoas.', img: A('social-beast'), meta: 5, valor: seguindoN },
  { id: 'g1', colecao: 'comunidade', nome: 'Fundador', desc: 'Crie um grupo.', img: A('community'), meta: 1, valor: (e) => e.grupos.length },

  { id: 'l3', colecao: 'niveis', nome: 'Mais alto', desc: 'Chegue ao nível 3.', img: A('higher'), meta: 3, valor: nivel },
  { id: 'l5', colecao: 'niveis', nome: 'Top 10', desc: 'Chegue ao nível 5.', img: A('top-10'), meta: 5, valor: nivel },
  { id: 'l7', colecao: 'niveis', nome: 'Estrela fitness', desc: 'Chegue ao nível 7.', img: A('fitness-star'), meta: 7, valor: nivel },
  { id: 'l10', colecao: 'niveis', nome: 'Lenda', desc: 'Chegue ao nível 10.', img: A('legend'), meta: 10, valor: nivel },
];

export type MedalhaVista = Medalha & { atual: number; aberta: boolean };

export function medalhasDe(e: Estado, hoje: Date): MedalhaVista[] {
  return MEDALHAS.map((m) => {
    const atual = Math.min(m.meta, m.valor(e, hoje));
    return { ...m, atual, aberta: atual >= m.meta };
  });
}

/* as missões em andamento, da mais perto de cumprir para a mais longe */
export const emAndamento = (v: MedalhaVista[]): MedalhaVista[] => v.filter((m) => !m.aberta).sort((a, b) => b.atual / b.meta - a.atual / a.meta);

export const textoValor = (m: Medalha, n: number): string => (m.mostrar ? m.mostrar(n) : String(n));
