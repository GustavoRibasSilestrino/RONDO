/* A foto de paisagem que fica no fundo das telas: a serra de dia ou a serra ao anoitecer (as mesmas do site, em assets/cenas).
   Para o texto continuar fácil de ler, a foto entra a meia força e com um véu escuro por cima, mais forte embaixo. */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export type NomeCena = 'dia' | 'noite';

const CENAS: Record<NomeCena, number> = {
  dia: require('../../assets/cenas/serra-dia.webp'),
  noite: require('../../assets/cenas/serra-noite.webp'),
};

/* a foto de cada tela do app */
const DA_TELA: Record<string, NomeCena> = { home: 'noite', treino: 'dia', comunidade: 'dia', dieta: 'dia', perfil: 'noite', hoje: 'dia', evolucao: 'dia', recado: 'noite', colecoes: 'noite', notificacoes: 'noite' };
export const cenaDaTela = (tela: string): NomeCena => DA_TELA[tela] ?? 'noite';

export function FundoCena({ cena, forca = 0.55, veu = true }: { cena: NomeCena; forca?: number; veu?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={CENAS[cena]} resizeMode="cover" accessibilityIgnoresInvertColors style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: forca }]} />
      {veu ? <LinearGradient colors={['rgba(7,6,11,0.42)', 'rgba(7,6,11,0.18)', 'rgba(7,6,11,0.7)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}
