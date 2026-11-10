/* Renderizador dos aparelhos da seção "aparelhos" do site (vitrine).
   Os quatro aparelhos são sólidos descritos por funções de distância (SDF) e desenhados por traçado de raios, aqui, fora do
   navegador: metal que reflete um estúdio de luzes, sombra no chão e a luz da cor de cada cena. O resultado são imagens prontas,
   em vários ângulos, que o site só troca conforme a rolagem (components/GymScene.tsx): 3D de verdade na tela, sem WebGL e sem
   custo de 3D para quem visita.

   Precisa do sharp (não fica no package.json do site):  npm install --no-save sharp
   Uso, nesta pasta:
     node cli.mjs teste <aparelho> <yaw em graus> [amostras]     um quadro só, em out/, para olhar
     node cli.mjs tira <aparelho> <de> <até> <n>                 vários ângulos lado a lado, em out/
     node cli.mjs tudo                                            refaz src/assets/gym e src/components/gymQuadros.ts (uns 5 minutos)
   Aparelhos: halter, kettlebell, barra, banco. Para mudar um modelo, mexa na função map dele e rode "tudo" de novo. */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const sstep = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const lin = (hex) => [1, 3, 5].map((i) => Math.pow(parseInt(hex.slice(i, i + 2), 16) / 255, 2.2));
const RAD = Math.PI / 180;

/* ------------------------------------------------------------------ materiais */
const ACO = 0, GRIP = 1, FERRO = 2, FUNDIDO = 3, BORRACHA = 4, COURO = 5;
const MATS = [
  { metal: 1, f0: [0.80, 0.81, 0.85], rug: 0.16 },           // aço polido
  { metal: 1, f0: [0.50, 0.51, 0.55], rug: 0.46 },           // aço serrilhado (a pegada)
  { metal: 1, f0: [0.20, 0.20, 0.255], rug: 0.30 },          // ferro escuro
  { metal: 1, f0: [0.15, 0.15, 0.195], rug: 0.40 },          // ferro fundido (kettlebell)
  { metal: 0, cor: [0.020, 0.020, 0.026], f0: 0.045, rug: 0.52 },   // borracha
  { metal: 0, cor: [0.034, 0.028, 0.060], f0: 0.06, rug: 0.34 },   // couro
];

/* ------------------------------------------------------------------ formas (distâncias) */
let D = 0, CODE = 0;
const U = (d, code) => { if (d < D) { D = d; CODE = code; } };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);

