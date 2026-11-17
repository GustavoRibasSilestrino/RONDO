/* O +, fixo sobre a barra de abas, à direita. Usado para criar (publicação, dieta, treino).
   Desde 2026-11-17 é de vidro, como a barra e os cartões: branco translúcido com desfoque, borda clara e o + roxo-escuro. */
import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayoutLargo } from '../lib/largura';
import { cores, larguraMax, estilos, VIDRO } from '../tema';
import { Icone } from './Icone';

export function BotaoMais({ rotulo, aoPressionar }: { rotulo: string; aoPressionar: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { largo } = useLayoutLargo();   // no computador não há barra embaixo
  return (
    <View pointerEvents="box-none" style={[st.faixa, { bottom: insets.bottom + (largo ? 28 : 16 + 62 + 12) }]}>
      <View pointerEvents="box-none" style={{ width: largo ? '100%' : Math.min(width, larguraMax), alignItems: 'flex-end', paddingRight: 20 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={aoPressionar} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.mais, hovered && st.maisSobre, pressed && { transform: [{ scale: 0.94 }] }]}>
          <View pointerEvents="none" style={{ zIndex: 1 }}><Icone nome="mais" tamanho={28} cor={cores.texto} espessura={2} /></View>
        </Pressable>
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  faixa: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  mais: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', boxShadow: '0 12px 28px -12px rgba(42,22,80,0.55)', ...VIDRO },
  maisSobre: { backgroundColor: 'rgba(214,212,220,0.92)' },   // cursor em cima: cinza claro, como os outros botões
}));
