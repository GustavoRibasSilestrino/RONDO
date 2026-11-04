/* Ícones de traço fino (24x24). */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Primitiva =
  | { t: 'p'; d: string }
  | { t: 'c'; cx: number; cy: number; r: number }
  | { t: 'r'; x: number; y: number; w: number; h: number; rx?: number };

const p = (d: string): Primitiva => ({ t: 'p', d });
const c = (cx: number, cy: number, r: number): Primitiva => ({ t: 'c', cx, cy, r });
const r = (x: number, y: number, w: number, h: number, rx?: number): Primitiva => ({ t: 'r', x, y, w, h, rx });

const ICONES = {
  hoje: [p('M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z')],
  treino: [p('M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11')],
  dieta: [p('M5 19c0-9 5-14 15-14 0 10-5 15-14 15'), p('M5 19c3-5 6-7 10-9')],
  evolucao: [p('M4 20V10M10 20V4M16 20v-7M22 20H2')],
  social: [c(9, 8, 3.5), p('M2.5 20a6.5 6.5 0 0 1 13 0'), p('M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .8 3.5 2.7 3.5 5.5')],
  recado: [r(9, 3, 6, 11, 3), p('M5 11a7 7 0 0 0 14 0M12 18v3')],
  perfil: [c(12, 8, 4), p('M4 21a8 8 0 0 1 16 0')],
  chama: [p('M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5C9 10 10 10.5 11 10c0-3 1-5 1-7Z')],
  ok: [p('m5 12.5 4.5 4.5L19 7.5')],
  mais: [p('M12 5v14M5 12h14')],
  menos: [p('M5 12h14')],
  fechar: [p('M6 6l12 12M18 6 6 18')],
  lixo: [p('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3')],
  olho: [p('M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z'), c(12, 12, 3)],
  seta: [p('m6 9 6 6 6-6')],
  coracao: [p('M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11Z')],
  tocar: [p('M7 5v14l12-7z')],
  parar: [r(6, 6, 12, 12, 2)],
  cadeado: [r(5, 11, 14, 9, 2), p('M8 11V8a4 4 0 0 1 8 0v3')],
  gota: [p('M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z')],
  relogio: [c(12, 13, 8), p('M12 9v4l3 2M9 3h6')],
  camera: [p('M4 8h3l2-3h6l2 3h3v11H4z'), c(12, 13, 3.5)],
  sair: [p('M10 4H5v16h5M15 8l4 4-4 4M19 12H9')],
  email: [r(3, 5, 18, 14, 3), p('m3.5 8 8.5 6 8.5-6')],
  olhoFechado: [p('M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-10-8-10-8a17 17 0 0 1 4.9-5.9M9.9 4.3A9 9 0 0 1 12 4c7 0 10 8 10 8a17 17 0 0 1-2.1 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2'), p('M3 3l18 18')],
  alerta: [c(12, 12, 9), p('M12 7.5v5M12 16.3h.01')],
  setaDireita: [p('M5 12h14M13 6l6 6-6 6')],
  voltar: [p('M15 5 8 12l7 7')],
  imagem: [r(3, 4, 18, 16, 3.5), c(8.5, 9.5, 1.8), p('m21 16-5-5L7 20')],
  video: [r(3, 6, 13, 12, 3), p('m16 10.5 5-3v9l-5-3z')],
  enviar: [p('M21 3 10.5 13.5'), p('M21 3l-6.5 18-4-7.5L3 9.5z')],
  comentario: [p('M20 12a8 8 0 0 1-11.5 7.2L4 20l1-4.2A8 8 0 1 1 20 12z')],
  busca: [c(11, 11, 6.5), p('m20 20-4.2-4.2')],
  compartilhar: [p('M12 15V4M8 8l4-4 4 4'), p('M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7')],
  pontos: [c(5, 12, 1.2), c(12, 12, 1.2), c(19, 12, 1.2)],
  convidar: [c(9, 8, 3.5), p('M2.5 20a6.5 6.5 0 0 1 13 0'), p('M19 8v6M16 11h6')],
  cheers: [p('M4 8l5.2 1.4-2 9.4-4.4-1z'), p('M20 8l-5.2 1.4 2 9.4 4.4-1z'), p('M12 3v2.2M8.3 3.7l.9 1.6M15.7 3.7l-.9 1.6')],
  pista: [p('M8 5h8a7 7 0 0 1 0 14H8A7 7 0 0 1 8 5z')],
  grupo: [c(12, 7.5, 3), p('M6 20a6 6 0 0 1 12 0'), c(5, 10, 2.2), p('M1.5 19a4 4 0 0 1 4-4'), c(19, 10, 2.2), p('M22.5 19a4 4 0 0 0-4-4')],
} satisfies Record<string, Primitiva[]>;

export type NomeIcone = keyof typeof ICONES;

type Props = { nome: NomeIcone; tamanho?: number; cor?: string; espessura?: number };

export function Icone({ nome, tamanho = 22, cor = '#ffffff', espessura = 1.7 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round" strokeLinejoin="round">
      {ICONES[nome].map((it, i) => {
        if (it.t === 'p') return <Path key={i} d={it.d} />;
        if (it.t === 'c') return <Circle key={i} cx={it.cx} cy={it.cy} r={it.r} />;
        return <Rect key={i} x={it.x} y={it.y} width={it.w} height={it.h} rx={it.rx} />;
      })}
    </Svg>
  );
}
