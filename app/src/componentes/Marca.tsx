/* O símbolo da marca RONDO: o traço branco sobre transparente, a partir de assets/rondo-simbolo.png (360 x 274). */
import React from 'react';
import { Image } from 'react-native';

type Props = { altura?: number; cor?: string };

export function Marca({ altura = 24, cor }: Props) {
  const largura = (altura * 360) / 274;
  return (
    <Image
      source={require('../../assets/rondo-simbolo.png')}
      accessibilityLabel="RONDO"
      accessibilityIgnoresInvertColors
      style={[{ width: largura, height: altura }, cor ? { tintColor: cor } : null]}
      resizeMode="contain"
    />
  );
}
