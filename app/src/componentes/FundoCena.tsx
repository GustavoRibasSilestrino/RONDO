/* A foto de paisagem que fica no fundo das telas de dentro do app (as mesmas do site, em assets/cenas).
   Para o texto continuar fácil de ler, a foto entra a meia força e nasce do preto: degradê cheio do preto no alto e embaixo.
   (As telas do Rondin, a inicial e a conversa, não usam foto: o fundo delas é preto e animado, em componentes/FundoRondin.) */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export type NomeCena = 'dia' | 'noite' | 'vale' | 'picos';

const CENAS: Record<NomeCena, number> = {
  dia: require('../../assets/cenas/serra-dia.webp'),
  noite: require('../../assets/cenas/serra-noite.webp'),
  vale: require('../../assets/cenas/vale-nuvens.webp'),
  picos: require('../../assets/cenas/picos-noite.webp'),
};

/* a foto de cada tela: as cinco abas têm fotos diferentes entre si */
const DA_TELA: Record<string, NomeCena> = { home: 'picos', treino: 'dia', comunidade: 'vale', dieta: 'dia', perfil: 'noite', hoje: 'vale', evolucao: 'dia', recado: 'picos', colecoes: 'noite', notificacoes: 'picos' };
export const cenaDaTela = (tela: string): NomeCena => DA_TELA[tela] ?? 'noite';

export function FundoCena({ cena, forca = 0.55, veu = true }: { cena: NomeCena; forca?: number; veu?: boolean }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Image source={CENAS[cena]} resizeMode="cover" accessibilityIgnoresInvertColors style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: forca }]} />
      {/* a foto nasce do preto: preto cheio no alto e embaixo, meia força no meio */}
      {veu ? <LinearGradient colors={['#07060b', 'rgba(7,6,11,0.55)', 'rgba(7,6,11,0.22)', 'rgba(7,6,11,0.55)', '#07060b']} locations={[0, 0.16, 0.45, 0.8, 1]} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}
