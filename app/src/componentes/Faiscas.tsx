/* As três estrelinhas do botão principal (como na referência do dono): uma grande, uma média e uma pequena, piscando cada uma
   no seu tempo. Cada estrela é uma vista própria animada com o driver nativo (opacidade e escala), então não pesa.
   Paradas para quem pede menos movimento. */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useMovimentoReduzido } from '../lib/movimento';

/* uma estrela de quatro pontas, de lados curvos, num quadrado de 24 */
const ESTRELA = 'M12 0Q12 12 24 12Q12 12 12 24Q12 12 0 12Q12 12 12 0Z';

const ESTRELAS = [
  { x: 0, y: 7, t: 13, atraso: 0 },      // a grande, embaixo à esquerda
  { x: 10, y: 1, t: 8.5, atraso: 500 },  // a média, em cima à direita
  { x: 2.5, y: 0, t: 5, atraso: 1000 },  // a pequena, em cima à esquerda
];

function Estrela({ x, y, t, atraso, cor, reduzido }: { x: number; y: number; t: number; atraso: number; cor: string; reduzido: boolean }) {
  const v = useRef(new Animated.Value(reduzido ? 1 : 0.4)).current;
  useEffect(() => {
    if (reduzido) { v.setValue(1); return undefined; }
    const nativo = Platform.OS !== 'web';
    const laco = Animated.loop(Animated.sequence([
      Animated.delay(atraso),
      Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
      Animated.timing(v, { toValue: 0.4, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
      Animated.delay(1500 - atraso),
    ]));
    laco.start();
    return () => laco.stop();
  }, [v, atraso, reduzido]);
  return (
    <Animated.View style={{ position: 'absolute', left: x, top: y, width: t, height: t, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0.4, 1], outputRange: [0.8, 1] }) }] }}>
      <Svg width={t} height={t} viewBox="0 0 24 24"><Path d={ESTRELA} fill={cor} /></Svg>
    </Animated.View>
  );
}

export function Faiscas({ cor = '#ffffff', tamanho = 20 }: { cor?: string; tamanho?: number }) {
  const reduzido = useMovimentoReduzido();
  const k = tamanho / 20;
  return (
    <View style={{ width: tamanho, height: tamanho }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ESTRELAS.map((e, i) => (
        <Estrela key={i} x={e.x * k} y={e.y * k} t={e.t * k} atraso={e.atraso} cor={i === 0 ? cor : 'rgba(225,210,255,0.95)'} reduzido={reduzido} />
      ))}
    </View>
  );
}
