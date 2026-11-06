/* O fundo do tema preto: bolas roxas bem borradas que flutuam devagar atrás de tudo, como no topo do site.
   Cada bola é um degradê radial (centro roxo, borda transparente), então o borrão é de verdade e não pesa. */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useMovimentoReduzido } from '../lib/movimento';

type Props = { cor: string; tamanho: number; x0: number; y0: number; dx: number; dy: number; duracao: number; forca?: number; atraso?: number; parado: boolean };

function Bola({ cor, tamanho, x0, y0, dx, dy, duracao, forca = 0.5, atraso = 0, parado }: Props) {
  const t = useRef(new Animated.Value(0)).current;
  const nativo = Platform.OS !== 'web';
  useEffect(() => {
    if (parado) return undefined;
    const laco = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: duracao, delay: atraso, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
      Animated.timing(t, { toValue: 0, duration: duracao, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
    ]));
    laco.start();
    return () => laco.stop();
  }, [t, duracao, atraso, nativo, parado]);
  const id = `b${cor.replace('#', '')}${Math.round(tamanho)}`;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x0 - tamanho / 2, top: y0 - tamanho / 2, width: tamanho, height: tamanho,
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
        ],
      }}
    >
      <Svg width={tamanho} height={tamanho}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={cor} stopOpacity={forca} />
            <Stop offset="0.45" stopColor={cor} stopOpacity={forca * 0.45} />
            <Stop offset="0.8" stopColor={cor} stopOpacity={forca * 0.1} />
            <Stop offset="1" stopColor={cor} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={tamanho / 2} cy={tamanho / 2} r={tamanho / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export function FundoBolhas() {
  const { width: W, height: H } = useWindowDimensions();
  const parado = useMovimentoReduzido();
  const m = Math.max(520, Math.min(Math.max(W, H), 1200));   // o tamanho de referência: não cresce sem fim em telas grandes
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Bola cor="#7c3aed" tamanho={m * 0.95} x0={W * 0.12} y0={H * 0.1} dx={W * 0.12} dy={H * 0.08} duracao={12000} forca={0.5} parado={parado} />
      <Bola cor="#a855f7" tamanho={m * 0.7} x0={W * 0.92} y0={H * 0.3} dx={-W * 0.14} dy={H * 0.1} duracao={15000} forca={0.38} atraso={1200} parado={parado} />
      <Bola cor="#5b21b6" tamanho={m * 1.0} x0={W * 0.78} y0={H * 0.95} dx={-W * 0.16} dy={-H * 0.07} duracao={14000} forca={0.5} atraso={600} parado={parado} />
      <Bola cor="#6d28d9" tamanho={m * 0.75} x0={W * 0.1} y0={H * 0.88} dx={W * 0.14} dy={-H * 0.1} duracao={17000} forca={0.36} atraso={2000} parado={parado} />
    </View>
  );
}
