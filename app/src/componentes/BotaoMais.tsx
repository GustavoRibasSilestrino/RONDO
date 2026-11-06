/* O + roxo, fixo sobre a barra de abas, à direita. Usado para criar (publicação, dieta, treino). */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayoutLargo } from '../lib/largura';
import { cores, DEGRADE, FIM_DIAGONAL, INICIO_DIAGONAL, larguraMax, estilos, temaAtual } from '../tema';
import { Icone } from './Icone';

export function BotaoMais({ rotulo, aoPressionar }: { rotulo: string; aoPressionar: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { largo } = useLayoutLargo();   // no computador não há barra embaixo
  return (
    <View pointerEvents="box-none" style={[st.faixa, { bottom: insets.bottom + (largo ? 28 : 6 + 62 + 12) }]}>
      <View pointerEvents="box-none" style={{ width: largo ? '100%' : Math.min(width, larguraMax), alignItems: 'flex-end', paddingRight: 20 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={aoPressionar} style={({ pressed }) => [st.mais, pressed && { transform: [{ scale: 0.94 }] }]}>
          {temaAtual() === 'normal' ? <LinearGradient pointerEvents="none" colors={DEGRADE.roxo} start={INICIO_DIAGONAL} end={FIM_DIAGONAL} style={[StyleSheet.absoluteFill, { borderRadius: 29 }]} /> : null}
          <View pointerEvents="none" style={{ zIndex: 1 }}><Icone nome="mais" tamanho={28} cor="#ffffff" espessura={2} /></View>
        </Pressable>
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  faixa: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  mais: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: cores.destaqueForte, borderWidth: 1, borderColor: 'rgba(196,168,255,0.35)', boxShadow: '0 12px 28px -10px rgba(106,0,212,0.9)' },
}));