/* cilindro deitado no eixo X: centro, raio, meia-largura e arredondamento das quinas */
function cilX(x, y, z, cx, cy, cz, r, h, rd) {
  const yy = y - cy, zz = z - cz;
  const a = Math.sqrt(yy * yy + zz * zz) - r + rd, b = Math.abs(x - cx) - h + rd;
  const pa = a > 0 ? a : 0, pb = b > 0 ? b : 0;
  return Math.min(Math.max(a, b), 0) + Math.sqrt(pa * pa + pb * pb) - rd;
}
function cilZ(x, y, z, cx, cy, cz, r, h, rd) {
  const xx = x - cx, yy = y - cy;
  const a = Math.sqrt(xx * xx + yy * yy) - r + rd, b = Math.abs(z - cz) - h + rd;
  const pa = a > 0 ? a : 0, pb = b > 0 ? b : 0;
  return Math.min(Math.max(a, b), 0) + Math.sqrt(pa * pa + pb * pb) - rd;
}
/* prisma hexagonal deitado no eixo X, com uma face plana para baixo: ap = apótema, h = meia-largura */
function hexX(x, y, z, cx, cy, cz, ap, h, rd) {
  let px = Math.abs(z - cz), py = Math.abs(y - cy);
  const pz = Math.abs(x - cx);
  ap -= rd; h -= rd;
  const dt = 2 * Math.min(-0.8660254 * px + 0.5 * py, 0);
  px -= dt * -0.8660254; py -= dt * 0.5;
  const lim = 0.57735027 * ap, qx = px - clamp(px, -lim, lim), qy = py - ap;
  const d1 = Math.sqrt(qx * qx + qy * qy) * (qy < 0 ? -1 : 1), d2 = pz - h;
  const p1 = d1 > 0 ? d1 : 0, p2 = d2 > 0 ? d2 : 0;
  return Math.min(Math.max(d1, d2), 0) + Math.sqrt(p1 * p1 + p2 * p2) - rd;
}
/* caixa de quinas redondas, centrada na origem */
function caixa(x, y, z, bx, by, bz, r) {
  const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r;
  const ax = qx > 0 ? qx : 0, ay = qy > 0 ? qy : 0, az = qz > 0 ? qz : 0;
  return Math.sqrt(ax * ax + ay * ay + az * az) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
/* cápsula entre dois pontos no plano XY (z = 0), de raio r */
function capsulaXY(x, y, z, ax, ay, bx, by, r) {
  const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  const dx = pax - bax * h, dy = pay - bay * h;
  return Math.sqrt(dx * dx + dy * dy + z * z) - r;
}

/* ------------------------------------------------------------------ os quatro aparelhos (o chão é y = 0)
   Cada chamada de U recebe material + 16 * número da peça: a peça serve para o contorno do "ontem". */

function mapHalter(x, y, z) {
  D = 1e9;
  const Y = 0.40, ax = Math.abs(x);
  U(cilX(x, y, z, 0, Y, 0, 0.066, 0.60, 0.008), ACO + 16 * 1);                  // o cabo
  U(cilX(x, y, z, 0, Y, 0, 0.074, 0.335, 0.012), GRIP + 16 * 2);                // a pegada serrilhada
  U(cilX(ax, y, z, 0.405, Y, 0, 0.092, 0.022, 0.012), ACO + 16 * 3);            // anéis que fecham a pegada
  U(cilX(ax, y, z, 0.565, Y, 0, 0.165, 0.028, 0.014), ACO + 16 * 4);            // o flange junto do bloco
  /* o bloco hexagonal, com um rebaixo redondo na face de fora */
  let bloco = hexX(ax, y, z, 0.80, Y, 0, 0.40, 0.21, 0.045);
  bloco = smax(bloco, -cilX(ax, y, z, 1.01, Y, 0, 0.235, 0.014, 0.004), 0.012);
  U(bloco, FERRO + 16 * 5);
  U(cilX(ax, y, z, 1.0, Y, 0, 0.125, 0.022, 0.012), ACO + 16 * 6);              // a tampa de aço no meio do rebaixo
}

function mapKettle(x, y, z) {
  D = 1e9;
  const CY = 0.52, R = 0.62;
  const yy = (y - CY) / 0.96;
  let corpo = (Math.sqrt(x * x + yy * yy + z * z) - R) * 0.96;
  corpo = smax(corpo, -y, 0.05);                         // a base reta
  corpo = smax(corpo, Math.abs(z) - 0.598, 0.012);       // as duas faces planas, na frente e atrás
  /* a alça: um laço largo e baixo, de quinas redondas, que nasce dentro do corpo */
  const qx = Math.abs(x) - 0.365 + 0.2, qy = Math.abs(y - 1.13) - 0.40 + 0.2;
  const ex = qx > 0 ? qx : 0, ey = qy > 0 ? qy : 0;
  const laco = Math.sqrt(ex * ex + ey * ey) + Math.min(Math.max(qx, qy), 0) - 0.2;
  let alca = Math.sqrt(laco * laco + z * z) - 0.078;
  alca = Math.max(alca, 0.8 - y);
  D = smin(corpo, alca, 0.15);
  CODE = FUNDIDO + 16 * (alca < corpo ? 2 : 1);
}

const ANILHAS = [[0.64, 0.05], [0.52, 0.042], [0.40, 0.036]];   // raio e meia-espessura, de dentro para fora
function mapBarra(x, y, z) {
  D = 1e9;
  const Y = 0.64, ax = Math.abs(x);
  U(cilX(x, y, z, 0, Y, 0, 0.040, 0.90, 0.004), ACO + 16 * 1);                  // a barra
  U(cilX(ax, y, z, 0.47, Y, 0, 0.0425, 0.22, 0.004), GRIP + 16 * 2);            // as duas pegadas
  U(cilX(ax, y, z, 0.855, Y, 0, 0.105, 0.035, 0.014), ACO + 16 * 3);            // o encosto das anilhas
  U(cilX(ax, y, z, 1.37, Y, 0, 0.070, 0.50, 0.012), ACO + 16 * 4);              // a luva
  let px = 0.905;
  const yy = y - Y, rho = Math.sqrt(yy * yy + z * z);
  for (let i = 0; i < 3; i++) {
    const r = ANILHAS[i][0], t = ANILHAS[i][1], c = px + t;
    const dx = Math.abs(ax - c);
    /* aro de ferro com um rebaixo de borracha nas duas faces e o miolo de aço */
    let aro = cilX(ax, y, z, c, Y, 0, r, t, 0.02);
    const meio = r * 0.55, larg = r * 0.27;
    const a = Math.abs(rho - meio) - larg, b = (t - 0.011) - dx;
    const rebaixo = Math.max(a, b);                      // negativo dentro do sulco
    aro = smax(aro, -rebaixo, 0.01);
    U(aro, (Math.abs(rho - meio) < larg + 0.004 ? BORRACHA : FERRO) + 16 * (5 + i));
    U(cilX(ax, y, z, c, Y, 0, r * 0.2, t + 0.004, 0.006), ACO + 16 * (8 + i));
    px += 2 * t + 0.014;
  }
  U(cilX(ax, y, z, px + 0.05, Y, 0, 0.108, 0.05, 0.014), ACO + 16 * 11);        // a presilha
  U(cilX(ax, y, z, px + 0.05, Y, 0, 0.112, 0.012, 0.005), FERRO + 16 * 12);
}

const BC = Math.cos(26 * RAD), BS = Math.sin(26 * RAD);    // inclinação do encosto
const SC = Math.cos(-4 * RAD), SS_ = Math.sin(-4 * RAD);   // o assento sobe um pouco na frente
function mapBanco(x, y, z) {
  D = 1e9;
  const az = Math.abs(z);
  /* os pés: duas travessas no chão, com ponteiras de borracha */
  for (let i = 0; i < 2; i++) {
    const xf = i ? 0.80 : -0.84;
    U(caixa(x - xf, y - 0.04, z, 0.042, 0.038, 0.33, 0.014), FERRO + 16 * (1 + i));
    U(caixa(x - xf, y - 0.04, az - 0.335, 0.05, 0.044, 0.04, 0.018), BORRACHA + 16 * (3 + i));
    U(caixa(x - xf, y - 0.19, z, 0.04, 0.15, 0.04, 0.012), FERRO + 16 * (5 + i));     // a coluna
  }
  U(caixa(x + 0.02, y - 0.31, z, 0.86, 0.038, 0.042, 0.012), FERRO + 16 * 7);          // a viga
  U(caixa(x - 0.52, y - 0.44, z, 0.036, 0.12, 0.036, 0.01), FERRO + 16 * 8);           // o apoio do assento
  U(capsulaXY(x, y, z, -0.34, 0.33, -0.60, 0.74, 0.034), FERRO + 16 * 9);              // o braço do encosto
  U(cilZ(x, y, z, 0.03, 0.555, 0, 0.042, 0.21, 0.012), ACO + 16 * 10);                 // a dobradiça
  /* o assento */
  let dx = x - 0.47, dy = y - 0.625;
  const su = dx * SC + dy * SS_;
  U(caixa(su, -dx * SS_ + dy * SC, z, 0.40, 0.062, 0.29, 0.05) + 0.006 * Math.exp(-(su * su) / 0.00025), COURO + 16 * 11);
  /* o encosto, que sobe para a esquerda */
  dx = x + 0.50; dy = y - 0.875;
  const u = dx * BC - dy * BS, v = dx * BS + dy * BC;
  const c1 = u - 0.2, c2 = u + 0.2;
  U(caixa(u, v, z, 0.58, 0.058, 0.29, 0.05) + 0.006 * (Math.exp(-(c1 * c1) / 0.00025) + Math.exp(-(c2 * c2) / 0.00025)), COURO + 16 * 12);
  U(caixa(u, v + 0.075, z, 0.50, 0.02, 0.17, 0.008), FERRO + 16 * 13);                 // a chapa atrás do encosto
}

/* ------------------------------------------------------------------ cenas
   s = pixels por unidade no plano do aparelho; raio/alto = cilindro que envolve o aparelho em qualquer giro. */
export const CENAS = {
  halter: { map: mapHalter, cor: '#3b0f8c', luz: '#c4a8ff', raio: 1.08, alto: 0.84, alvoY: 0.40, s: 268, yaw: 30 },
  kettlebell: { map: mapKettle, cor: '#1b2a9e', luz: '#9db4ff', raio: 0.66, alto: 1.70, alvoY: 0.80, s: 250, yaw: 28 },
  barra: { map: mapBarra, cor: '#7a1180', luz: '#f2a8ff', raio: 1.90, alto: 1.30, alvoY: 0.64, s: 212, yaw: 24 },
  banco: { map: mapBanco, cor: '#0b4a63', luz: '#8fe0ff', raio: 1.22, alto: 1.42, alvoY: 0.62, s: 258, yaw: -30 },
};
const DIST = 11, ELEV = 13 * RAD;      // câmera: distância e altura do olhar

/* ------------------------------------------------------------------ o estúdio (luzes) */
function luzDe(dir, hw, hh, I, cor, s0) {
  const n = Math.hypot(...dir), c = dir.map((v) => v / n);
  let u = [c[2], 0, -c[0]]; const nu = Math.hypot(...u) || 1; u = u.map((v) => v / nu);
  const v = [c[1] * u[2] - c[2] * u[1], c[2] * u[0] - c[0] * u[2], c[0] * u[1] - c[1] * u[0]];
  return { c, u, v, hw, hh, I, cor, s0 };
}
let LUZES = [], COR = [0, 0, 0], LUZ = [0, 0, 0], CHAVE = null;
function montarEstudio(cena) {
  COR = lin(cena.cor); LUZ = lin(cena.luz);
  const tinta = (k) => [mix(1, LUZ[0], k), mix(1, LUZ[1], k), mix(1, LUZ[2], k)];
  CHAVE = luzDe([-0.42, 0.80, 0.46], 0.62, 0.40, 5.2, [1, 0.985, 0.97], 0.05);        // a luz principal: caixa grande, de cima e da frente
  LUZES = [
    CHAVE,
    luzDe([0.72, 0.22, 0.66], 0.30, 0.55, 1.15, tinta(0.25), 0.08),                   // preenchimento, da frente à direita
    luzDe([0.86, 0.34, -0.38], 0.11, 0.75, 5.5, tinta(0.6), 0.03),                    // recorte da cor da cena, de trás à direita
    luzDe([-0.84, 0.26, -0.48], 0.12, 0.62, 4.2, tinta(0.65), 0.03),                  // recorte, de trás à esquerda
    luzDe([0.0, 0.80, -0.60], 1.0, 0.10, 2.6, tinta(0.2), 0.04),                      // faixa no alto, atrás: o fio de luz nas bordas de cima
  ];
}
const E = [0, 0, 0];
/* o que se vê olhando na direção d (do mundo), já borrado pela rugosidade */
function ambiente(dx, dy, dz, rug) {
  const h = sstep(-0.06 - rug * 0.5, 0.06 + rug * 0.5, dy);
  const up = dy > 0 ? dy : 0;
  let ceu = 0.045 + 0.20 * up * up;
  const tras = sstep(0.25, -0.85, dz) * (1 - Math.abs(dy)) * (1 - Math.abs(dy));      // o clarão da cena, atrás do aparelho
  let r = ceu + LUZ[0] * 0.30 * tras + COR[0] * 0.5 * tras;
  let g = ceu + LUZ[1] * 0.30 * tras + COR[1] * 0.5 * tras;
  let b = ceu * 1.08 + LUZ[2] * 0.30 * tras + COR[2] * 0.5 * tras;
  /* para baixo, o chão: o painel na cor da cena, mais claro perto do aparelho */
  const chao = 0.55 + 0.5 * sstep(-1, -0.15, dy), cz = (COR[0] + COR[1] + COR[2]) / 3 * 0.35;
  r = mix(mix(COR[0], cz, 0.3) * chao + 0.01, r, h); g = mix(mix(COR[1], cz, 0.3) * chao + 0.01, g, h); b = mix(mix(COR[2], cz, 0.3) * chao + 0.012, b, h);
  for (let i = 0; i < LUZES.length; i++) {
    const L = LUZES[i];
    const dc = dx * L.c[0] + dy * L.c[1] + dz * L.c[2];
    if (dc <= 0.03) continue;
    const a = Math.abs((dx * L.u[0] + dy * L.u[1] + dz * L.u[2]) / dc), bb = Math.abs((dx * L.v[0] + dy * L.v[1] + dz * L.v[2]) / dc);
    const s = L.s0 + rug * 0.85;
    const m = sstep(L.hw + s, L.hw - s * 0.6, a) * sstep(L.hh + s, L.hh - s * 0.6, bb);
    if (m <= 0) continue;
    const k = m * L.I * (L.hw / (L.hw + 0.45 * s)) * (L.hh / (L.hh + 0.45 * s));
    r += k * L.cor[0]; g += k * L.cor[1]; b += k * L.cor[2];
  }
  E[0] = r; E[1] = g; E[2] = b;
}

/* ------------------------------------------------------------------ traçado */
let MAP = mapHalter, CYAW = 1, SYAW = 0;
function marchar(ox, oy, oz, dx, dy, dz, t0, t1) {
  let t = t0;
  for (let i = 0; i < 200; i++) {
    MAP(ox + dx * t, oy + dy * t, oz + dz * t);
    if (D < 0.00035) return t;
    t += D;
    if (t > t1) return -1;
  }
  return -1;
}
const N = [0, 0, 0];
function normal(x, y, z) {
  const e = 0.0007;
  MAP(x + e, y - e, z - e); const a = D;
  MAP(x - e, y - e, z + e); const b = D;
  MAP(x - e, y + e, z - e); const c = D;
  MAP(x + e, y + e, z + e); const d = D;
  let nx = a - b - c + d, ny = -a - b + c + d, nz = -a + b - c + d;
  const n = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  N[0] = nx / n; N[1] = ny / n; N[2] = nz / n;
}
function sombra(ox, oy, oz, lx, ly, lz, k, tmax) {
  let res = 1, t = 0.012, ph = 1e10;
  for (let i = 0; i < 56 && t < tmax; i++) {
    MAP(ox + lx * t, oy + ly * t, oz + lz * t);
    const h = D;
    if (h < 0.0004) return 0;
    const y = (h * h) / (2 * ph), d = Math.sqrt(Math.max(h * h - y * y, 0));
    res = Math.min(res, (k * d) / Math.max(1e-4, t - y));
    ph = h; t += clamp(h, 0.006, 0.2);
  }
  res = clamp(res, 0, 1);
  return res * res * (3 - 2 * res);
}
function oclusao(x, y, z, nx, ny, nz, alcance) {
  let occ = 0, sca = 1;
  for (let i = 0; i < 5; i++) {
    const h = alcance * (0.08 + 0.92 * (i / 4));
    MAP(x + nx * h, y + ny * h, z + nz * h);
    occ += (h - D) * sca; sca *= 0.78;
  }
  return clamp(1 - (1.7 / alcance) * occ * 0.34, 0, 1);
}

const C = [0, 0, 0];
/* a cor de um ponto da superfície. Tudo em coordenadas do aparelho; as luzes ficam no mundo (o aparelho é que gira). */
function tonalizar(px, py, pz, vx, vy, vz, nivel) {
  normal(px, py, pz);
  MAP(px, py, pz);
  const code = CODE, m = MATS[code & 15];
  const g0 = N[0], g1 = N[1], g2 = N[2];           // a normal da forma (N é reescrito pelas chamadas de dentro)
  let nx = g0, ny = g1, nz = g2;
  const rug = m.rug;
  if ((code & 15) === GRIP) {                       // o serrilhado: sulcos em anel, só na normal
    const k = Math.cos(px * 420) * 0.15;
    nx += k; const n = Math.sqrt(nx * nx + ny * ny + nz * nz); nx /= n; ny /= n; nz /= n;
  }
  const ndv = Math.max(nx * vx + ny * vy + nz * vz, 1e-4);
  const rx = 2 * ndv * nx - vx, ry = 2 * ndv * ny - vy, rz = 2 * ndv * nz - vz;
  const ao = oclusao(px, py, pz, g0, g1, g2, 0.30);
  const fres = Math.pow(1 - ndv, 5);
  /* direções no mundo */
  const wrx = rx * CYAW + rz * SYAW, wrz = -rx * SYAW + rz * CYAW;
  const wnx = nx * CYAW + nz * SYAW, wnz = -nx * SYAW + nz * CYAW;

  /* o que a superfície reflete: outra peça do aparelho, ou o estúdio */
  let er, eg, eb;
  let bateu = -1;
  if (nivel === 0) bateu = marchar(px + g0 * 0.004, py + g1 * 0.004, pz + g2 * 0.004, rx, ry, rz, 0.004, 5);
  if (bateu > 0) {
    const qx = px + g0 * 0.004 + rx * bateu, qy = py + g1 * 0.004 + ry * bateu, qz = pz + g2 * 0.004 + rz * bateu;
    tonalizar(qx, qy, qz, -rx, -ry, -rz, 1);
    const perto = 1 / (1 + bateu * 15 * rug);            // superfície áspera: o reflexo de uma peça distante se desfaz
    const c0 = C[0], c1 = C[1], c2 = C[2];
    ambiente(wrx, ry, wrz, rug);
    er = mix(E[0] * 0.25, c0, perto); eg = mix(E[1] * 0.25, c1, perto); eb = mix(E[2] * 0.25, c2, perto);
  } else if (ry < -1e-3 && nivel === 0) {
    /* reflexo que desce até o chão: o chão fica mais escuro debaixo do aparelho */
    const t = -py / ry, gx = px + rx * t, gz = pz + rz * t;
    ambiente(wrx, ry, wrz, rug);
    const sc = 0.45 + 0.55 * oclusao(gx, 0.001, gz, 0, 1, 0, 0.5);
    er = E[0] * sc; eg = E[1] * sc; eb = E[2] * sc;
  } else {
    ambiente(wrx, ry, wrz, rug);
    er = E[0]; eg = E[1]; eb = E[2];
  }
  const oe = mix(1, ao, 0.75);

  if (m.metal) {
    const f0 = m.f0;
    C[0] = (f0[0] + (1 - f0[0]) * fres) * er * oe;
    C[1] = (f0[1] + (1 - f0[1]) * fres) * eg * oe;
    C[2] = (f0[2] + (1 - f0[2]) * fres) * eb * oe;
    return;
  }
  /* borracha e couro: luz difusa + um brilho por cima */
  let dr = 0, dg = 0, db = 0;
  for (let i = 0; i < LUZES.length; i++) {
    const L = LUZES[i];
    let ndl = wnx * L.c[0] + ny * L.c[1] + wnz * L.c[2];
    ndl = (ndl + 0.25) / 1.25;                        // luz de área: passa um pouco da linha do horizonte
    if (ndl <= 0) continue;
    let k = ndl * L.I * L.hw * L.hh * 0.62;
    if (i === 0) {
      const lx = L.c[0] * CYAW - L.c[2] * SYAW, lz = L.c[0] * SYAW + L.c[2] * CYAW;
      k *= sombra(px + g0 * 0.006, py + g1 * 0.006, pz + g2 * 0.006, lx, L.c[1], lz, 7, 4);
    }
    dr += k * L.cor[0]; dg += k * L.cor[1]; db += k * L.cor[2];
  }
  const hemi = 0.5 + 0.5 * ny;
  dr += mix(COR[0] * 1.2 + 0.02, 0.16, hemi) * ao; dg += mix(COR[1] * 1.2 + 0.02, 0.16, hemi) * ao; db += mix(COR[2] * 1.2 + 0.02, 0.17, hemi) * ao;
  const f = m.f0 + (1 - m.f0) * fres, br = f * (1 - rug) * (1 - rug) * 1.5 * oe;
  C[0] = m.cor[0] * dr * (1 - f) + br * er;
  C[1] = m.cor[1] * dg * (1 - f) + br * eg;
  C[2] = m.cor[2] * db * (1 - f) + br * eb;
}

const aces = (x) => clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0, 1);

