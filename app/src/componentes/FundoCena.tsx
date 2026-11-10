/* A foto de paisagem que fica no fundo das telas (as mesmas do site, em assets/cenas).
   Para o texto continuar fácil de ler, a foto entra a meia força e nasce do preto: degradê cheio do preto no alto e embaixo.

   A foto "rondo" (a serra com o nome RONDO esculpido) é o fundo do Rondin, e ali o nome tem de aparecer inteiro, sem nada na
   frente. Por isso ela não é só "cobrir a tela": `posicaoDoNome` calcula o tamanho e o lugar da foto para o nome ficar no alto,
   inteiro, e devolve onde o nome termina (`base`); as telas do Rondin começam o conteúdo abaixo disso. */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';

export type NomeCena = 'dia' | 'noite' | 'vale' | 'picos' | 'rondo';

const CENAS: Record<NomeCena, number> = {
  dia: require('../../assets/cenas/serra-dia.webp'),
  noite: require('../../assets/cenas/serra-noite.webp'),
  vale: require('../../assets/cenas/vale-nuvens.webp'),
  picos: require('../../assets/cenas/picos-noite.webp'),
  rondo: require('../../assets/cenas/rondo-montanhas.webp'),   // a serra com o nome RONDO: o fundo do Rondin
};

/* a foto de cada tela: as cinco abas têm fotos diferentes entre si */
const DA_TELA: Record<string, NomeCena> = { home: 'picos', treino: 'dia', comunidade: 'vale', dieta: 'dia', perfil: 'noite', hoje: 'vale', evolucao: 'dia', recado: 'picos', colecoes: 'noite', notificacoes: 'picos' };
export const cenaDaTela = (tela: string): NomeCena => DA_TELA[tela] ?? 'noite';

/* Na foto do RONDO (1672 x 941), o nome vai de 28% a 83% da largura e de 30% a 46% da altura. */
const PROPORCAO = 1672 / 941;
const NOME = { esq: 0.28, dir: 0.83, topo: 0.3, base: 0.46 };
const MARGEM_TOPO = 20;   // o nome começa um pouco abaixo da borda de cima

export function posicaoDoNome(W: number, H: number): { foto: { left: number; top: number; width: number; height: number }; base: number } {
  const deitada = W >= H * 0.9;
  /* computador: a foto cobre a tela inteira, com o nome no alto; celular: a foto ocupa a largura no alto e o resto é escuro */
  let h = deitada ? Math.max((W * 1.32) / PROPORCAO, (H - MARGEM_TOPO) / (1 - NOME.topo)) : (W * 1.5) / PROPORCAO;
  /* o nome nunca passa das bordas: se a foto ficou larga demais, encolhe */
  h = Math.min(h, (W * 0.96) / ((NOME.dir - NOME.esq) * PROPORCAO));
  const w = h * PROPORCAO;
  const top = deitada ? MARGEM_TOPO - NOME.topo * h : 0;
  const left = W / 2 - ((NOME.esq + NOME.dir) / 2) * w;
  return { foto: { left, top, width: w, height: h }, base: top + NOME.base * h };
}

export function FundoCena({ cena, forca = 0.55, veu = true }: { cena: NomeCena; forca?: number; veu?: boolean }) {
  const { width, height } = useWindowDimensions();
  const foto = cena === 'rondo'
    ? <Image source={CENAS.rondo} resizeMode="cover" accessibilityIgnoresInvertColors style={{ position: 'absolute', ...posicaoDoNome(width, height).foto, opacity: forca }} />
    : <Image source={CENAS[cena]} resizeMode="cover" accessibilityIgnoresInvertColors style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: forca }]} />;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {foto}
      {/* a foto nasce do preto: preto cheio no alto e embaixo, meia força no meio */}
      {veu ? <LinearGradient colors={['#07060b', 'rgba(7,6,11,0.55)', 'rgba(7,6,11,0.22)', 'rgba(7,6,11,0.55)', '#07060b']} locations={[0, 0.16, 0.45, 0.8, 1]} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}
