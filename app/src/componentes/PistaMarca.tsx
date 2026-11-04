/* A pista da marca: três raias, "você" na frente e o seu ontem logo atrás (o mesmo desenho do hero do site).
   É só desenho e movimento: não recebe toque. Com "reduzir movimento", os dois ficam parados. */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores } from '../tema';

const L = 160;    // comprimento de cada reta
const X0 = 80;    // x onde começa a reta de cima
const CY = 75;    // centro vertical

const raia = (r: number) => `M${X0} ${CY - r}H${X0 + L}A${r} ${r} 0 0 1 ${X0 + L} ${CY + r}H${X0}A${r} ${r} 0 0 1 ${X0} ${CY - r}Z`;

const R_VOCE = 42.5;     // entre as raias do meio e de dentro
const R_ONTEM = 57.5;    // entre as raias de fora e do meio

/* ponto da raia de raio r depois de t voltas (0 a 1): reta de cima, curva da direita, reta de baixo, curva da esquerda */
function ponto(t: number, r: number): { x: number; y: number } {
  const volta = 2 * L + 2 * Math.PI * r;
  let d = (((t % 1) + 1) % 1) * volta;
  if (d < L) return { x: X0 + d, y: CY - r };
  d -= L;
  const arco = Math.PI * r;
  if (d < arco) {
    const f = d / r;
    return { x: X0 + L + r * Math.sin(f), y: CY - r * Math.cos(f) };
  }
  d -= arco;
  if (d < L) return { x: X0 + L - d, y: CY + r };
  d -= L;
  const f = d / r;
  return { x: X0 - r * Math.sin(f), y: CY + r * Math.cos(f) };
}

const RASTRO = [0.0065, 0.013, 0.0195, 0.026, 0.0325];

export function PistaMarca({ altura = 124 }: { altura?: number }) {
  const reduzido = useMovimentoReduzido();
  const [t, setT] = useState(0.18);

  useEffect(() => {
    if (reduzido) return undefined;
    let raf = 0;
    let ultimo = 0;
    let ultimoDesenho = 0;
    let acumulado = 0.18;
    const quadro = (agora: number) => {
      if (ultimo) acumulado = (acumulado + (agora - ultimo) / 9500) % 1;   // cerca de 9,5 s por volta
      ultimo = agora;
      if (agora - ultimoDesenho > 32) { ultimoDesenho = agora; setT(acumulado); }   // ~30 quadros por segundo bastam
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [reduzido]);

  const voce = ponto(t, R_VOCE);
  const ontem = ponto(t - 0.12, R_ONTEM);   // o ontem fica cerca de 12% da volta atrás

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Pista de corrida: você na frente e o seu ontem logo atrás" style={{ width: '100%', height: altura }}>
      <Svg width="100%" height={altura} viewBox="0 0 320 150" preserveAspectRatio="xMidYMid meet">
        <Path d={raia(65)} fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth={1} />
        <Path d={raia(50)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
        <Path d={raia(35)} fill="none" stroke="rgba(255,255,255,0.11)" strokeWidth={1} />
        <Path d={`M${X0} ${CY - 65}V${CY - 35}`} stroke="rgba(196,168,255,0.45)" strokeWidth={1.5} />

        {/* o ontem: um anel vazado, com rastro apagado */}
        {RASTRO.map((d, k) => {
          const p = ponto(t - 0.12 - d, R_ONTEM);
          return <Circle key={`o${k}`} cx={p.x} cy={p.y} r={3.4 - k * 0.45} fill={cores.texto3} opacity={0.34 - k * 0.06} />;
        })}
        <Circle cx={ontem.x} cy={ontem.y} r={4.4} fill="none" stroke={cores.texto2} strokeWidth={1.4} />

        {/* você: ponto cheio com halo e rastro de luz */}
        {RASTRO.map((d, k) => {
          const p = ponto(t - d, R_VOCE);
          return <Circle key={`v${k}`} cx={p.x} cy={p.y} r={4.6 - k * 0.6} fill={cores.destaque} opacity={0.62 - k * 0.11} />;
        })}
        <Circle cx={voce.x} cy={voce.y} r={11} fill={cores.destaque} opacity={0.18} />
        <Circle cx={voce.x} cy={voce.y} r={5.2} fill={cores.destaque2} />
      </Svg>
    </View>
  );
}
