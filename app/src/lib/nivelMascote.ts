/* O nível de cada mascote (desde 2026-11-23, pedido do dono): todo mascote liberado tem uma barra de nível, que enche com
   XP. Cada treino e cada missão que a conta cumpre DEPOIS de o mascote entrar na coleção dão XP a ele (o treino e a missão
   que deram o próprio mascote não contam). Todos os mascotes da conta ganham o mesmo XP de cada treino e de cada missão:
   quem está na coleção há mais tempo tem o nível mais alto. O nível é o que vai decidir a força do mascote no jogo de
   batalhas entre amigos (anunciado no vídeo 2 como "vem aí"; ainda não existe).

   Nada novo é guardado no aparelho: o servidor diz desde quando o mascote é da conta e quantas missões foram cumpridas
   de lá para cá (GET /loja/colecao, campos `desde` e `missoes`), e os treinos são os que o app já tem. */
import type { Estado } from '../tipos';

/* o XP que cada mascote da conta ganha */
export const XP_MASCOTE = { treino: 30, missao: 60 } as const;

/* O XP para chegar ao nível n. Cada nível pede 30 XP a mais que o anterior: 60 para o 2, mais 90 para o 3, mais 120 para o
   4... No começo sobe rápido (2 treinos para o nível 2, 5 para o 3) e vai ficando mais difícil (54 treinos para o 10). */
export const xpDoNivelMascote = (n: number): number => 15 * (n - 1) * (n + 2);

export function nivelMascoteDe(xp: number): number {
  const x = Math.max(0, xp);
  let n = Math.max(1, Math.floor((Math.sqrt(9 + (4 * x) / 15) - 1) / 2));
  while (xpDoNivelMascote(n + 1) <= x) n++;   // a raiz pode errar por um fio: confere para cima e para baixo
  while (n > 1 && xpDoNivelMascote(n) > x) n--;
  return n;
}

/* o XP de um mascote da coleção; `m` é o item que veio do servidor (sem `desde`, o XP é zero) */
export function xpDoMascote(e: Estado, m: { desde?: number | null; missoes?: number } | null | undefined): number {
  const desde = m?.desde;
  if (!desde) return 0;
  return e.treinos.filter((t) => t.fim > desde).length * XP_MASCOTE.treino + (m?.missoes ?? 0) * XP_MASCOTE.missao;
}

export function progressoMascote(xp: number) {
  const nivel = nivelMascoteDe(xp);
  const ini = xpDoNivelMascote(nivel);
  const fim = xpDoNivelMascote(nivel + 1);
  return { nivel, xp, noNivel: xp - ini, tamanho: fim - ini, faltam: fim - xp, p: (xp - ini) / (fim - ini) };
}
