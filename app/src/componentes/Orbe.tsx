/* O orbe do RONDIN no celular: SVG com menos pontos e quadros espaçados, para não pesar. No navegador usa Orbe.web.tsx.
   Com `hud`, ganha a moldura de instrumento em versão leve: um anel que engrossa com a voz, um anel de arcos girando e um
   anel de marcações. Tocar nele chama `aoPressionar`. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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
  quadro(pts, t.current, a, tamanho * (hud ? 0.3 : 0.36), c, c, saida);
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

  /* a moldura: três círculos de traço, girados pelo mesmo relógio da esfera (nenhum laço a mais) */
  const fio = Math.max(1, tamanho / 210);
  const rEspectro = tamanho * 0.385, rArcos = tamanho * 0.436, rMarcas = tamanho * 0.47;
  const voltaArcos = 2 * Math.PI * rArcos, voltaMarcas = 2 * Math.PI * rMarcas;
  const moldura = hud ? (
    <>
      <Circle cx={c} cy={c} r={rEspectro} fill="none" stroke="#c4a8ff" strokeOpacity={0.25 + 0.5 * a} strokeWidth={fio + a * tamanho * 0.035} strokeDasharray={`${fio * 1.4} ${fio * 2.6}`} />
      <Circle cx={c} cy={c} r={rArcos} fill="none" stroke="#c4a8ff" strokeOpacity={0.55} strokeWidth={fio * 1.5} strokeDasharray={`${voltaArcos * 0.19} ${voltaArcos * (1 / 3 - 0.19)}`} rotation={(t.current * 14) % 360} origin={`${c}, ${c}`} />
      <Circle cx={c} cy={c} r={rMarcas} fill="none" stroke="#c4a8ff" strokeOpacity={0.3} strokeWidth={fio * 4} strokeDasharray={`${fio} ${voltaMarcas / 72 - fio}`} rotation={(-t.current * 3.4) % 360} origin={`${c}, ${c}`} />
    </>
  ) : null;

  const desenho = <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`}>{bolinhas}{moldura}</Svg>;
  if (!aoPressionar) return desenho;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={aoPressionar} style={({ pressed }) => ({ width: tamanho, height: tamanho, borderRadius: tamanho / 2, opacity: pressed ? 0.85 : 1 })}>
      {desenho}
    </Pressable>
  );
}
