/* A seta redonda de voltar, no alto à esquerda, abaixo do cabeçalho do app. Aparece nas telas que se abrem de dentro do Perfil
   (Hoje, Evolução, Coleções e Recados), que não têm a barra de abas própria para voltar. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayoutLargo } from '../lib/largura';
import { cores, estilos, larguraMax } from '../tema';
import { ALTURA_CABECALHO } from './CabecalhoApp';
import { Icone } from './Icone';

export function BotaoVoltar({ rotulo, aoPressionar }: { rotulo: string; aoPressionar: () => void }) {
  const insets = useSafeAreaInsets();
  const { largo } = useLayoutLargo();   // no computador não há cabeçalho em cima
  return (
    <View pointerEvents="box-none" style={[st.faixa, { top: insets.top + (largo ? 16 : ALTURA_CABECALHO + 8) }]}>
      <View pointerEvents="box-none" style={st.coluna}>
        <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={aoPressionar} hitSlop={6} style={({ pressed }) => [st.botao, pressed && { opacity: 0.8 }]}>
          <Icone nome="voltar" tamanho={20} cor="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  faixa: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 15 },
  coluna: { width: '100%', maxWidth: larguraMax, paddingLeft: 12 },
  botao: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2, borderWidth: 1, borderColor: cores.linha2 },
}));
