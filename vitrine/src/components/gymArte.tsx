import type { ReactNode } from "react";

/* Os quatro aparelhos da seção "aparelhos", desenhados como vetor (SVG) de lado, sem foto e sem WebGL.
   Cada desenho é pintado uma vez; depois a seção só o move com transform (ver GymScene.tsx).
   As peças com class="br" são só brilho e sombra: somem no contorno do "ontem" (ver styles/gym.css). */

/* degradês compartilhados pelos quatro desenhos: aço, ferro, borracha e couro */
export function ArteDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id="gym-aco" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f5fa" /><stop offset=".2" stopColor="#d3d6e2" /><stop offset=".5" stopColor="#9a9eb2" />
          <stop offset=".78" stopColor="#5b5e73" /><stop offset="1" stopColor="#2b2c39" />
        </linearGradient>
        <linearGradient id="gym-ferro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a8da2" /><stop offset=".22" stopColor="#5e6176" /><stop offset=".6" stopColor="#3a3b4c" />
          <stop offset="1" stopColor="#1a1a25" />
        </linearGradient>
        <radialGradient id="gym-ferro-r" cx=".35" cy=".3" r=".85">
          <stop offset="0" stopColor="#9194a9" /><stop offset=".35" stopColor="#5a5d73" /><stop offset=".75" stopColor="#2a2b38" />
          <stop offset="1" stopColor="#12121a" />
        </radialGradient>
        <linearGradient id="gym-borracha" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c4c58" /><stop offset=".4" stopColor="#272730" /><stop offset="1" stopColor="#0f0f14" />
        </linearGradient>
        <linearGradient id="gym-couro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d7399" /><stop offset=".35" stopColor="#554c72" /><stop offset="1" stopColor="#272139" />
        </linearGradient>
        <radialGradient id="gym-sombra">
          <stop offset="0" stopColor="#000" stopOpacity=".55" /><stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/* risquinhos da pegada (serrilhado do aço): n riscos de y0 a y1, a partir de x0, de passo em passo */
const serrilha = (x0: number, n: number, passo: number, y0: number, y1: number) =>
  Array.from({ length: n }, (_, i) => `M${x0 + i * passo} ${y0}V${y1}`).join("");
const RISCO = "rgba(0,0,0,.35)";
const BRILHO = "rgba(255,255,255,.28)";

/* ---------- halter hexagonal ---------- */
function Halter() {
  const cabeca = (
    <>
      <rect x="38" y="104" width="22" height="52" rx="6" fill="url(#gym-aco)" />
      <rect x="56" y="48" width="122" height="164" rx="20" fill="url(#gym-ferro)" />
      <path className="br" d="M56 98H178M56 162H178" stroke="rgba(255,255,255,.14)" strokeWidth="2" />
      <rect className="br" x="68" y="55" width="98" height="9" rx="4.5" fill={BRILHO} />
      <rect x="176" y="56" width="12" height="148" rx="4" fill="url(#gym-borracha)" />
    </>
  );
  return (
    <>
      <ellipse className="br" cx="320" cy="214" rx="262" ry="13" fill="url(#gym-sombra)" />
      <rect x="186" y="116" width="268" height="28" rx="6" fill="url(#gym-aco)" />
      <path className="br" d={serrilha(246, 19, 8, 118, 142)} stroke={RISCO} strokeWidth="2" />
      <rect x="198" y="106" width="22" height="48" rx="6" fill="url(#gym-aco)" />
      <rect x="420" y="106" width="22" height="48" rx="6" fill="url(#gym-aco)" />
      <g>{cabeca}</g>
      <g transform="translate(640 0) scale(-1 1)">{cabeca}</g>
    </>
  );
}

/* ---------- kettlebell ---------- */
function Kettlebell() {
  return (
    <>
      <ellipse className="br" cx="200" cy="410" rx="142" ry="14" fill="url(#gym-sombra)" />
      {/* a alça atrás do corpo: as pontas dela somem dentro da bola */}
      <path d="M102 232V140C102 42 298 42 298 140V232H262V142C262 92 138 92 138 142V232Z" fill="url(#gym-ferro)" />
      <path className="br" d="M117 150V140C117 66 200 62 238 72" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="6" strokeLinecap="round" />
      <circle cx="200" cy="282" r="124" fill="url(#gym-ferro-r)" />
      <rect x="132" y="390" width="136" height="20" rx="8" fill="url(#gym-borracha)" />
      <path className="br" d="M104 262A100 100 0 0 1 150 190" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="10" strokeLinecap="round" />
      <circle className="br" cx="200" cy="294" r="46" fill="rgba(0,0,0,.18)" />
      <text className="br" x="200" y="307" textAnchor="middle" fontSize="38" fontWeight="300" fill="rgba(255,255,255,.7)" style={{ fontFamily: "var(--font-mono)" }}>24</text>
    </>
  );
}

