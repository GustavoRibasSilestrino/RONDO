/* Rostinho redondo com a inicial. A cor vem do nome, dentro da família do roxo; "você" é sempre o violeta do app. */
import React from 'react';
import { View } from 'react-native';
import { T } from '../../componentes/Ui';
import { cores } from '../../tema';

const TONS = ['#4c1d95', '#5b21b6', '#6d28d9', '#4338ca', '#6b21a8', '#3730a3'];

export function Avatar({ nome, voce, tamanho = 38 }: { nome: string; voce?: boolean; tamanho?: number }) {
  const tom = TONS[[...nome].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TONS.length];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: voce ? cores.violeta : tom }}
    >
      <T tam={Math.round(tamanho * 0.37)} peso="500" cor="#ffffff">{nome.charAt(0).toUpperCase()}</T>
    </View>
  );
}
