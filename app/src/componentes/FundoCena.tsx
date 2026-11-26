/* O fundo das telas de dentro do app. Desde 2026-11-17 (o vidro claro, pedido do dono): em vez das fotos de paisagem, um
   degradê lilás acinzentado com dois brilhos suaves, que dá ao vidro dos cartões algo para desfocar e refletir.
   Cada aba muda um pouco o lugar dos brilhos, para as telas não ficarem idênticas.
   O degradê e os brilhos acompanham o tema escolhido (CENA, em tema.ts; o claro desde 2026-11-26).
   (As telas do Rondin, a inicial e a conversa, não usam este fundo: o delas é preto e animado, em componentes/FundoRondin.) */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { CENA } from '../tema';

export type NomeCena = 'dia' | 'noite' | 'vale' | 'picos';

/* o lugar dos dois brilhos (em % da tela) em cada cena */
const BRILHOS: Record<NomeCena, [number, number, number, number]> = {
  dia: [18, 14, 86, 62],
  noite: [82, 10, 12, 70],
  vale: [70, 22, 20, 84],
  picos: [24, 30, 80, 88],
};

/* a cena de cada tela: as cinco abas têm cenas diferentes entre si */
const DA_TELA: Record<string, NomeCena> = { home: 'picos', treino: 'dia', comunidade: 'vale', dieta: 'dia', perfil: 'noite', hoje: 'vale', evolucao: 'dia', recado: 'picos', colecoes: 'noite', notificacoes: 'picos' };
export const cenaDaTela = (tela: string): NomeCena => DA_TELA[tela] ?? 'noite';

export function FundoCena({ cena }: { cena: NomeCena; forca?: number; veu?: boolean }) {
  const [x1, y1, x2, y2] = BRILHOS[cena];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <LinearGradient colors={CENA.degrade} locations={[0, 0.5, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="brilho-claro" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={CENA.claro} stopOpacity={CENA.claroForca} />
            <Stop offset="1" stopColor={CENA.claro} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="brilho-roxo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={CENA.roxo} stopOpacity={CENA.roxoForca} />
            <Stop offset="1" stopColor={CENA.roxo} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={`${x1}%`} cy={`${y1}%`} rx="48%" ry="30%" fill="url(#brilho-claro)" />
        <Ellipse cx={`${x2}%`} cy={`${y2}%`} rx="70%" ry="42%" fill="url(#brilho-roxo)" />
      </Svg>
    </View>
  );
}
