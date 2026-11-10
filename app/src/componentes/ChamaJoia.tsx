/* O foguinho da sequência: uma chama lapidada como joia, em facetas de roxo (a luz bate em cima, à esquerda; embaixo fica o roxo fundo).
   O contorno é de chama (corpo de gota, ponta inclinada e uma língua menor à esquerda) e as facetas saem todas de um ponto no meio,
   como numa pedra lapidada. `situacao`: acesa (já teve registro hoje), em risco (a sequência vive, mas hoje ainda não teve registro:
   a joia fica mais fraca) ou apagada (sem sequência: cinza-lilás, sem brilho). É desenho vetorial: nitidez em qualquer tamanho e
   nenhum arquivo de imagem. A pílula com a joia e o número de dias é o `SeloSequencia` (SeloSequencia.tsx). */
import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import type { SituacaoSequencia } from '../lib/calc';

/* o contorno (caixa de 24 x 30), do topo em sentido horário; a língua da esquerda é o par de pontas (5,2 · 9,2) e (8,2 · 12,8) */
const CONTORNO: number[][] = [
  [14, 1], [18, 7], [21, 13.5], [21.6, 19], [18.8, 25.5], [12.5, 29.2], [6.2, 26.2], [2.8, 20.5], [3.2, 14.5], [5.2, 9.2], [8.2, 12.8], [9.5, 9], [11.5, 4.5],
];
const CENTRO = [12, 18];
const pts = (...v: number[][]) => v.map(([x, y]) => `${x},${y}`).join(' ');

/* uma faceta por aresta do contorno, da mais clara (topo e língua) à mais escura (fundo) */
const ACESA = ['#cfa9ff', '#a468fb', '#8236ee', '#6218cf', '#4d0fae', '#4a0fa6', '#6523d6', '#8143ee', '#a876fb', '#e3ceff', '#c29aff', '#dcc0ff', '#e6d3ff'];
const APAGADA = ['#7a748e', '#6c6682', '#5f5976', '#524c69', '#443f5b', '#3c374f', '#4b4662', '#58526f', '#6a647f', '#7e7893', '#726c87', '#7b7590', '#7f7994'];

export function ChamaJoia({ tamanho = 24, situacao = 'acesa' }: { tamanho?: number; situacao?: SituacaoSequencia }) {
  const apagada = situacao === 'apagada';
  const cor = apagada ? APAGADA : ACESA;
  return (
    <View style={{ width: tamanho * 0.8, height: tamanho, opacity: situacao === 'emRisco' ? 0.62 : 1 }}>
      <Svg width={tamanho * 0.8} height={tamanho} viewBox="0 0 24 30">
        {CONTORNO.map((a, i) => (
          <Polygon key={i} points={pts(CENTRO, a, CONTORNO[(i + 1) % CONTORNO.length])} fill={cor[i]} stroke="#ffffff" strokeOpacity={apagada ? 0.1 : 0.32} strokeWidth={0.5} strokeLinejoin="round" />
        ))}
        {/* a mesa da joia: uma faceta clara no meio, e um reflexo no alto */}
        <Polygon points={pts([10.6, 14], [14.2, 13], [16, 18.6], [9.4, 19.6])} fill="#ffffff" fillOpacity={apagada ? 0 : 0.26} />
        <Polygon points={pts([12.6, 3.6], [14, 1.2], [15.9, 6.4], [13.2, 8.8])} fill="#ffffff" fillOpacity={apagada ? 0 : 0.5} />
        <Polygon points={pts(...CONTORNO)} fill="none" stroke="#f1e6ff" strokeOpacity={apagada ? 0.18 : 0.65} strokeWidth={0.8} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
