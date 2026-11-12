/* A forma do RONDIN: uma bolha líquida e brilhante (rosa, lilás e azul-piscina), que respira e ondula. Aqui fica só a
   matemática, usada pelos dois desenhos (componentes/Orbe.web.tsx no navegador, com canvas, e componentes/Orbe.tsx no
   celular, com SVG): o contorno que se mexe, as manchas de cor que giram por dentro e o brilho.

   O contorno é um círculo com algumas ondas somadas (cada uma com o seu número de "dobras", velocidade e fase): o resultado
   parece orgânico e nunca repete igual. Quanto mais o RONDIN fala, mais fundas ficam as ondas. */
import type { EstadoOrbe } from './orbe';

export const PONTOS_CONTORNO = 72;

/* as ondas do contorno: dobras, força relativa, velocidade (rad/s) e fase */
const ONDAS: [number, number, number, number][] = [
  [2, 0.3, 0.45, 0.0],
  [3, 0.36, -0.7, 1.7],
  [4, 0.3, 0.95, 3.1],
  [5, 0.26, -1.25, 4.4],
  [6, 0.18, 1.6, 2.2],
  [8, 0.07, -2.1, 0.9],
];

/* o quanto o contorno ondula em cada estado (fração do raio) e a velocidade do tempo interno */
export function ritmo(estado: EstadoOrbe): { onda: number; velocidade: number } {
  if (estado === 'falando') return { onda: 0.11, velocidade: 1.9 };
  if (estado === 'pensando') return { onda: 0.085, velocidade: 2.6 };
  if (estado === 'ouvindo') return { onda: 0.09, velocidade: 1.2 };
  return { onda: 0.08, velocidade: 0.75 };
}

/* os pontos do contorno no instante `t`, com a força `forca` (0 a ~0.2) e um respiro de escala */
export function contorno(cx: number, cy: number, raio: number, t: number, forca: number): [number, number][] {
  const pts: [number, number][] = [];
  const respiro = 1 + 0.018 * Math.sin(t * 1.3);
  for (let i = 0; i < PONTOS_CONTORNO; i += 1) {
    const a = (i / PONTOS_CONTORNO) * Math.PI * 2;
    let d = 0;
    for (const [dobras, peso, vel, fase] of ONDAS) d += peso * Math.sin(dobras * a + vel * t + fase);
    const r = raio * respiro * (1 + forca * d);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

/* um caminho SVG suave (curvas de Bézier pela regra de Catmull-Rom) que passa por todos os pontos, fechado */
export function caminhoSuave(pts: [number, number][]): string {
  const n = pts.length;
  const p = (i: number) => pts[(i + n) % n];
  let d = `M${p(0)[0].toFixed(2)},${p(0)[1].toFixed(2)}`;
  for (let i = 0; i < n; i += 1) {
    const [x0, y0] = p(i - 1), [x1, y1] = p(i), [x2, y2] = p(i + 1), [x3, y3] = p(i + 2);
    const c1x = x1 + (x2 - x0) / 6, c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6, c2y = y2 - (y3 - y1) / 6;
    d += `C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`;
  }
  return `${d}Z`;
}

/* as manchas de cor que giram devagar por dentro da bolha, dando o efeito de líquido. Posição em fração do raio. */
export type Mancha = { x: number; y: number; r: number; cor: string; forca: number };
const CORES = [
  { cor: '255,72,196', r: 0.9, orbita: 0.4, vel: 0.33, fase: 0.0, forca: 0.95 },     // magenta
  { cor: '150,80,255', r: 0.85, orbita: 0.5, vel: -0.27, fase: 2.1, forca: 0.85 },    // violeta
  { cor: '80,220,255', r: 0.75, orbita: 0.4, vel: 0.21, fase: 4.0, forca: 0.95 },     // azul-piscina
  { cor: '246,170,255', r: 0.6, orbita: 0.32, vel: -0.41, fase: 5.3, forca: 0.75 },   // lilás claro
  { cor: '96,28,150', r: 0.55, orbita: 0.62, vel: 0.37, fase: 1.0, forca: 0.55 },     // dobra escura
  { cor: '120,36,170', r: 0.45, orbita: 0.58, vel: -0.31, fase: 3.6, forca: 0.5 },    // outra dobra escura
];
export function manchas(t: number): Mancha[] {
  return CORES.map((c, i) => {
    const a = c.fase + c.vel * t;
    /* a azul-piscina prefere a parte de baixo, como na referência: o vaivém dela é achatado para baixo */
    const baixo = i === 2 ? 0.55 : 0;
    return {
      x: Math.cos(a) * c.orbita,
      y: Math.sin(a) * c.orbita * (i === 2 ? 0.45 : 1) + baixo,
      r: c.r * (1 + 0.08 * Math.sin(t * 0.9 + i)),
      cor: c.cor,
      forca: c.forca,
    };
  });
}

/* os pontinhos de brilho na superfície (o "molhado" da referência): posição fixa na bolha, piscam devagar */
export const BRILHOS: { x: number; y: number; r: number; fase: number }[] = [
  { x: -0.38, y: -0.52, r: 0.022, fase: 0 },
  { x: 0.2, y: -0.66, r: 0.016, fase: 1.3 },
  { x: 0.55, y: -0.3, r: 0.014, fase: 2.4 },
  { x: -0.62, y: 0.12, r: 0.012, fase: 3.1 },
  { x: 0.42, y: 0.5, r: 0.018, fase: 4.2 },
  { x: -0.2, y: 0.68, r: 0.014, fase: 5.0 },
  { x: 0.05, y: -0.35, r: 0.01, fase: 0.7 },
];
export const brilhoDoPonto = (fase: number, t: number) => 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.6 + fase)) ** 3;

/* o relevo: onde o contorno sai para fora (um calombo, que ganha um brilho por dentro) e onde ele entra (uma dobra, que
   ganha uma sombra). É o que dá volume de 3D à bolha, como na referência. Ângulo em radianos e força de 0 a 1. */
export type Relevo = { a: number; calombo: boolean; peso: number };
export function relevo(t: number): Relevo[] {
  const n = PONTOS_CONTORNO;
  const d: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    let v = 0;
    for (const [dobras, peso, vel, fase] of ONDAS) v += peso * Math.sin(dobras * a + vel * t + fase);
    d.push(v);
  }
  const saida: Relevo[] = [];
  for (let i = 0; i < n; i += 1) {
    const ant = d[(i - 1 + n) % n], ag = d[i], prox = d[(i + 1) % n];
    if (ag > ant && ag >= prox && ag > 0.15) saida.push({ a: (i / n) * Math.PI * 2, calombo: true, peso: Math.min(1, ag / 0.9) });
    else if (ag < ant && ag <= prox && ag < -0.15) saida.push({ a: (i / n) * Math.PI * 2, calombo: false, peso: Math.min(1, -ag / 0.9) });
  }
  return saida;
}
