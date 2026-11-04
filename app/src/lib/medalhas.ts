/* Medalhas de conquista, agrupadas em coleções. Cada medalha é a recompensa de uma missão: um número a alcançar
   (treinos, dias seguidos, carga, publicações...). Ao chegar na meta, a missão se cumpre e a medalha abre. */
import type { ImageSourcePropType } from 'react-native';
import type { Estado } from '../tipos';
import { streakAtual } from './calc';

export type Medalha = {
  id: string;
  colecao: string;
  nome: string;
  desc: string;                                    // a missão, em uma frase
  img: ImageSourcePropType;                        // a frente da medalha (3D)
  verso: ImageSourcePropType;                      // o verso: liso, só com o símbolo da KORA
  meta: number;
  valor: (e: Estado, hoje: Date) => number;
  mostrar?: (n: number) => string;                 // como escrever o número (ex.: "92 kg"); por padrão, o inteiro
};

export const COLECOES = [
  { id: 'treino', nome: 'Treino' },
  { id: 'constancia', nome: 'Constância' },
  { id: 'corpo', nome: 'Força e corpo' },
  { id: 'comunidade', nome: 'Comunidade' },
] as const;

const cheersDados = (e: Estado) => Object.values(e.curtidas).filter(Boolean).length;
const seguindoN = (e: Estado) => Object.values(e.seguindo).filter(Boolean).length;
const treinos = (e: Estado) => e.treinos.length;
const diasDeTreino = (e: Estado) => new Set(e.treinos.map((t) => t.data)).size;
const checkins = (e: Estado) => Object.values(e.checkins).filter(Boolean).length;
const volume = (e: Estado) => Math.round(e.treinos.reduce((s, t) => s + t.exercicios.reduce((a, x) => a + x.series.reduce((b, y) => b + y.kg * y.reps, 0), 0), 0));
const cargaMax = (e: Estado) => e.treinos.reduce((m, t) => Math.max(m, ...t.exercicios.flatMap((x) => x.series.map((y) => y.kg)), 0), 0);
const minutosMax = (e: Estado) => Math.round(e.treinos.reduce((m, t) => Math.max(m, (t.fim - t.inicio) / 60000), 0));

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

