/* O fundo do tema Ultra: uma aurora de luz azul, ciano e violeta que flutua devagar, e ondas finas que deslizam embaixo.
   Fica atrás de tudo; as telas e os cartões de vidro deixam essa luz passar. */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { useMovimentoReduzido } from '../lib/movimento';

function Mancha({ cor, tamanho, x0, y0, dx, dy, duracao, atraso = 0, parado }: { cor: string; tamanho: number; x0: number; y0: number; dx: number; dy: number; duracao: number; atraso?: number; parado: boolean }) {
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
  const id = `m${cor.replace('#', '')}`;
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: x0 - tamanho / 2, top: y0 - tamanho / 2, width: tamanho, height: tamanho, transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) }, { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }}
    >
      <Svg width={tamanho} height={tamanho}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={cor} stopOpacity="0.55" />
            <Stop offset="0.55" stopColor={cor} stopOpacity="0.16" />
            <Stop offset="1" stopColor={cor} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={tamanho / 2} cy={tamanho / 2} r={tamanho / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/* três linhas de onda, uma sobre a outra, que correm de lado em velocidades diferentes */
function Ondas({ largura, altura, parado }: { largura: number; altura: number; parado: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  const nativo = Platform.OS !== 'web';
  const L = 320;
  useEffect(() => {
    if (parado) return undefined;
    const la = Animated.loop(Animated.timing(a, { toValue: -L, duration: 9000, easing: Easing.linear, useNativeDriver: nativo }));
    const lb = Animated.loop(Animated.timing(b, { toValue: L, duration: 14000, easing: Easing.linear, useNativeDriver: nativo }));
    la.start(); lb.start();
    return () => { la.stop(); lb.stop(); };
  }, [a, b, nativo, parado]);
  const w = largura + 2 * L;
  const onda = (amp: number, fase: number) => {
    let d = '';
    for (let x = 0; x <= w; x += 10) d += `${x === 0 ? 'M' : 'L'}${x} ${(26 + amp * Math.sin((2 * Math.PI * x) / L + fase)).toFixed(1)} `;
    return d;
  };
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', left: -L, bottom: 0, transform: [{ translateX: a }] }}>
        <Svg width={w} height={60}><Path d={onda(14, 0)} fill="none" stroke="rgba(95,212,255,0.30)" strokeWidth={1.5} /></Svg>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: -L, bottom: 8, transform: [{ translateX: b }] }}>
        <Svg width={w} height={60}><Path d={onda(10, 2)} fill="none" stroke="rgba(120,140,255,0.28)" strokeWidth={1.5} /></Svg>
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: -L, bottom: 16, transform: [{ translateX: a }] }}>
        <Svg width={w} height={60}><Path d={onda(7, 4)} fill="none" stroke="rgba(159,243,255,0.2)" strokeWidth={1} /></Svg>
      </Animated.View>
    </View>
  );
}

export function FundoUltra() {
  const { width: W, height: H } = useWindowDimensions();
  const parado = useMovimentoReduzido();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Mancha cor="#2f6bff" tamanho={W * 1.5} x0={W * 0.15} y0={H * 0.12} dx={W * 0.25} dy={H * 0.1} duracao={11000} parado={parado} />
      <Mancha cor="#00d4ff" tamanho={W * 1.3} x0={W * 0.95} y0={H * 0.45} dx={-W * 0.3} dy={H * 0.12} duracao={15000} atraso={1500} parado={parado} />
      <Mancha cor="#8a5cff" tamanho={W * 1.4} x0={W * 0.2} y0={H * 0.92} dx={W * 0.35} dy={-H * 0.1} duracao={13000} atraso={800} parado={parado} />
      <Ondas largura={W} altura={H} parado={parado} />
    </View>
  );
}
