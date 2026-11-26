/* O menu do + (pedido do dono, 2026-11-18): um cartão de vidro pequeno que brota logo acima do +, no canto de baixo à direita,
   só com texto, uma opção por linha, separadas por linhas finas. Tocar fora (ou no voltar do Android) fecha. Abre crescendo a
   partir do + (escala e opacidade, 200 ms) e fecha mais rápido (130 ms); parado para quem pede menos movimento. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayoutLargo } from '../lib/largura';
import { posicaoMais, type Retangulo } from '../lib/botaoMais';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, estilos, larguraMax, VIDRO } from '../tema';
import { T } from './Ui';

export type ItemMenu = { rotulo: string; aoPressionar: () => void; desligado?: boolean };

const nativo = Platform.OS !== 'web';

/* `ancora`: o botão que abriu o menu, quando não é o + (os três pontinhos do perfil, 2026-11-26): o menu abre colado nele, embaixo
   (ou em cima, se não couber), com o mesmo desenho */
export function MenuMais({ aberto, aoFechar, itens, rotulo, ancora }: { aberto: boolean; aoFechar: () => void; itens: ItemMenu[]; rotulo: string; ancora?: Retangulo | null }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
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

  /* logo acima do + e alinhado à borda direita dele, em qualquer tela (o + mede onde está: lib/botaoMais.ts). Sem a medida,
     a conta de antes: o canto de baixo à direita da coluna */
  const r = ancora ?? posicaoMais();
  const lateral = r ? Math.max(8, width - (r.x + r.w)) : largo ? 20 : Math.max(0, (width - Math.min(width, larguraMax)) / 2) + 20;
  const fundo = r ? Math.max(8, height - r.y + 12) : insets.bottom + (largo ? 28 : 16 + 64 + 12) + 58 + 12;
  const aEsquerda = !!ancora && ancora.x + ancora.w / 2 < width / 2;
  /* responsivo (pedido do dono, 2026-11-18): maior no tablet e no computador */
  const tam = width >= 1024 ? { fonte: 17, linha: 56, min: 280, max: 360, pad: 24 } : width >= 768 ? { fonte: 16.5, linha: 52, min: 250, max: 320, pad: 22 } : width < 360 ? { fonte: 14.5, linha: 46, min: 190, max: 260, pad: 18 } : { fonte: 15.5, linha: 48, min: 210, max: 280, pad: 20 };

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
          /* com âncora e espaço embaixo dela, o menu abre para baixo; senão, para cima (como no +) */
          /* e, com a âncora na metade esquerda da tela, ele se alinha pela esquerda dela (senão sairia da tela) */
          { minWidth: tam.min, maxWidth: tam.max, opacity: v },
          aEsquerda ? { left: Math.max(8, (ancora as Retangulo).x) } : { right: lateral },
          ancora && ancora.y + ancora.h + 8 + itens.length * tam.linha < height - insets.bottom - 90 ? { top: ancora.y + ancora.h + 8 } : { bottom: fundo },
          { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
          Platform.OS === 'web' ? ({ transformOrigin: `${ancora && ancora.y + ancora.h + 8 + itens.length * tam.linha < height - insets.bottom - 90 ? 'top' : 'bottom'} ${aEsquerda ? 'left' : 'right'}` } as object) : null,
        ]}
      >
        {itens.map((it, i) => (
          <Pressable
            key={it.rotulo}
            accessibilityRole="menuitem"
            accessibilityState={{ disabled: !!it.desligado }}
            disabled={it.desligado}
            onPress={() => { aoFechar(); it.aoPressionar(); }}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.item, { minHeight: tam.linha, paddingHorizontal: tam.pad }, i > 0 && st.divisa, (pressed || hovered) && st.itemSobre]}
          >
            <T tam={tam.fonte} peso="400" cor={it.desligado ? cores.texto3 : cores.texto} linhas={1}>{it.rotulo}</T>
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
    backgroundColor: cores.tinta === '255,255,255' ? 'rgba(27,27,27,0.86)' : cores.painel, borderWidth: 1, borderColor: `rgba(${cores.tinta},0.14)`, ...VIDRO,   // no claro, o vidro claro das folhas
    shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14,
  },
  item: { minHeight: 48, paddingHorizontal: 20, justifyContent: 'center' },
  divisa: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cores.linha2 },
  itemSobre: { backgroundColor: `rgba(${cores.tinta},0.08)` },
}));
