/* Medalha em 3D: arraste para o lado para girar e ver o verso (liso, só com o símbolo da RONDO); toque para virar.
   Ao soltar, ela assenta de frente ou de costas. Arrastar para cima e para baixo inclina um pouco. */
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Image, ImageSourcePropType, PanResponder, Platform, StyleSheet, View } from 'react-native';
import { estilos } from '../tema';
import { useMovimentoReduzido } from '../lib/movimento';

type Props = { frente: ImageSourcePropType; verso: ImageSourcePropType; tamanho: number; apagada?: boolean };

const PROPORCAO = 300 / 316;   // altura / largura média das medalhas

export function Medalha3D({ frente, verso, tamanho, apagada }: Props) {
  const reduzido = useMovimentoReduzido();
  const nativo = Platform.OS !== 'web';
  const giro = useRef(new Animated.Value(0)).current;       // graus em torno do eixo vertical
  const inclina = useRef(new Animated.Value(0)).current;    // graus em torno do eixo horizontal
  const atual = useRef(0);
  const inicio = useRef(0);
  const moveu = useRef(false);

  useEffect(() => {
    const id = giro.addListener(({ value }) => { atual.current = value; });
    return () => giro.removeListener(id);
  }, [giro]);

  const assentar = (para: number) => {
    if (reduzido) { giro.setValue(para); inclina.setValue(0); return; }
    Animated.parallel([
      Animated.spring(giro, { toValue: para, friction: 6, tension: 70, useNativeDriver: nativo }),
      Animated.spring(inclina, { toValue: 0, friction: 6, tension: 70, useNativeDriver: nativo }),
    ]).start();
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => { giro.stopAnimation(); inclina.stopAnimation(); inicio.current = atual.current; moveu.current = false; },
        onPanResponderMove: (_e, g) => {
          if (Math.abs(g.dx) + Math.abs(g.dy) > 6) moveu.current = true;
          giro.setValue(inicio.current + g.dx * 0.9);
          inclina.setValue(Math.max(-28, Math.min(28, -g.dy * 0.25)));
        },
        onPanResponderRelease: (_e, g) => {
          if (!moveu.current) { assentar(Math.round(inicio.current / 180) * 180 + 180); return; }   // toque: vira para o outro lado
          const impulso = g.vx * 90;   // um arremesso leve continua girando
          assentar(Math.round((atual.current + impulso) / 180) * 180);
        },
        onPanResponderTerminate: () => assentar(Math.round(atual.current / 180) * 180),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reduzido],
  );

  const largura = tamanho;
  const altura = tamanho * PROPORCAO;
  const rotY = giro.interpolate({ inputRange: [-3600, 3600], outputRange: ['-3600deg', '3600deg'] });
  const rotX = inclina.interpolate({ inputRange: [-90, 90], outputRange: ['-90deg', '90deg'] });
  const verso180 = giro.interpolate({ inputRange: [-3600, 3600], outputRange: ['-3420deg', '3780deg'] });   // o verso parte virado 180°

  return (
    <View {...pan.panHandlers} accessibilityRole="image" accessibilityHint="Arraste para girar a medalha, ou toque para virar" style={{ width: largura, height: altura, opacity: apagada ? 0.45 : 1 }}>
      <Animated.View style={[st.face, { transform: [{ perspective: 900 }, { rotateX: rotX }, { rotateY: rotY }] }]}>
        <Image source={frente} style={st.img} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
      <Animated.View style={[st.face, { transform: [{ perspective: 900 }, { rotateX: rotX }, { rotateY: verso180 }] }]}>
        <Image source={verso} style={st.img} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  face: { ...StyleSheet.absoluteFill, backfaceVisibility: 'hidden' },
  img: { width: '100%', height: '100%' },
}));
