/* A primeira tela de quem não está logado: o orbe do RONDIN e as duas opções, entrar ou criar conta. Qualquer uma das
   duas abre a conversa com o RONDIN (telas/Rondin.tsx). */
import { LinearGradient } from 'expo-linear-gradient';
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
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <LinearGradient pointerEvents="none" colors={['rgba(106,0,212,0.38)', 'rgba(106,0,212,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 460 }} />
      <ScrollView
        style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }}
      >
        <View style={st.coluna}>
          <View style={{ alignItems: 'center' }}>
            <Orbe tamanho={orbe} estado="quieto" />
          </View>
          <T tam={13} peso="500" cor={cores.destaque2} centro style={{ letterSpacing: 3, marginTop: -4 }}>RONDIN</T>
          <T tam={width < 400 ? 30 : 34} peso="200" centro style={{ marginTop: 10, lineHeight: 40 }}>Oi, eu sou o RONDIN</T>
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