/* janela (em pixels, em volta do ponto para onde a câmera olha) que cabe o aparelho em qualquer giro, mais a sombra */
export function janela(cena, escala = 1) {
  const s = cena.s * escala, f = s * DIST;
  const cam = [0, cena.alvoY + DIST * Math.sin(ELEV), DIST * Math.cos(ELEV)];
  const fw = [0, -Math.sin(ELEV), -Math.cos(ELEV)], up = [0, Math.cos(ELEV), -Math.sin(ELEV)];
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [r, y] of [[cena.raio + 0.45, 0], [cena.raio + 0.05, cena.alto]]) {
    for (let a = 0; a < 360; a += 5) {
      const p = [Math.cos(a * RAD) * r, y, Math.sin(a * RAD) * r];
      const v = [p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]];
      const zz = v[0] * fw[0] + v[1] * fw[1] + v[2] * fw[2];
      const sx = (v[0] / zz) * f, sy = ((v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) / zz) * f;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
  }
  x0 = Math.floor(x0) - 4; x1 = Math.ceil(x1) + 4; y0 = Math.floor(y0) - 4; y1 = Math.ceil(y1) + 4;
  return { x0, y0, w: x1 - x0, h: y1 - y0, f, cam, fw, up };
}

/* desenha um quadro: devolve RGBA (alfa reto) e, se pedido, o mapa de peças para o contorno */
export function quadro(nome, yawGraus, amostras = 3, escala = 1, comPecas = false) {
  const cena = CENAS[nome];
  MAP = cena.map; montarEstudio(cena);
  const yaw = yawGraus * RAD; CYAW = Math.cos(yaw); SYAW = Math.sin(yaw);
  const J = janela(cena, escala), { w, h, f, cam, fw, up } = J;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const pecas = comPecas ? new Float32Array(w * h * 5) : null;   // peça, nx, ny, nz, profundidade
  /* câmera e luz principal no espaço do aparelho */
  const ox = cam[0] * CYAW - cam[2] * SYAW, oy = cam[1], oz = cam[0] * SYAW + cam[2] * CYAW;
  const klx = CHAVE.c[0] * CYAW - CHAVE.c[2] * SYAW, kly = CHAVE.c[1], klz = CHAVE.c[0] * SYAW + CHAVE.c[2] * CYAW;
  const meio = [0, cena.alto / 2, 0], rEsf = Math.hypot(cena.raio + 0.02, cena.alto / 2 + 0.02);
  const rChao = cena.raio + 0.42, n = amostras, inv = 1 / (n * n);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let R = 0, G = 0, B = 0, A = 0;
      for (let sj = 0; sj < n; sj++) for (let si = 0; si < n; si++) {
        const sx = (J.x0 + i + (si + 0.5) / n) / f, sy = (J.y0 + (h - 1 - j) + (sj + 0.5) / n) / f;
        let dwx = fw[0] + sx, dwy = fw[1] + up[1] * sy, dwz = fw[2] + up[2] * sy;
        const dn = Math.sqrt(dwx * dwx + dwy * dwy + dwz * dwz); dwx /= dn; dwy /= dn; dwz /= dn;
        const dx = dwx * CYAW - dwz * SYAW, dy = dwy, dz = dwx * SYAW + dwz * CYAW;
        /* só marcha dentro da esfera que envolve o aparelho */
        const mx = ox - meio[0], my = oy - meio[1], mz = oz - meio[2];
        const bq = mx * dx + my * dy + mz * dz, cq = mx * mx + my * my + mz * mz - rEsf * rEsf, disc = bq * bq - cq;
        let t = -1;
        if (disc > 0) { const rq = Math.sqrt(disc); t = marchar(ox, oy, oz, dx, dy, dz, Math.max(-bq - rq, 0), -bq + rq); }
        if (t > 0 && oy + dy * t > 0) {
          const px = ox + dx * t, py = oy + dy * t, pz = oz + dz * t;
          tonalizar(px, py, pz, -dx, -dy, -dz, 0);
          R += aces(C[0] * 1.0); G += aces(C[1] * 1.0); B += aces(C[2] * 1.0); A += 1;
          if (pecas && si === 0 && sj === 0) { MAP(px, py, pz); const o = (j * w + i) * 5; pecas[o] = CODE >> 4; normal(px, py, pz); pecas[o + 1] = N[0]; pecas[o + 2] = N[1]; pecas[o + 3] = N[2]; pecas[o + 4] = t; }
        } else if (dy < 0) {
          /* o chão: só a sombra, em preto com transparência */
          const tg = -oy / dy, gx = ox + dx * tg, gz = oz + dz * tg, rr = Math.sqrt(gx * gx + gz * gz);
          if (rr < rChao) {
            const sk = sombra(gx, 0.002, gz, klx, kly, klz, 5, 4);
            const ct = oclusao(gx, 0.002, gz, 0, 1, 0, 0.42);
            let a = 1 - (1 - 0.42 * (1 - sk)) * (0.22 + 0.78 * ct);
            a *= sstep(rChao, rChao - 0.38, rr);
            A += a;
          }
        }
      }
      const o = (j * w + i) * 4;
      if (A > 0) {
        const g = 1 / 2.2;
        rgba[o] = Math.pow(R / A, g) * 255; rgba[o + 1] = Math.pow(G / A, g) * 255; rgba[o + 2] = Math.pow(B / A, g) * 255;
        rgba[o + 3] = A * inv * 255;
      }
    }
  }
  return { w, h, rgba, pecas, J };
}

/* ------------------------------------------------------------------ fila de trabalho */
if (!isMainThread) {
  parentPort.on('message', (t) => {
    const q = quadro(t.nome, t.yaw, t.amostras, t.escala, t.pecas);
    parentPort.postMessage({ id: t.id, w: q.w, h: q.h, rgba: q.rgba, pecas: q.pecas }, q.pecas ? [q.rgba.buffer, q.pecas.buffer] : [q.rgba.buffer]);
  });
}
export function emParalelo(tarefas, aoTerminar) {
  const n = Math.min(tarefas.length, Math.max(1, os.cpus().length - 3));
  const saida = new Array(tarefas.length);
  let prox = 0, feitas = 0;
  return new Promise((ok) => {
    for (let k = 0; k < n; k++) {
      const w = new Worker(fileURLToPath(import.meta.url));
      const manda = () => { if (prox < tarefas.length) { const id = prox++; w.postMessage({ ...tarefas[id], id }); } else w.terminate(); };
      w.on('message', (m) => { saida[m.id] = m; feitas++; aoTerminar?.(feitas, tarefas.length); if (feitas === tarefas.length) ok(saida); manda(); });
      manda();
    }
  });
}
