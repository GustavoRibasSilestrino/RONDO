/* O menu hambúrguer do app (pedido do dono, 2026-11-18, a partir de uma referência): três barras grossas de ponta redonda. A de
   cima e a de baixo, alinhadas à direita; a do meio, mais curta, mais clara e puxada para a esquerda. Com o cursor em cima ou no
   toque (`ativo`), a do meio desliza para a direita e acende, alinhando com as outras. Parado para quem pede menos movimento. */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores } from '../tema';

export function IconeMenu({ tamanho = 24, cor = cores.texto, ativo = false }: { tamanho?: number; cor?: string; ativo?: boolean }) {
  const reduzido = useMovimentoReduzido();
  const v = useRef(new Animated.Value(ativo ? 1 : 0)).current;
  useEffect(() => {
    if (reduzido) { v.setValue(ativo ? 1 : 0); return; }
    const anim = Animated.timing(v, { toValue: ativo ? 1 : 0, duration: ativo ? 220 : 180, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [ativo, reduzido, v]);

  const u = tamanho / 24;
  const grossura = 3.4 * u;
  const longa = 18 * u;
  const meio = 15 * u;
  const barra = { height: grossura, borderRadius: grossura / 2, backgroundColor: cor };
  return (
    <View pointerEvents="none" style={{ width: tamanho, height: tamanho, justifyContent: 'center', gap: 2.8 * u }}>
      <View style={[barra, { width: longa, alignSelf: 'flex-end' }]} />
      <Animated.View
        style={[barra, {
          width: meio,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
          transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, tamanho - meio] }) }],
        }]}
      />
      <View style={[barra, { width: longa, alignSelf: 'flex-end' }]} />
    </View>
  );
}
