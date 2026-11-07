/* O fundo do tema Ultra: um céu quase preto com uma aurora de luz (ciano, azul elétrico, violeta e magenta) que respira devagar,
   um campo de estrelas que pisca em ritmos diferentes e, embaixo, um piso de grade neon que foge para o horizonte.
   Fica atrás de tudo; os cartões de vidro deixam essa luz passar. No navegador as animações são do próprio CSS (só movem camadas,
   sem refazer nada a cada quadro); no aparelho, Animated com o driver nativo. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as GradienteSvg, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useMovimentoReduzido } from '../lib/movimento';

const web = Platform.OS === 'web';

/* animação em CSS (navegador): vai e volta entre dois estados, para sempre */
const cssVaiEVolta = (de: object, para: object, ms: number, atrasoMs = 0): object => ({
  animationKeyframes: { '0%': de, '100%': para },
  animationDuration: `${ms}ms`, animationDelay: `${atrasoMs}ms`, animationIterationCount: 'infinite',
  animationDirection: 'alternate', animationTimingFunction: 'ease-in-out',
});

/* uma mancha de luz: círculo com degradê radial que se desloca e cresce devagar */
function Mancha({ cor, tamanho, x0, y0, dx, dy, duracao, atraso = 0, forca = 0.55, parado }: { cor: string; tamanho: number; x0: number; y0: number; dx: number; dy: number; duracao: number; atraso?: number; forca?: number; parado: boolean }) {
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
          <Stop offset="0.5" stopColor={cor} stopOpacity={forca * 0.3} />
          <Stop offset="1" stopColor={cor} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={tamanho / 2} cy={tamanho / 2} r={tamanho / 2} fill={`url(#${id})`} />
    </Svg>
  );
  if (web) {
    const mov = parado ? null : cssVaiEVolta({ transform: 'translate3d(0px,0px,0) scale(1)' }, { transform: `translate3d(${Math.round(dx)}px,${Math.round(dy)}px,0) scale(1.2)` }, duracao, atraso);
    return <View pointerEvents="none" style={[base, mov as object, { willChange: 'transform' } as object]}>{desenho}</View>;
  }
  return (
    <Animated.View pointerEvents="none" style={[base, { transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) }, { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }] }]}>
      {desenho}
    </Animated.View>
  );
}

