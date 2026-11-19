/* As missões do app: um número a alcançar (treinos, dias seguidos, carga, publicações...). Ao chegar na meta, a missão se
   cumpre e dá um brownie (um mascote para a coleção; desde 2026-11-19, no lugar das medalhas). Cada nível de conta também dá
   um. O brownie vem do servidor (api/mascotes.ts), uma vez por missão, e a raridade sobe a cada brownie ganho. */
import type { Estado } from '../tipos';
import { streakAtual } from './calc';

export type Missao = {
  id: string;
  colecao: string;
  nome: string;
  desc: string;                                    // a missão, em uma frase
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

const cheersDados = (e: Estado) => e.social.cheersDados;
const seguindoN = (e: Estado) => e.social.seguindo;
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

export const MISSOES: Missao[] = [
  { id: 't1', colecao: 'treino', nome: 'Primeira academia', desc: 'Complete o seu primeiro treino.', meta: 1, valor: treinos },
  { id: 't10', colecao: 'treino', nome: 'Guerreiro da semana', desc: 'Complete 10 treinos.', meta: 10, valor: treinos },
  { id: 't50', colecao: 'treino', nome: 'Em ritmo', desc: 'Complete 50 treinos.', meta: 50, valor: treinos },
  { id: 't75', colecao: 'treino', nome: 'Alto desempenho', desc: 'Complete 75 treinos.', meta: 75, valor: treinos },
  { id: 't100', colecao: 'treino', nome: 'Lenda da academia', desc: 'Chegue a 100 treinos.', meta: 100, valor: treinos },

  { id: 's7', colecao: 'constancia', nome: 'Em chamas', desc: 'Mantenha uma sequência de 7 dias.', meta: 7, valor: (e, h) => streakAtual(e, h), mostrar: dias },
  { id: 's30', colecao: 'constancia', nome: 'Constante', desc: 'Mantenha uma sequência de 30 dias.', meta: 30, valor: (e, h) => streakAtual(e, h), mostrar: dias },
  { id: 's60', colecao: 'constancia', nome: 'Mais alto', desc: 'Mantenha uma sequência de 60 dias.', meta: 60, valor: (e, h) => streakAtual(e, h), mostrar: dias },
  { id: 'd30', colecao: 'constancia', nome: 'Treino em dia', desc: 'Treine em 30 dias diferentes.', meta: 30, valor: diasDeTreino, mostrar: dias },
  { id: 'd90', colecao: 'constancia', nome: 'Dedicado', desc: 'Treine em 90 dias diferentes.', meta: 90, valor: diasDeTreino, mostrar: dias },
  { id: 'd180', colecao: 'constancia', nome: 'Fogo de 180', desc: 'Treine em 180 dias diferentes.', meta: 180, valor: diasDeTreino, mostrar: dias },
  { id: 'ck30', colecao: 'constancia', nome: 'Disciplina', desc: 'Faça check-in em 30 dias.', meta: 30, valor: checkins, mostrar: dias },
  { id: 'rec', colecao: 'constancia', nome: 'Voz do futuro', desc: 'Guarde um recado de voz para o seu eu do futuro.', meta: 1, valor: (e) => e.recados.length },

  { id: 'v1000', colecao: 'corpo', nome: 'Mais forte', desc: 'Levante 1.000 kg no total.', meta: 1000, valor: volume, mostrar: kg },
  { id: 'c100', colecao: 'corpo', nome: 'Levantador', desc: 'Levante 100 kg em uma série.', meta: 100, valor: cargaMax, mostrar: kg },
  { id: 'pr1', colecao: 'corpo', nome: 'Quebra-recordes', desc: 'Bata o seu recorde de carga em um exercício.', meta: 1, valor: recordes },
  { id: 'pr5', colecao: 'corpo', nome: 'Em evolução', desc: 'Bata 5 recordes de carga.', meta: 5, valor: recordes },
  { id: 'min90', colecao: 'corpo', nome: 'Resistência', desc: 'Faça um treino de 90 minutos.', meta: 90, valor: minutosMax, mostrar: (n) => `${n} min` },

  { id: 'p1', colecao: 'comunidade', nome: 'Desafio aceito', desc: 'Publique na comunidade.', meta: 1, valor: (e) => e.social.posts },
  { id: 'c10', colecao: 'comunidade', nome: 'Torcedor', desc: 'Dê cheers em 10 publicações.', meta: 10, valor: cheersDados },
  { id: 'f5', colecao: 'comunidade', nome: 'Conectado', desc: 'Siga 5 pessoas.', meta: 5, valor: seguindoN },
  { id: 'g1', colecao: 'comunidade', nome: 'Fundador', desc: 'Crie um clube.', meta: 1, valor: (e) => e.social.clubesCriados },
];

export type MissaoVista = Missao & { atual: number; cumprida: boolean };

export function missoesDe(e: Estado, hoje: Date): MissaoVista[] {
  return MISSOES.map((m) => {
    const atual = Math.min(m.meta, m.valor(e, hoje));
    return { ...m, atual, cumprida: atual >= m.meta };
  });
}

/* as missões em andamento, da mais perto de cumprir para a mais longe */
export const emAndamento = (v: MissaoVista[]): MissaoVista[] => v.filter((m) => !m.cumprida).sort((a, b) => b.atual / b.meta - a.atual / a.meta);

export const textoValor = (m: Missao, n: number): string => (m.mostrar ? m.mostrar(n) : String(n));
