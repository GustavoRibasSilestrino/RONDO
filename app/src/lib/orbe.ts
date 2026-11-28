/* A conta do orbe do RONDIN: uma esfera de pontos em que faixas de luz ondulam e giram, e que "respira" mais forte
   quando o RONDIN fala. É só matemática, sem desenho: Orbe.web.tsx (canvas) e Orbe.tsx (SVG) só pintam o resultado. */

export type Pontos = Float32Array;   // x, y, z de cada ponto (esfera de raio 1)

/* pontos bem espalhados na esfera (espiral de Fibonacci) */
export function esfera(n: number): Pontos {
  const p = new Float32Array(n * 3);
  const ouro = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i += 1) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const f = i * ouro;
    p[i * 3] = Math.cos(f) * r;
    p[i * 3 + 1] = y;
    p[i * 3 + 2] = Math.sin(f) * r;
  }
  return p;
}

export const CAMPOS = 6;   // por ponto: x, y, raio, opacidade, quanto é branco (0 a 1), 1 se está na frente

/* quanto o orbe se mexe: parado quase quieto, ouvindo atento, pensando (trabalhando numa resposta) num tremor rápido,
   falando forte e irregular como a voz */
export type EstadoOrbe = 'quieto' | 'ouvindo' | 'pensando' | 'falando';
export function amplitude(estado: EstadoOrbe, t: number): number {
  if (estado === 'falando') return 0.4 + 0.6 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1) + 0.35 * Math.sin(t * 13));
  if (estado === 'pensando') return 0.16 + 0.08 * Math.sin(t * 6.2);
  if (estado === 'ouvindo') return 0.22 + 0.1 * Math.sin(t * 2.4);
  return 0.06 + 0.04 * Math.sin(t * 1.2);
}
/* o que o RONDIN está fazendo, para a etiqueta ao lado do nome */
export const ROTULO_ESTADO: Record<EstadoOrbe, string> = { quieto: 'EM ESPERA', ouvindo: 'OUVINDO', pensando: 'PROCESSANDO', falando: 'FALANDO' };

/* quanto cada barra do espectro de voz (em volta do orbe) sobe no instante t: 0 a 1 */
export function barraDoEspectro(i: number, t: number, amp: number): number {
  return Math.min(1, amp * (0.2 + 0.8 * Math.abs(Math.sin(i * 1.7 + t * 8.3) * Math.sin(i * 0.61 - t * 5.1))));
}

/* preenche `saida` (n * CAMPOS) com a posição e o brilho de cada ponto no instante t; raio R em pixels, centro (cx, cy).
   `incl` é o quanto a esfera está tombada para a frente e `desvio` um giro a mais: é por eles que o orbe acompanha o cursor.
   `fala` (desde 2026-11-16): as ondas da voz. Recebe a distância de cada ponto até o centro da frente da esfera (0 no
   meio, 1 no ponto oposto, atrás) e devolve a força da voz que chegou ali (0 a 1). Quem chama guarda o nível da voz dos
   últimos instantes: o que ele disse agora sai do meio, e o que disse há pouco já está mais longe, então cada sílaba vira
   um anel que se abre pela esfera. Nos anéis os pontos saltam para fora e acendem. */
export function quadro(pts: Pontos, t: number, amp: number, R: number, cx: number, cy: number, saida: Float32Array, incl = 0.42, desvio = 0, fala?: (d: number) => number): void {
  const n = pts.length / 3;
  const giro = t * 0.22 + desvio;   // giro mais lento (2026-11-16)
  const cg = Math.cos(giro), sg = Math.sin(giro);
  const ci = Math.cos(incl), si = Math.sin(incl);
  const onda = 0.04 + 0.09 * amp;      // quanto a superfície ondula (mais contido desde 2026-11-16, a pedido do dono)
  const escala = R / 150;
  for (let i = 0; i < n; i += 1) {
    const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
    let anel = 0;
    if (fala) {
      const zFrente = y * si + (-x * sg + z * cg) * ci;   // o quanto o ponto está virado para quem olha (1 = bem no meio)
      const d = Math.acos(Math.max(-1, Math.min(1, zFrente))) / Math.PI;
      const forca = fala(d);
      if (forca > 0.003) anel = forca * (0.5 + 0.5 * Math.sin(d * 18 - t * 4.5));   // anéis largos e lentos, que se abrem devagar
    }
    const volume = (1 + onda * Math.sin(y * 5.5 + x * 2 + t * (1.1 + amp * 0.7))) * (1 + 0.07 * anel);
    const xr = (x * cg + z * sg) * volume;
    const zr = (-x * sg + z * cg) * volume;
    const yr = y * volume;
    const y2 = yr * ci - zr * si;
    const z2 = yr * si + zr * ci;
    const faixa = 0.5 + 0.5 * Math.sin(y * 8.5 + x * 2.2 + t * 0.9 + amp * 0.8);   // as faixas de luz
    const luz = Math.min(1, faixa * faixa + 0.45 * anel);   // os anéis da voz acendem, sem ofuscar
    const frente = z2 > 0;
    const prof = (z2 + 1.4) / 2.4;
    const o = i * CAMPOS;
    saida[o] = cx + xr * R;
    saida[o + 1] = cy + y2 * R;
    saida[o + 2] = (0.55 + 2.1 * luz * prof + 0.5 * amp * luz) * escala;
    saida[o + 3] = Math.min(1, (frente ? 0.22 : 0.07) + 0.9 * luz * prof);
    saida[o + 4] = luz > 0.82 ? Math.min(1, (luz - 0.82) * 5.5) : 0;
    saida[o + 5] = frente ? 1 : 0;
  }
}

/* o RONDIN é verde (desde 2026-11-26, pedido do dono; antes era lilás e roxo): mistura um verde fechado e um verde vivo conforme
   o brilho, e clareia um pouco nos pontos mais fortes. Desde 2026-11-27 o verde é mais ESCURO (pedido do dono: "não quero tão
   claro como estão"): antes ia do verde vivo #22c55e ao verde-claro #a7f3bf e chegava quase ao branco nos pontos acesos */
export function corDoPonto(branco: number, luz: number): string {
  const mistura = (de: number, claro: number) => Math.min(255, Math.round(de + (claro - de) * luz + (255 - claro) * branco * 0.2));
  return `rgb(${mistura(21, 34)},${mistura(128, 197)},${mistura(61, 94)})`;
}
