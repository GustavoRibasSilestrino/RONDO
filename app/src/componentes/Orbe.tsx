/* O orbe do RONDIN no celular: SVG com menos pontos e quadros espaçados, para não pesar. No navegador usa Orbe.web.tsx.
   Só a esfera de pontos (a moldura de instrumento saiu em 2026-11-12); com `hud`, a auréola de luz roxa atrás.
   Tocar nele chama `aoPressionar`. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { CAMPOS, EstadoOrbe, amplitude, corDoPonto, esfera, quadro } from '../lib/orbe';
import { useMovimentoReduzido } from '../lib/movimento';

const N = 360;
const INTERVALO = 55;   // ms entre quadros (cerca de 18 por segundo)

type Props = {
  tamanho: number; estado: EstadoOrbe;
  hud?: boolean;                 // a moldura de instrumento em volta da esfera
  pulso?: number;                // só no navegador (a onda a cada tecla)
  aoPressionar?: () => void;     // tocar no orbe
  rotulo?: string;               // o que o toque faz, para leitores de tela
};

export function Orbe({ tamanho, estado, hud, aoPressionar, rotulo }: Props) {
  const reduzido = useMovimentoReduzido();
  const pts = useMemo(() => esfera(N), []);
  const saida = useMemo(() => new Float32Array(N * CAMPOS), []);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const [, redesenhar] = useState(0);
  const amp = useRef(0);
  const t = useRef(2);

  useEffect(() => {
    if (reduzido) { redesenhar((v) => v + 1); return undefined; }
    const t0 = Date.now();
    const id = setInterval(() => {
      t.current = (Date.now() - t0) / 1000;
      amp.current += (amplitude(estadoRef.current, t.current) - amp.current) * 0.35;
      redesenhar((v) => v + 1);
    }, INTERVALO);
    return () => clearInterval(id);
  }, [reduzido]);

  const c = tamanho / 2;
  const a = reduzido ? 0.06 : amp.current;
  quadro(pts, t.current, a, tamanho * 0.36, c, c, saida);   // sem a moldura (tirada em 2026-11-12): só a esfera
  /* o visual do RONDIN 3D (brand/rondin-3d): os pontos de trás, o miolo escuro, e os da frente com brilho nos acesos */
  const bolinhas: React.ReactElement[] = [];
  for (const passe of [0, 1]) {
    if (passe === 1) bolinhas.push(<Circle key="miolo" cx={c} cy={c} r={tamanho * 0.36 * 0.97} fill="#05030a" opacity={0.86} />);
    for (let i = 0; i < N; i += 1) {
      const o = i * CAMPOS;
      if (saida[o + 5] !== passe) continue;
      if (passe === 1 && saida[o + 3] > 0.5) {
        bolinhas.push(<Circle key={`b${i}`} cx={saida[o]} cy={saida[o + 1]} r={saida[o + 2] * 1.25 * 2.6} fill="#b080ff" opacity={Math.min(0.3, (saida[o + 3] - 0.5) * 0.6)} />);
      }
      bolinhas.push(
        <Circle key={i} cx={saida[o]} cy={saida[o + 1]} r={Math.max(0.4, saida[o + 2] * 1.25)} fill={corDoPonto(saida[o + 4], saida[o + 3])} opacity={saida[o + 3]} />,
      );
    }
  }

  /* o destaque: uma auréola de luz roxa atrás da esfera, que cresce quando ele fala */
  const halo = hud ? (
    <>
      <Defs>
        <RadialGradient id="halo-rondin" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#b080ff" stopOpacity={Math.min(0.62, 0.34 + 0.22 * a)} />
          <Stop offset="0.45" stopColor="#7c3aed" stopOpacity={(0.34 + 0.22 * a) * 0.42} />
          <Stop offset="1" stopColor="#5b21b6" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c} fill="url(#halo-rondin)" />
    </>
  ) : null;

  const desenho = <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`}>{halo}{bolinhas}</Svg>;
  if (!aoPressionar) return desenho;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={aoPressionar} style={({ pressed }) => ({ width: tamanho, height: tamanho, borderRadius: tamanho / 2, opacity: pressed ? 0.85 : 1 })}>
      {desenho}
    </Pressable>
  );
}