/* ---------- barra com anilhas ---------- */
function Barra() {
  const anilhas: [number, number, number][] = [[214, 34, 224], [184, 28, 176], [158, 24, 128]];   // x, largura, altura (de dentro para fora)
  const lado = (
    <>
      <rect x="24" y="116" width="232" height="28" rx="8" fill="url(#gym-aco)" />
      {anilhas.map(([x, w, h]) => (
        <g key={x}>
          <rect x={x} y={130 - h / 2} width={w} height={h} rx="8" fill="url(#gym-borracha)" />
          <rect className="br" x={x + 5} y={130 - h / 2 + 7} width={w - 10} height={h - 14} rx="4" fill="url(#gym-ferro)" opacity=".7" />
          <rect className="br" x={x + 4} y={130 - h / 2 + 5} width={w - 8} height="5" rx="2.5" fill="rgba(255,255,255,.2)" />
        </g>
      ))}
      <rect x="128" y="107" width="22" height="46" rx="5" fill="url(#gym-aco)" />
    </>
  );
  return (
    <>
      <ellipse className="br" cx="480" cy="242" rx="430" ry="13" fill="url(#gym-sombra)" />
      <rect x="240" y="122" width="480" height="16" rx="6" fill="url(#gym-aco)" />
      <path className="br" d={serrilha(330, 14, 7, 123, 137) + serrilha(540, 14, 7, 123, 137)} stroke={RISCO} strokeWidth="2" />
      <g>{lado}</g>
      <g transform="translate(960 0) scale(-1 1)">{lado}</g>
    </>
  );
}

/* ---------- banco ---------- */
function Banco() {
  return (
    <>
      <ellipse className="br" cx="390" cy="317" rx="312" ry="12" fill="url(#gym-sombra)" />
      <rect x="190" y="214" width="400" height="18" rx="6" fill="url(#gym-ferro)" />
      <rect x="548" y="226" width="22" height="88" rx="5" fill="url(#gym-ferro)" />
      <rect x="508" y="300" width="100" height="16" rx="7" fill="url(#gym-ferro)" />
      <rect x="206" y="226" width="22" height="88" rx="5" fill="url(#gym-ferro)" />
      <rect x="166" y="300" width="100" height="16" rx="7" fill="url(#gym-ferro)" />
      {/* o braço que segura o encosto */}
      <path d="M252 207 162 145 150 163 240 225Z" fill="url(#gym-ferro)" />
      <rect x="300" y="170" width="300" height="48" rx="22" fill="url(#gym-couro)" />
      <rect className="br" x="320" y="177" width="260" height="7" rx="3.5" fill="rgba(255,255,255,.2)" />
      <g transform="translate(300 194) rotate(24)">
        <rect x="-280" y="-26" width="290" height="52" rx="22" fill="url(#gym-couro)" />
        <rect className="br" x="-260" y="-19" width="250" height="7" rx="3.5" fill="rgba(255,255,255,.2)" />
        <path className="br" d="M-256 4H-12" stroke="rgba(255,255,255,.14)" strokeWidth="2" strokeDasharray="6 9" />
      </g>
    </>
  );
}

export type Arte = { id: string; ratio: number; caixa: string; desenho: () => ReactNode };
/* caixa = viewBox; ratio = largura / altura (o CSS usa para limitar a altura do desenho).
   Todos os desenhos terminam 24 unidades abaixo do ponto onde tocam o chão, para a régua e a sombra baterem. */
export const ARTES: Arte[] = [
  { id: "halter", ratio: 640 / 236, caixa: "0 0 640 236", desenho: Halter },
  { id: "kettlebell", ratio: 400 / 434, caixa: "0 0 400 434", desenho: Kettlebell },
  { id: "barra", ratio: 960 / 266, caixa: "0 0 960 266", desenho: Barra },
  { id: "banco", ratio: 760 / 340, caixa: "0 0 760 340", desenho: Banco },
];
