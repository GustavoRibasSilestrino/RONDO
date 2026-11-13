/* A onda de um recado: barras que mostram o volume da voz (ao vivo, na gravação, e resumido, no diário). */
import React from 'react';
import { View } from 'react-native';
import { BARRAS } from '../lib/onda';
import { cores } from '../tema';

export function OndaRecado({ niveis, altura = 64, ativa, cor = cores.destaque2 }: { niveis: number[]; altura?: number; ativa?: boolean; cor?: string }) {
  const barras = niveis.length >= BARRAS ? niveis.slice(-BARRAS) : [...Array(BARRAS - niveis.length).fill(0.06), ...niveis];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: altura, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {barras.map((n, i) => (
        <View key={i} style={{ flex: 1, height: Math.max(3, n * altura), borderRadius: 2, backgroundColor: cor, opacity: ativa ? 0.45 + n * 0.55 : 0.5 }} />
      ))}
    </View>
  );
}
