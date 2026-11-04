/* Nível da conta: sobe com o que a pessoa registra e publica. Cada nível libera títulos para mostrar no perfil. */
import type { Estado } from '../tipos';

/* XP de cada atividade (os mesmos pesos do ranking semanal, mais publicar e comentar) */
export const XP = { treino: 30, refeicoes: 20, checkin: 10, agua: 5, post: 15, comentario: 3 } as const;

export function xpTotal(e: Estado): number {
  const refeicoes = Object.values(e.refeicoes).filter((l) => l.length >= 3).length;
  const checkins = Object.values(e.checkins).filter(Boolean).length;
  const agua = Object.values(e.agua).filter((n) => n >= 8).length;
  const comentarios = Object.values(e.comentarios).reduce((t, l) => t + l.filter((c) => c.autor === 'Você').length, 0);
  return e.treinos.length * XP.treino + refeicoes * XP.refeicoes + checkins * XP.checkin + agua * XP.agua + e.posts.length * XP.post + comentarios * XP.comentario;
}

export const xpDoNivel = (n: number): number => 50 * (n - 1) * (n - 1);
export const nivelDe = (xp: number): number => 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 50));

export function progressoNivel(xp: number) {
  const nivel = nivelDe(xp);
  const ini = xpDoNivel(nivel);
  const fim = xpDoNivel(nivel + 1);
  return { nivel, noNivel: xp - ini, tamanho: fim - ini, faltam: fim - xp, p: (xp - ini) / (fim - ini) };
}

/* títulos: aparecem no perfil como "fisiculturista", "corredor"... e são liberados pelo nível */
export type Titulo = { id: string; nome: string; nivel: number };
export const TITULOS: Titulo[] = [
  { id: 'iniciante', nome: 'Iniciante', nivel: 1 },
  { id: 'persistente', nome: 'Persistente', nivel: 2 },
  { id: 'amante-academia', nome: 'Amante da academia', nivel: 3 },
  { id: 'corredor', nome: 'Corredor', nivel: 4 },
  { id: 'chef', nome: 'Mestre das refeições', nivel: 5 },
  { id: 'atleta', nome: 'Atleta', nivel: 7 },
  { id: 'fisiculturista', nome: 'Fisiculturista', nivel: 9 },
  { id: 'maratonista', nome: 'Maratonista', nivel: 12 },
  { id: 'lenda', nome: 'Lenda do ontem', nivel: 15 },
];

export const MAX_TITULOS = 3;
export const MAX_DESTAQUES = 3;
