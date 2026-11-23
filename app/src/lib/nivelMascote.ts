/* O nível de cada mascote (desde 2026-11-23, pedido do dono): todo mascote liberado tem uma barra de nível, que enche com
   XP. SÓ O MASCOTE ESCOLHIDO ganha XP (o "Seu mascote", o que anda com a conta; decisão do dono): a cada treino e a cada
   missão cumprida enquanto ele é o escolhido. Os outros guardam o nível que têm. O nível é o que vai decidir a força do
   mascote no jogo de batalhas entre amigos (anunciado no vídeo 2 como "vem aí"; ainda não existe).

   O XP fica guardado no servidor, por mascote (GET /loja/colecao, campo `xp`): o da missão ele dá junto com o brownie, e o
   do treino quando o app avisa que um treino terminou (api/mascotes.ts, `contarTreinos`; quem chama é o AvisoBrownie).
   Aqui fica só a conta do nível. Os números de XP_MASCOTE têm de ser os do servidor (backend/app/servicos/loja.py,
   XP_TREINO e XP_MISSAO; o teste test_xp_igual_ao_do_app confere). */

/* o XP que o mascote escolhido ganha */
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

export function progressoMascote(xp: number) {
  const nivel = nivelMascoteDe(xp);
  const ini = xpDoNivelMascote(nivel);
  const fim = xpDoNivelMascote(nivel + 1);
  return { nivel, xp, noNivel: xp - ini, tamanho: fim - ini, faltam: fim - xp, p: (xp - ini) / (fim - ini) };
}
