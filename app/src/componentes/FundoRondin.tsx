/* O fundo da conversa com o RONDIN no celular: o mesmo preto com ondas de voz, poeira de luz em três profundidades e névoas
   roxas de FundoRondin.web.tsx, mas com Animated e o driver nativo (só transform e opacity, que correm fora da thread do JS).
   Tudo bem fraco, para o texto mandar. Quem pede "reduzir movimento" no aparelho vê a cena parada. */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useMovimentoReduzido } from '../lib/movimento';
import type { EstadoOrbe } from '../lib/orbe';

type Props = { estado: EstadoOrbe; cx?: number; cy?: number };

const ONDAS = 4;
const CICLO = 14000;   // milissegundos de uma onda, do orbe até a borda: devagar, para não competir com o texto
const FORCA: Record<EstadoOrbe, number> = { falando: 0.85, ouvindo: 0.5, pensando: 0.65, quieto: 0.4 };

/* roda uma animação de 0 a 1 para sempre, começando de um ponto qualquer do ciclo (para as ondas não nascerem juntas) */
function useCiclo(duracao: number, comeco: number, parado: boolean, easing: (v: number) => number = Easing.linear): Animated.Value {
  const t = useRef(new Animated.Value(comeco)).current;
  useEffect(() => {
    if (parado) { t.setValue(comeco); return undefined; }
    let vivo = true;
    const rodar = (de: number) => {
      t.setValue(de);
      Animated.timing(t, { toValue: 1, duration: duracao * (1 - de), easing, useNativeDriver: true }).start(({ finished }) => { if (finished && vivo) rodar(0); });
    };
    rodar(comeco);
    return () => { vivo = false; t.stopAnimation(); };
  }, [t, duracao, comeco, parado, easing]);
  return t;
}

const sai = Easing.bezier(0.22, 0.61, 0.36, 1);

function Onda({ x, y, D, indice, parado }: { x: number; y: number; D: number; indice: number; parado: boolean }) {
  const t = useCiclo(CICLO, indice / ONDAS, parado, sai);
  const escala = parado ? (indice === 0 ? 0.42 : 0.78) : t.interpolate({ inputRange: [0, 1], outputRange: [0.14, 1] });
  const opacidade = parado ? (indice === 0 ? 0.3 : indice === 1 ? 0.16 : 0) : t.interpolate({ inputRange: [0, 0.12, 0.52, 1], outputRange: [0, 1, 0.35, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x - D / 2, top: y - D / 2, width: D, height: D, borderRadius: D / 2,
        borderWidth: 1, borderColor: 'rgba(196,168,255,0.24)', backgroundColor: 'rgba(124,58,237,0.02)',
        opacity: opacidade, transform: [{ scale: escala as never }],
      }}
    />
  );
}

/* a poeira, em três profundidades: quanto mais perto, maior, mais rápida e mais forte */
const CAMADAS = [
  { n: 6, tam: [1, 1.5], dur: [34000, 46000], subida: 160, pico: 0.22, balanco: 6 },
  { n: 4, tam: [1.5, 2.1], dur: [26000, 34000], subida: 280, pico: 0.34, balanco: 10 },
  { n: 3, tam: [2.1, 2.9], dur: [19000, 26000], subida: 430, pico: 0.5, balanco: 16 },
] as const;

function Grao({ x, y, tam, dur, comeco, camada, lilas, parado }: { x: number; y: number; tam: number; dur: number; comeco: number; camada: number; lilas: boolean; parado: boolean }) {
  const t = useCiclo(dur, comeco, parado);
  const c = CAMADAS[camada];
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x, top: y, width: tam, height: tam, borderRadius: tam,
        backgroundColor: lilas ? 'rgb(196,168,255)' : '#ffffff',
        opacity: parado ? c.pico * 0.5 : t.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, c.pico, c.pico * 0.7, 0] }),
        transform: parado ? [] : [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -c.subida] }) },
          /* balança de um lado a outro enquanto sobe */
          { translateX: t.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, c.balanco, 0, -c.balanco, 0] }) },
        ],
      }}
    />
  );
}

/* uma névoa: um borrão roxo que faz um passeio largo e lento e volta ao ponto de partida */
function Nevoa({ x, y, m, cor, forca, dur, dx, dy, parado }: { x: number; y: number; m: number; cor: string; forca: number; dur: number; dx: number; dy: number; parado: boolean }) {
  const t = useCiclo(dur, 0, parado);
  const id = `n${cor.replace('#', '')}${Math.round(m)}`;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x - m / 2, top: y - m / 2, width: m, height: m,
        transform: parado ? [] : [
          { translateX: t.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0, dx, -dx * 0.5, 0] }) },
          { translateY: t.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0, dy, dy * 0.6, 0] }) },
          { scale: t.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [1, 1.1, 1.04, 1] }) },
        ],
      }}
    >
      <Svg width={m} height={m}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={cor} stopOpacity={forca} />
            <Stop offset="0.45" stopColor={cor} stopOpacity={forca * 0.4} />
            <Stop offset="0.7" stopColor={cor} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={m / 2} cy={m / 2} r={m / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

function sorteio(semente: number) {
  let s = semente;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

export function FundoRondin({ estado, cx, cy }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const parado = useMovimentoReduzido();
  const x0 = cx ?? W / 2, y0 = cy ?? H * 0.28;
  const D = Math.round(Math.max(760, Math.min(1500, Math.max(W, H) * 1.15)));
  const m = Math.max(W, H);
  const forca = useRef(new Animated.Value(FORCA[estado])).current;
  useEffect(() => {
    Animated.timing(forca, { toValue: FORCA[estado], duration: parado ? 0 : 900, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }).start();
  }, [estado, parado, forca]);
  const graos = useMemo(() => {
    const r = sorteio(7);
    return CAMADAS.flatMap((c, camada) => Array.from({ length: c.n }, () => ({
      x: r() * W, y: H * (0.2 + r() * 0.9), tam: c.tam[0] + r() * (c.tam[1] - c.tam[0]),
      dur: c.dur[0] + r() * (c.dur[1] - c.dur[0]), comeco: r(), camada, lilas: r() < 0.45,
    })));
  }, [W, H]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: '#000000' }]}>
      <Nevoa x={W * 0.06} y={H * 1.02} m={m * 0.95} cor="#5b21b6" forca={0.1} dur={38000} dx={m * 0.085} dy={-m * 0.066} parado={parado} />
      <Nevoa x={W * 0.98} y={H * 0.5} m={m * 0.7} cor="#7c3aed" forca={0.06} dur={52000} dx={-m * 0.056} dy={m * 0.042} parado={parado} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: forca }]}>
        {Array.from({ length: ONDAS }, (_, i) => <Onda key={i} x={x0} y={y0} D={D} indice={i} parado={parado} />)}
      </Animated.View>
      {graos.map((g, i) => <Grao key={i} x={g.x} y={g.y} tam={g.tam} dur={g.dur} comeco={g.comeco} camada={g.camada} lilas={g.lilas} parado={parado} />)}
    </View>
  );
}
