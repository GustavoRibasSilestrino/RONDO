/* A primeira tela de quem não está logado: o orbe do RONDIN e as duas opções, entrar ou criar conta. Qualquer uma das
   duas abre a conversa com o RONDIN (telas/Rondin.tsx). */
import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orbe } from '../componentes/Orbe';
import { Botao, T } from '../componentes/Ui';
import { cores, estilos } from '../tema';

export function Inicio({ aoCriar, aoEntrar }: { aoCriar: () => void; aoEntrar: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const orbe = Math.round(Math.min(280, width * 0.7, height * 0.36));
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScrollView
        style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }}
      >
        <View style={st.coluna}>
          <View style={{ alignItems: 'center' }}>
            <Orbe tamanho={orbe} estado="quieto" />
          </View>
          <T tam={width < 400 ? 30 : 34} peso="200" centro style={{ marginTop: 18, lineHeight: 40 }}>Oi, eu sou o RONDIN</T>
          <T tam={15} cor={cores.texto2} centro style={{ marginTop: 8, lineHeight: 22 }}>
            O agente do RONDO. Eu converso com você para criar a sua conta e montar o seu treino, ou para te receber de volta.
          </T>
          <View style={{ marginTop: 28, gap: 12 }}>
            <Botao orbita titulo="Criar conta" icone="ia" aoPressionar={aoCriar} />
            <Botao tipo="fantasma" titulo="Já tenho conta" aoPressionar={aoEntrar} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  coluna: { width: '100%', maxWidth: 400 },
}));