/* números "aleatórios" sempre iguais (as estrelas não mudam de lugar quando a tela se redesenha) */
function semente(n: number) {
  let s = n >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/* o campo de estrelas: três camadas que piscam em tempos diferentes, para o céu parecer vivo sem custar nada */
function Estrelas({ largura, altura, parado }: { largura: number; altura: number; parado: boolean }) {
  const camadas = useMemo(() => {
    const rnd = semente(7);
    return [0, 1, 2].map((c) => Array.from({ length: 34 }, () => ({
      x: rnd() * largura, y: rnd() * altura * 0.82, r: 0.5 + rnd() * (c === 0 ? 1.5 : 0.9), o: 0.35 + rnd() * 0.65, ciano: rnd() > 0.72,
    })));
  }, [largura, altura]);
  const ritmos = [{ ms: 3200, de: 0.35 }, { ms: 4700, de: 0.55 }, { ms: 6100, de: 0.25 }];
  return (
    <>
      {camadas.map((estrelas, c) => {
        const pisca = web && !parado ? cssVaiEVolta({ opacity: ritmos[c].de }, { opacity: 1 }, ritmos[c].ms, c * 900) : null;
        return (
          <View key={c} pointerEvents="none" style={[StyleSheet.absoluteFill, pisca as object]}>
            <Svg width={largura} height={altura}>
              {estrelas.map((e, k) => <Circle key={k} cx={e.x} cy={e.y} r={e.r} fill={e.ciano ? '#9fefff' : '#ffffff'} fillOpacity={e.o} />)}
            </Svg>
          </View>
        );
      })}
    </>
  );
}

/* o piso de grade neon: linhas que convergem para o horizonte, com uma luz fina em cima */
function Grade({ largura, altura }: { largura: number; altura: number }) {
  const h = Math.round(altura * 0.34);
  const linhasH = Array.from({ length: 9 }, (_, i) => Math.pow((i + 1) / 9, 2.1) * h);
  const linhasV = Array.from({ length: 17 }, (_, k) => k - 8);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h }}>
      <Svg width={largura} height={h}>
        <Defs>
          <GradienteSvg id="gradeV" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#00e0ff" stopOpacity="0" />
            <Stop offset="1" stopColor="#7a5cff" stopOpacity="0.26" />
          </GradienteSvg>
          <GradienteSvg id="horizonte" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#00e0ff" stopOpacity="0" />
            <Stop offset="0.3" stopColor="#37e6ff" stopOpacity="0.6" />
            <Stop offset="0.7" stopColor="#ff4fd8" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#ff4fd8" stopOpacity="0" />
          </GradienteSvg>
          <GradienteSvg id="brumaHorizonte" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#5a6bff" stopOpacity="0.28" />
            <Stop offset="1" stopColor="#5a6bff" stopOpacity="0" />
          </GradienteSvg>
        </Defs>
        <Rect x={0} y={0} width={largura} height={h * 0.5} fill="url(#brumaHorizonte)" />
        {linhasH.map((y, i) => <Line key={`h${i}`} x1={0} y1={y} x2={largura} y2={y} stroke="url(#gradeV)" strokeWidth={1} />)}
        {linhasV.map((k) => <Line key={`v${k}`} x1={largura / 2} y1={0} x2={largura / 2 + k * (largura / 5)} y2={h} stroke="url(#gradeV)" strokeWidth={1} />)}
        <Rect x={0} y={0} width={largura} height={1.5} fill="url(#horizonte)" />
      </Svg>
    </View>
  );
}

export function FundoUltra() {
  const { width: W, height: H } = useWindowDimensions();
  const parado = useMovimentoReduzido();
  const m = Math.max(520, Math.min(Math.max(W, H), 1300));   // tamanho de referência: não cresce sem fim em telas grandes
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient pointerEvents="none" colors={['#02030c', '#040620', '#0a0432']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <Mancha cor="#00d8ff" tamanho={m * 1.25} x0={W * 0.1} y0={H * 0.06} dx={W * 0.22} dy={H * 0.1} duracao={13000} forca={0.5} parado={parado} />
      <Mancha cor="#2f5bff" tamanho={m * 1.3} x0={W * 0.92} y0={H * 0.34} dx={-W * 0.26} dy={H * 0.12} duracao={17000} atraso={1500} forca={0.55} parado={parado} />
      <Mancha cor="#8a3dff" tamanho={m * 1.25} x0={W * 0.15} y0={H * 0.78} dx={W * 0.3} dy={-H * 0.1} duracao={15000} atraso={800} forca={0.55} parado={parado} />
      <Mancha cor="#ff3fd0" tamanho={m * 0.9} x0={W * 0.95} y0={H * 0.92} dx={-W * 0.25} dy={-H * 0.08} duracao={19000} atraso={2200} forca={0.36} parado={parado} />
      <Mancha cor="#00ffc6" tamanho={m * 0.7} x0={W * 0.55} y0={H * 0.04} dx={-W * 0.2} dy={H * 0.14} duracao={21000} atraso={3000} forca={0.26} parado={parado} />
      <Estrelas largura={W} altura={H} parado={parado} />
      <Grade largura={W} altura={H} />
      {/* vinheta: escurece as bordas e deixa a luz no centro */}
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,8,0.55)', 'rgba(0,0,8,0)', 'rgba(0,0,8,0)', 'rgba(0,0,8,0.5)']} locations={[0, 0.22, 0.7, 1]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}