/* o bundler exige caminhos fixos: um mapa de require (frente e verso de cada medalha) */
const ASSETS: Record<string, { frente: ImageSourcePropType; verso: ImageSourcePropType }> = {
  'first-gym': { frente: require('../../assets/medalhas3d/first-gym.png'), verso: require('../../assets/medalhas3d/first-gym-verso.png') },
  'week-warrior': { frente: require('../../assets/medalhas3d/week-warrior.png'), verso: require('../../assets/medalhas3d/week-warrior-verso.png') },
  'first-run': { frente: require('../../assets/medalhas3d/first-run.png'), verso: require('../../assets/medalhas3d/first-run-verso.png') },
  'top-performer': { frente: require('../../assets/medalhas3d/top-performer.png'), verso: require('../../assets/medalhas3d/top-performer-verso.png') },
  'cem-treinos': { frente: require('../../assets/medalhas3d/cem-treinos.png'), verso: require('../../assets/medalhas3d/cem-treinos-verso.png') },
  'on-fire': { frente: require('../../assets/medalhas3d/on-fire.png'), verso: require('../../assets/medalhas3d/on-fire-verso.png') },
  'consistent': { frente: require('../../assets/medalhas3d/consistent.png'), verso: require('../../assets/medalhas3d/consistent-verso.png') },
  'higher': { frente: require('../../assets/medalhas3d/higher.png'), verso: require('../../assets/medalhas3d/higher-verso.png') },
  'sub30': { frente: require('../../assets/medalhas3d/sub30.png'), verso: require('../../assets/medalhas3d/sub30-verso.png') },
  'distance-legend': { frente: require('../../assets/medalhas3d/distance-legend.png'), verso: require('../../assets/medalhas3d/distance-legend-verso.png') },
  'on-fire-2': { frente: require('../../assets/medalhas3d/on-fire-2.png'), verso: require('../../assets/medalhas3d/on-fire-2-verso.png') },
  'discipline': { frente: require('../../assets/medalhas3d/discipline.png'), verso: require('../../assets/medalhas3d/discipline-verso.png') },
  'speedster': { frente: require('../../assets/medalhas3d/speedster.png'), verso: require('../../assets/medalhas3d/speedster-verso.png') },
  'stronger': { frente: require('../../assets/medalhas3d/stronger.png'), verso: require('../../assets/medalhas3d/stronger-verso.png') },
  'stronger-arm': { frente: require('../../assets/medalhas3d/stronger-arm.png'), verso: require('../../assets/medalhas3d/stronger-arm-verso.png') },
  'pr': { frente: require('../../assets/medalhas3d/pr.png'), verso: require('../../assets/medalhas3d/pr-verso.png') },
  'evolution': { frente: require('../../assets/medalhas3d/evolution.png'), verso: require('../../assets/medalhas3d/evolution-verso.png') },
  'long-run': { frente: require('../../assets/medalhas3d/long-run.png'), verso: require('../../assets/medalhas3d/long-run-verso.png') },
  'challenge-accepted': { frente: require('../../assets/medalhas3d/challenge-accepted.png'), verso: require('../../assets/medalhas3d/challenge-accepted-verso.png') },
  'got-a-pulse': { frente: require('../../assets/medalhas3d/got-a-pulse.png'), verso: require('../../assets/medalhas3d/got-a-pulse-verso.png') },
  'social-beast': { frente: require('../../assets/medalhas3d/social-beast.png'), verso: require('../../assets/medalhas3d/social-beast-verso.png') },
  'community': { frente: require('../../assets/medalhas3d/community.png'), verso: require('../../assets/medalhas3d/community-verso.png') },
};

