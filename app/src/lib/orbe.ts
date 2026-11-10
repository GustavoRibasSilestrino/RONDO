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
   `incl` é o quanto a esfera está tombada para a frente e `desvio` um giro a mais: é por eles que o orbe acompanha o cursor. */
export function quadro(pts: Pontos, t: number, amp: number, R: number, cx: number, cy: number, saida: Float32Array, incl = 0.42, desvio = 0): void {
  const n = pts.length / 3;
  const giro = t * 0.34 + desvio;
  const cg = Math.cos(giro), sg = Math.sin(giro);
  const ci = Math.cos(incl), si = Math.sin(incl);
  const onda = 0.05 + 0.2 * amp;       // quanto a superfície ondula
  const escala = R / 150;
  for (let i = 0; i < n; i += 1) {
    const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
    const volume = 1 + onda * Math.sin(y * 5.5 + x * 2 + t * (1.8 + amp * 2.6));
    const xr = (x * cg + z * sg) * volume;
    const zr = (-x * sg + z * cg) * volume;
    const yr = y * volume;
    const y2 = yr * ci - zr * si;
    const z2 = yr * si + zr * ci;
    const faixa = 0.5 + 0.5 * Math.sin(y * 8.5 + x * 2.2 + t * 1.5 + amp * 1.5);   // as faixas de luz
    const luz = faixa * faixa;
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

/* mistura lilás e roxo conforme o brilho, e vai ao branco nos pontos mais fortes */
export function corDoPonto(branco: number, luz: number): string {
  const r = Math.round(138 + (196 - 138) * luz + (255 - 196) * branco);
  const g = Math.round(61 + (168 - 61) * luz + (255 - 168) * branco);
  return `rgb(${Math.min(255, r)},${Math.min(255, g)},255)`;
}
