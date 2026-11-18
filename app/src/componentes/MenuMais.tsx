/* O menu do + (pedido do dono, 2026-11-18): um cartão de vidro pequeno que brota logo acima do +, no canto de baixo à direita,
   só com texto, uma opção por linha, separadas por linhas finas. Tocar fora (ou no voltar do Android) fecha. Abre crescendo a
   partir do + (escala e opacidade, 200 ms) e fecha mais rápido (130 ms); parado para quem pede menos movimento. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayoutLargo } from '../lib/largura';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, estilos, larguraMax, VIDRO } from '../tema';
import { T } from './Ui';

export type ItemMenu = { rotulo: string; aoPressionar: () => void; desligado?: boolean };

const nativo = Platform.OS !== 'web';

export function MenuMais({ aberto, aoFechar, itens, rotulo }: { aberto: boolean; aoFechar: () => void; itens: ItemMenu[]; rotulo: string }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { largo } = useLayoutLargo();
  const reduzido = useMovimentoReduzido();
  const v = useRef(new Animated.Value(0)).current;
  const [visivel, setVisivel] = useState(aberto);

  useEffect(() => {
    if (aberto) setVisivel(true);
    if (reduzido) { v.setValue(aberto ? 1 : 0); if (!aberto) setVisivel(false); return; }
    const anim = aberto
      ? Animated.timing(v, { toValue: 1, duration: 200, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: nativo })
      : Animated.timing(v, { toValue: 0, duration: 130, easing: Easing.in(Easing.cubic), useNativeDriver: nativo });
    anim.start(({ finished }) => { if (finished && !aberto) setVisivel(false); });
    return () => anim.stop();
  }, [aberto, reduzido, v]);

  /* o canto do + (componentes/BotaoMais.tsx): o menu fica logo acima dele, alinhado à direita */
  const fundoMais = insets.bottom + (largo ? 28 : 16 + 64 + 12);
  const lateral = largo ? 20 : Math.max(0, (width - Math.min(width, larguraMax)) / 2) + 20;

  return (
    <Modal visible={visivel} transparent animationType="none" onRequestClose={aoFechar} statusBarTranslucent>
      <Pressable accessibilityLabel="Fechar o menu" style={StyleSheet.absoluteFill} onPress={aoFechar}>
        <Animated.View style={[StyleSheet.absoluteFill, st.veu, { opacity: v }]} />
      </Pressable>
      <Animated.View
        accessibilityRole="menu"
        accessibilityLabel={rotulo}
        style={[
          st.cartao,
          { right: lateral, bottom: fundoMais + 58 + 12, opacity: v },
          { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
          Platform.OS === 'web' ? ({ transformOrigin: 'bottom right' } as object) : null,
        ]}
      >
        {itens.map((it, i) => (
          <Pressable
            key={it.rotulo}
            accessibilityRole="menuitem"
            accessibilityState={{ disabled: !!it.desligado }}
            disabled={it.desligado}
            onPress={() => { aoFechar(); it.aoPressionar(); }}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.item, i > 0 && st.divisa, (pressed || hovered) && st.itemSobre]}
          >
            <T tam={15.5} peso="400" cor={it.desligado ? cores.texto3 : cores.texto} linhas={1}>{it.rotulo}</T>
          </Pressable>
        ))}
      </Animated.View>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  veu: { backgroundColor: 'rgba(0,0,0,0.35)' },
  cartao: {
    position: 'absolute', minWidth: 210, maxWidth: 280, borderRadius: 22, overflow: 'hidden', paddingVertical: 4,
    backgroundColor: 'rgba(30,24,46,0.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', ...VIDRO,
    shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14,
  },
  item: { minHeight: 48, paddingHorizontal: 20, justifyContent: 'center' },
  divisa: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cores.linha2 },
  itemSobre: { backgroundColor: 'rgba(255,255,255,0.08)' },
}));
