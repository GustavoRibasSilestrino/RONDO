/* Gestos de deslizar para os lados (pedido do dono, 2026-11-18):
   - <DeslizarParaVoltar>: em toda tela que abre por cima (notificações, configurações, editor de treino, buscas, perfil de outra
     pessoa...), arrastar o dedo para a DIREITA volta para a tela anterior. A tela acompanha o dedo; passando de ~1/4 da largura
     (ou num arremesso rápido) ela sai pela direita e volta; menos que isso, volta ao lugar com mola.
   - <DeslizarEntreAbas>: nas abas principais, arrastar para a esquerda vai para a próxima aba e para a direita, para a anterior.
     O conteúdo acompanha o dedo de leve, como um indício do que vai acontecer.
   Para não brigar com os outros gestos (ui-ux-pro-max: gesture-conflicts), só contam movimentos bem horizontais (mais que o
   dobro do vertical) e de pelo menos 14 px; o arrasto de dentro (as pastas do treino, listas que rolam de lado) tem prioridade,
   porque estes gestos não "capturam" o toque. A rolagem vertical continua normal (no navegador, touch-action: pan-y). Parados
   (sem acompanhar o dedo) para quem pede menos movimento. */
import React, { useMemo, useRef } from 'react';
import { Animated, Easing, GestureResponderEvent, PanResponder, Platform, StyleProp, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useMovimentoReduzido } from '../lib/movimento';

const nativo = Platform.OS !== 'web';
const horizontal = (dx: number, dy: number) => Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 2;
const soVertical = Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as object) : null;

/* no navegador, uma lista que rola de lado (os stories, os filtros) não vira o responder do toque: o arrasto nela é dela. No
   aparelho a própria ScrollView já fica com o toque. */
function emRolagemLateral(e: GestureResponderEvent): boolean {
  if (Platform.OS !== 'web') return false;
  let n = (e.nativeEvent as unknown as { target?: unknown }).target as HTMLElement | null;
  while (n && n !== document.body) {
    if (n.scrollWidth > n.clientWidth + 1) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    n = n.parentElement;
  }
  return false;
}

export function DeslizarParaVoltar({ aoVoltar, children, style, ativo = true }: { aoVoltar: () => void; children: React.ReactNode; style?: StyleProp<ViewStyle>; ativo?: boolean }) {
  const { width } = useWindowDimensions();
  const reduzido = useMovimentoReduzido();
  const x = useRef(new Animated.Value(0)).current;
  const voltarRef = useRef(aoVoltar);
  voltarRef.current = aoVoltar;
  const ativoRef = useRef(ativo);
  ativoRef.current = ativo;
  const resp = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => ativoRef.current && g.dx > 0 && horizontal(g.dx, g.dy) && !emRolagemLateral(e),
    onPanResponderMove: (_e, g) => { if (!reduzido) x.setValue(Math.max(0, g.dx)); },
    onPanResponderRelease: (_e, g) => {
      const sai = g.dx > width * 0.25 || g.vx > 0.6;
      if (!sai) { Animated.spring(x, { toValue: 0, useNativeDriver: nativo, speed: 18, bounciness: 6 }).start(); return; }
      if (reduzido) { voltarRef.current(); return; }
      Animated.timing(x, { toValue: width, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: nativo }).start(() => {
        voltarRef.current();
        x.setValue(0);
      });
    },
    onPanResponderTerminate: () => { Animated.spring(x, { toValue: 0, useNativeDriver: nativo }).start(); },
  }), [x, width, reduzido]);
  return (
    <Animated.View {...resp.panHandlers} style={[{ flex: 1 }, soVertical, style, { transform: [{ translateX: x }] }]}>
      {children}
    </Animated.View>
  );
}

export function DeslizarEntreAbas({ aoAnterior, aoProxima, children }: { aoAnterior?: () => void; aoProxima?: () => void; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const reduzido = useMovimentoReduzido();
  const x = useRef(new Animated.Value(0)).current;
  const cb = useRef({ aoAnterior, aoProxima });
  cb.current = { aoAnterior, aoProxima };
  const resp = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (e, g) => horizontal(g.dx, g.dy) && (g.dx > 0 ? !!cb.current.aoAnterior : !!cb.current.aoProxima) && !emRolagemLateral(e),
    onPanResponderMove: (_e, g) => { if (!reduzido) x.setValue(g.dx * 0.35); },   // acompanha o dedo de leve: só um indício
    onPanResponderRelease: (_e, g) => {
      const longe = Math.abs(g.dx) > width * 0.22 || Math.abs(g.vx) > 0.6;
      Animated.spring(x, { toValue: 0, useNativeDriver: nativo, speed: 20, bounciness: 4 }).start();
      if (!longe) return;
      if (g.dx < 0) cb.current.aoProxima?.(); else cb.current.aoAnterior?.();
    },
    onPanResponderTerminate: () => { Animated.spring(x, { toValue: 0, useNativeDriver: nativo }).start(); },
  }), [x, width, reduzido]);
  return (
    <Animated.View {...resp.panHandlers} style={[{ flex: 1 }, soVertical, { transform: [{ translateX: x }] }]}>
      <View style={{ flex: 1 }}>{children}</View>
    </Animated.View>
  );
}
