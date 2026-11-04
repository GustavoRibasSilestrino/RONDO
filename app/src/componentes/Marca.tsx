/* O símbolo da marca KORA: o traço branco sobre transparente, a partir de assets/kora-simbolo.png (360 x 157). */
import React from 'react';
import { Image } from 'react-native';

type Props = { altura?: number; cor?: string };

export function Marca({ altura = 24, cor }: Props) {
  const largura = (altura * 360) / 157;
  return (
    <Image
      source={require('../../assets/kora-simbolo.png')}
      accessibilityLabel="KORA"
      accessibilityIgnoresInvertColors
      style={[{ width: largura, height: altura }, cor ? { tintColor: cor } : null]}
      resizeMode="contain"
    />
  );
}
