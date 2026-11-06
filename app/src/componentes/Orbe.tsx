/* O orbe do RONDIN no celular: SVG com menos pontos e quadros espaçados, para não pesar. No navegador usa Orbe.web.tsx. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { CAMPOS, EstadoOrbe, amplitude, corDoPonto, esfera, quadro } from '../lib/orbe';
import { useMovimentoReduzido } from '../lib/movimento';

const N = 360;
const INTERVALO = 55;   // ms entre quadros (cerca de 18 por segundo)

export function Orbe({ tamanho, estado }: { tamanho: number; estado: EstadoOrbe }) {
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

  quadro(pts, t.current, reduzido ? 0.06 : amp.current, tamanho * 0.36, tamanho / 2, tamanho / 2, saida);
  const bolinhas: React.ReactElement[] = [];
  for (const passe of [0, 1]) {
    for (let i = 0; i < N; i += 1) {
      const o = i * CAMPOS;
      if (saida[o + 5] !== passe) continue;
      bolinhas.push(
        <Circle key={i} cx={saida[o]} cy={saida[o + 1]} r={Math.max(0.4, saida[o + 2] * 1.25)} fill={corDoPonto(saida[o + 4], saida[o + 3])} opacity={saida[o + 3]} />,
      );
    }
  }
  return <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`}>{bolinhas}</Svg>;
}