export const MEDALHAS: Medalha[] = [
  { id: 't1', colecao: 'treino', nome: 'Primeira academia', desc: 'Complete o seu primeiro treino.', img: ASSETS['first-gym'].frente, verso: ASSETS['first-gym'].verso, meta: 1, valor: treinos },
  { id: 't10', colecao: 'treino', nome: 'Guerreiro da semana', desc: 'Complete 10 treinos.', img: ASSETS['week-warrior'].frente, verso: ASSETS['week-warrior'].verso, meta: 10, valor: treinos },
  { id: 't50', colecao: 'treino', nome: 'Em ritmo', desc: 'Complete 50 treinos.', img: ASSETS['first-run'].frente, verso: ASSETS['first-run'].verso, meta: 50, valor: treinos },
  { id: 't75', colecao: 'treino', nome: 'Alto desempenho', desc: 'Complete 75 treinos.', img: ASSETS['top-performer'].frente, verso: ASSETS['top-performer'].verso, meta: 75, valor: treinos },
  { id: 't100', colecao: 'treino', nome: 'Lenda da academia', desc: 'Chegue a 100 treinos.', img: ASSETS['cem-treinos'].frente, verso: ASSETS['cem-treinos'].verso, meta: 100, valor: treinos },

  { id: 's7', colecao: 'constancia', nome: 'Em chamas', desc: 'Mantenha uma sequência de 7 dias.', img: ASSETS['on-fire'].frente, verso: ASSETS['on-fire'].verso, meta: 7, valor: (e, h) => streakAtual(e, h), mostrar: dias },
  { id: 's30', colecao: 'constancia', nome: 'Constante', desc: 'Mantenha uma sequência de 30 dias.', img: ASSETS['consistent'].frente, verso: ASSETS['consistent'].verso, meta: 30, valor: (e, h) => streakAtual(e, h), mostrar: dias },
  { id: 's60', colecao: 'constancia', nome: 'Mais alto', desc: 'Mantenha uma sequência de 60 dias.', img: ASSETS['higher'].frente, verso: ASSETS['higher'].verso, meta: 60, valor: (e, h) => streakAtual(e, h), mostrar: dias },
  { id: 'd30', colecao: 'constancia', nome: 'Treino em dia', desc: 'Treine em 30 dias diferentes.', img: ASSETS['sub30'].frente, verso: ASSETS['sub30'].verso, meta: 30, valor: diasDeTreino, mostrar: dias },
  { id: 'd90', colecao: 'constancia', nome: 'Dedicado', desc: 'Treine em 90 dias diferentes.', img: ASSETS['distance-legend'].frente, verso: ASSETS['distance-legend'].verso, meta: 90, valor: diasDeTreino, mostrar: dias },
  { id: 'd180', colecao: 'constancia', nome: 'Fogo de 180', desc: 'Treine em 180 dias diferentes.', img: ASSETS['on-fire-2'].frente, verso: ASSETS['on-fire-2'].verso, meta: 180, valor: diasDeTreino, mostrar: dias },
  { id: 'ck30', colecao: 'constancia', nome: 'Disciplina', desc: 'Faça check-in em 30 dias.', img: ASSETS['discipline'].frente, verso: ASSETS['discipline'].verso, meta: 30, valor: checkins, mostrar: dias },
  { id: 'rec', colecao: 'constancia', nome: 'Voz do futuro', desc: 'Guarde um recado de voz para o seu eu do futuro.', img: ASSETS['speedster'].frente, verso: ASSETS['speedster'].verso, meta: 1, valor: (e) => e.recados.length },

  { id: 'v1000', colecao: 'corpo', nome: 'Mais forte', desc: 'Levante 1.000 kg no total.', img: ASSETS['stronger'].frente, verso: ASSETS['stronger'].verso, meta: 1000, valor: volume, mostrar: kg },
  { id: 'c100', colecao: 'corpo', nome: 'Levantador', desc: 'Levante 100 kg em uma série.', img: ASSETS['stronger-arm'].frente, verso: ASSETS['stronger-arm'].verso, meta: 100, valor: cargaMax, mostrar: kg },
  { id: 'pr1', colecao: 'corpo', nome: 'Quebra-recordes', desc: 'Bata o seu recorde de carga em um exercício.', img: ASSETS['pr'].frente, verso: ASSETS['pr'].verso, meta: 1, valor: recordes },
  { id: 'pr5', colecao: 'corpo', nome: 'Em evolução', desc: 'Bata 5 recordes de carga.', img: ASSETS['evolution'].frente, verso: ASSETS['evolution'].verso, meta: 5, valor: recordes },
  { id: 'min90', colecao: 'corpo', nome: 'Resistência', desc: 'Faça um treino de 90 minutos.', img: ASSETS['long-run'].frente, verso: ASSETS['long-run'].verso, meta: 90, valor: minutosMax, mostrar: (n) => `${n} min` },

  { id: 'p1', colecao: 'comunidade', nome: 'Desafio aceito', desc: 'Publique na comunidade.', img: ASSETS['challenge-accepted'].frente, verso: ASSETS['challenge-accepted'].verso, meta: 1, valor: (e) => e.posts.length },
  { id: 'c10', colecao: 'comunidade', nome: 'Torcedor', desc: 'Dê cheers em 10 publicações.', img: ASSETS['got-a-pulse'].frente, verso: ASSETS['got-a-pulse'].verso, meta: 10, valor: cheersDados },
  { id: 'f5', colecao: 'comunidade', nome: 'Conectado', desc: 'Siga 5 pessoas.', img: ASSETS['social-beast'].frente, verso: ASSETS['social-beast'].verso, meta: 5, valor: seguindoN },
  { id: 'g1', colecao: 'comunidade', nome: 'Fundador', desc: 'Crie um clube.', img: ASSETS['community'].frente, verso: ASSETS['community'].verso, meta: 1, valor: (e) => e.grupos.length },
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
