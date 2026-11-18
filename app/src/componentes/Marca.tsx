/* A marca RONDO no app (identidade nova, 2026-11-18): desenhada em SVG a partir de lib/marca.ts, nítida em qualquer tamanho.
   - <Marca>: o R sozinho (o símbolo).
   - <NomeMarca>: o nome RONDO.
   - <IconeMarca>: o ícone, o R branco num quadrado preto de cantos redondos.
   Todos aceitam a cor; o leitor de tela lê "RONDO". */
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { ICONE, NOME, SIMBOLO } from '../lib/marca';

export function Marca({ altura = 24, cor = '#ffffff' }: { altura?: number; cor?: string }) {
  const largura = (altura * SIMBOLO.largura) / SIMBOLO.altura;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="RONDO">
      <Svg width={largura} height={altura} viewBox={`0 0 ${SIMBOLO.largura} ${SIMBOLO.altura}`}>
        <Path d={SIMBOLO.d} fill={cor} fillRule="evenodd" />
      </Svg>
    </View>
  );
}

export function NomeMarca({ altura = 24, cor = '#ffffff' }: { altura?: number; cor?: string }) {
  const largura = (altura * NOME.largura) / NOME.altura;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="RONDO">
      <Svg width={largura} height={altura} viewBox={`0 0 ${NOME.largura} ${NOME.altura}`}>
        <Path d={NOME.d} fill={cor} fillRule="evenodd" />
      </Svg>
    </View>
  );
}

export function IconeMarca({ tamanho = 40, fundo = ICONE.fundo, cor = ICONE.simbolo }: { tamanho?: number; fundo?: string; cor?: string }) {
  /* o R ocupa ~60% da largura, centrado (um tiquinho à direita: a bolinha pesa à esquerda) */
  const w = tamanho * ICONE.ocupa;
  const esc = w / SIMBOLO.largura;
  const x = (tamanho - w) / 2 + w * 0.015;
  const y = (tamanho - SIMBOLO.altura * esc) / 2 - SIMBOLO.altura * esc * 0.01;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="RONDO">
      <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`}>
        <Rect width={tamanho} height={tamanho} rx={tamanho * ICONE.raio} fill={fundo} />
        <Path d={SIMBOLO.d} fill={cor} fillRule="evenodd" transform={`translate(${x} ${y}) scale(${esc})`} />
      </Svg>
    </View>
  );
}
