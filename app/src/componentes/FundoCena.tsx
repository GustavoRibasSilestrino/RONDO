/* A paisagem ilustrada que fica no fundo das telas: desenho plano, em camadas (céu, serras, pinheiros, cidade, lago), em cores
   de verdade, o mesmo do site. Cada cena tem a versão de pé (celular) e a deitada (computador); a escolha é pela proporção
   da janela. As imagens são geradas por vitrine/scripts/cenas/cenas.mjs e ficam em assets/cenas.
   Para o texto continuar fácil de ler, a cena entra a meia força e com um véu escuro por cima, mais forte embaixo. */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';

export type NomeCena = 'entardecer' | 'noite' | 'lago' | 'pista' | 'campo';

const CENAS: Record<NomeCena, { r: number; l: number }> = {
  entardecer: { r: require('../../assets/cenas/entardecer-r.webp'), l: require('../../assets/cenas/entardecer-l.webp') },
  noite: { r: require('../../assets/cenas/noite-r.webp'), l: require('../../assets/cenas/noite-l.webp') },
  lago: { r: require('../../assets/cenas/lago-r.webp'), l: require('../../assets/cenas/lago-l.webp') },
  pista: { r: require('../../assets/cenas/pista-r.webp'), l: require('../../assets/cenas/pista-l.webp') },
  campo: { r: require('../../assets/cenas/campo-r.webp'), l: require('../../assets/cenas/campo-l.webp') },
};

/* a cena de cada tela do app */
const DA_TELA: Record<string, NomeCena> = {
  home: 'entardecer', treino: 'pista', comunidade: 'campo', dieta: 'lago', perfil: 'noite',
  hoje: 'campo', evolucao: 'pista', recado: 'noite', colecoes: 'entardecer', notificacoes: 'noite',
};
export const cenaDaTela = (tela: string): NomeCena => DA_TELA[tela] ?? 'entardecer';

export function FundoCena({ cena, forca = 0.55, veu = true }: { cena: NomeCena; forca?: number; veu?: boolean }) {
  const { width, height } = useWindowDimensions();
  const fonte = CENAS[cena][width > height ? 'l' : 'r'];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={fonte} resizeMode="cover" accessibilityIgnoresInvertColors style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: forca }]} />
      {veu ? <LinearGradient colors={['rgba(7,6,11,0.42)', 'rgba(7,6,11,0.18)', 'rgba(7,6,11,0.7)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}
