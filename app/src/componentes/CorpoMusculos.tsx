/* A figura do corpo com os músculos do treino pintados de roxo. A proporção é fixa (2 : 3). */
import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { caminhosDos, descricaoDos, type GrupoMuscular } from '../lib/musculos';
import { cores } from '../tema';

export function CorpoMusculos({ grupos, largura = 60 }: { grupos: GrupoMuscular[]; largura?: number }) {
  const altura = Math.round((largura * 3) / 2);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={grupos.length ? `Músculos do treino: ${descricaoDos(grupos)}` : 'Figura do corpo'} style={{ width: largura, height: altura }}>
      {/* o roxo fica embaixo e as linhas da figura por cima, para os contornos continuarem nítidos */}
      <Svg width={largura} height={altura} viewBox="0 0 1024 1536" style={{ position: 'absolute' }}>
        {caminhosDos(grupos).map((d, i) => <Path key={i} d={d} fill={cores.destaque} fillOpacity={0.78} stroke={cores.destaque} strokeWidth={6} strokeLinejoin="round" />)}
      </Svg>
      <Image source={require('../../assets/corpo.png')} style={{ width: largura, height: altura }} resizeMode="contain" />
    </View>
  );
}
