/* O fundo do tema Ultra, "aurora de vidro": um céu azul-noite com uma única luz fria que vem de cima (azul-cobalto), e duas luzes
   bem mais fracas (ciano e índigo) que dão profundidade nos cantos. Tudo se desloca muito devagar (40 a 56 s) só para o fundo
   não parecer uma foto parada. Sem estrelas e sem piso de grade: os cartões de vidro ficam por cima de uma superfície calma,
   e o texto nunca disputa com pontinhos nem com uma linha de horizonte.
   Fica atrás de tudo. No navegador a animação é do próprio CSS (só move camadas); no aparelho, Animated com o driver nativo. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useMovimentoReduzido } from '../lib/movimento';

const web = Platform.OS === 'web';

/* animação em CSS (navegador): vai e volta entre dois estados, para sempre */
const cssVaiEVolta = (de: object, para: object, ms: number, atrasoMs = 0): object => ({
  animationKeyframes: { '0%': de, '100%': para },
  animationDuration: `${ms}ms`, animationDelay: `${atrasoMs}ms`, animationIterationCount: 'infinite',
  animationDirection: 'alternate', animationTimingFunction: 'ease-in-out',
});

/* uma mancha de luz: círculo com degradê radial que se desloca e cresce devagar */
function Mancha({ cor, tamanho, x0, y0, dx, dy, duracao, atraso = 0, forca, parado }: { cor: string; tamanho: number; x0: number; y0: number; dx: number; dy: number; duracao: number; atraso?: number; forca: number; parado: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (web || parado) return undefined;
    const laco = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: duracao, delay: atraso, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(t, { toValue: 0, duration: duracao, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    laco.start();
    return () => laco.stop();
  }, [t, duracao, atraso, parado]);
  const id = `m${cor.replace('#', '')}${Math.round(tamanho)}`;
  const base = { position: 'absolute' as const, left: x0 - tamanho / 2, top: y0 - tamanho / 2, width: tamanho, height: tamanho };
  const desenho = (
    <Svg width={tamanho} height={tamanho}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={cor} stopOpacity={forca} />
          <Stop offset="0.45" stopColor={cor} stopOpacity={forca * 0.35} />
          <Stop offset="1" stopColor={cor} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={tamanho / 2} cy={tamanho / 2} r={tamanho / 2} fill={`url(#${id})`} />
    </Svg>
  );
  if (web) {
    const mov = parado ? null : cssVaiEVolta({ transform: 'translate3d(0px,0px,0) scale(1)' }, { transform: `translate3d(${Math.round(dx)}px,${Math.round(dy)}px,0) scale(1.12)` }, duracao, atraso);
    return <View pointerEvents="none" style={[base, mov as object, { willChange: 'transform' } as object]}>{desenho}</View>;
  }
  return (
    <Animated.View pointerEvents="none" style={[base, { transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) }, { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]}>
      {desenho}
    </Animated.View>
  );
}

export function FundoUltra() {
  const { width: W, height: H } = useWindowDimensions();
  const parado = useMovimentoReduzido();
  const m = Math.max(520, Math.min(Math.max(W, H), 1300));   // tamanho de referência: não cresce sem fim em telas grandes
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient pointerEvents="none" colors={['#050816', '#060a1f', '#04061a']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* a luz principal: azul-cobalto, de cima e da esquerda */}
      <Mancha cor="#3a5cff" tamanho={m * 1.4} x0={W * 0.18} y0={-H * 0.02} dx={W * 0.12} dy={H * 0.05} duracao={46000} forca={0.34} parado={parado} />
      {/* duas luzes de apoio, bem mais fracas: ciano no meio da direita e índigo no pé da tela */}
      <Mancha cor="#1fb5d8" tamanho={m * 1.0} x0={W * 1.02} y0={H * 0.52} dx={-W * 0.1} dy={H * 0.06} duracao={56000} atraso={2000} forca={0.15} parado={parado} />
      <Mancha cor="#5b4bff" tamanho={m * 1.1} x0={W * 0.08} y0={H * 0.96} dx={W * 0.12} dy={-H * 0.04} duracao={50000} atraso={4000} forca={0.17} parado={parado} />
      {/* vinheta: escurece as pontas (o cabeçalho e a barra leem melhor) e deixa a luz no centro */}
      <LinearGradient pointerEvents="none" colors={['rgba(2,4,14,0.45)', 'rgba(2,4,14,0)', 'rgba(2,4,14,0)', 'rgba(2,4,14,0.5)']} locations={[0, 0.2, 0.72, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}
