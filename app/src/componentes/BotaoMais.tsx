/* O + roxo, fixo sobre a barra de abas, à direita. Usado para criar (publicação, dieta, treino). */
import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, larguraMax, estilos } from '../tema';
import { Icone } from './Icone';

export function BotaoMais({ rotulo, aoPressionar }: { rotulo: string; aoPressionar: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  return (
    <View pointerEvents="box-none" style={[st.faixa, { bottom: insets.bottom + 6 + 62 + 12 }]}>
      <View pointerEvents="box-none" style={{ width: Math.min(width, larguraMax), alignItems: 'flex-end', paddingRight: 20 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={aoPressionar} style={({ pressed }) => [st.mais, pressed && { transform: [{ scale: 0.94 }] }]}>
          <Icone nome="mais" tamanho={28} cor="#ffffff" espessura={2} />
        </Pressable>
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  faixa: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  mais: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte, boxShadow: '0 10px 24px -8px rgba(0,0,0,0.9)' },
}));
