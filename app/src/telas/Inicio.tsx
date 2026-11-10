/* A primeira tela de quem não está logado: o orbe do RONDIN, na moldura de instrumento, e as duas opções, entrar ou criar
   conta. Qualquer uma das duas abre a conversa com o RONDIN (telas/Rondin.tsx). O orbe acompanha o cursor e responde ao toque. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { aquecerApi } from '../api/cliente';
import type { ResultadoSocial } from '../api/loginSocial';
import { BotoesSociais } from '../componentes/BotoesSociais';
import { FundoCena } from '../componentes/FundoCena';
import { Orbe } from '../componentes/Orbe';
import { Botao, T } from '../componentes/Ui';
import { cores, estilos } from '../tema';

export function Inicio({ aoCriar, aoEntrar, aoSocial }: { aoCriar: () => void; aoEntrar: () => void; aoSocial: (r: ResultadoSocial) => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useEffect(() => { aquecerApi(); }, []);   // acorda o servidor enquanto a pessoa decide entre entrar e criar conta
  /* no navegador, a coluna inteira (orbe, letras e botões) escala com a janela: 1 = um celular de 390 px. Encolhe em tela
     estreita ou baixa, para caber sem rolar, e cresce só um pouco em tela grande (antes dobrava de tamanho no computador). */
  const k = Platform.OS === 'web' ? Math.min(1.15, Math.max(0.78, Math.min(width / 390, height / 700))) : 1;
  const orbe = Math.round(Math.min(300, (width / k) * 0.78, (height / k) * 0.4));
  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* a serra ao anoitecer ao fundo, em cores, com um véu escuro só o bastante para o texto e os botões ficarem fáceis de ler */}
      <FundoCena cena="noite" forca={1} veu={false} />
      <LinearGradient pointerEvents="none" colors={['#000000', 'rgba(8,4,20,0.3)', 'rgba(8,4,20,0.22)', 'rgba(8,4,20,0.4)', '#000000']} locations={[0, 0.2, 0.5, 0.82, 1]} style={StyleSheet.absoluteFill} />
      <ScrollView
        style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }}
      >
        <View style={[st.coluna, k !== 1 ? ({ zoom: k } as object) : null]}>
          <View style={{ alignItems: 'center' }}>
            <Orbe hud tamanho={orbe} estado="quieto" aoPressionar={() => undefined} rotulo="RONDIN, o agente do RONDO" />
          </View>
          <T tam={width / k < 400 ? 28 : 32} peso="200" centro style={{ marginTop: 12, lineHeight: 38 }}>Oi, eu sou o RONDIN</T>
          <T tam={14.5} cor={cores.texto2} centro style={{ marginTop: 8, lineHeight: 22 }}>
            Eu converso com você para criar a sua conta e montar o seu treino, ou para te receber de volta.
          </T>
          <View style={{ marginTop: 24, gap: 11 }}>
            <Botao orbita titulo="Criar conta" icone="ia" aoPressionar={aoCriar} />
            <Botao tipo="fantasma" titulo="Já tenho conta" aoPressionar={aoEntrar} />
            <BotoesSociais aoResultado={aoSocial} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  /* a coluna tem um fundo escuro translúcido: o texto miúdo não disputa com a paisagem */
  coluna: { width: '100%', maxWidth: 400, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 22, borderRadius: 20, backgroundColor: 'rgba(8,5,18,0.6)' },
}));
