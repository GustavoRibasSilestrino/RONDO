/* Uma janelinha de vidro no MEIO da tela (pedido do dono, 2026-11-18: nada grudado na margem de baixo), para escolhas rápidas
   (marcar alguém, escolher um treino ou uma refeição na publicação). Título, um X para fechar e o conteúdo, que rola se for
   longo. Tocar fora ou no voltar do Android fecha. No computador, centralizada na coluna do conteúdo. Abre crescendo de leve
   (180 ms) e fecha mais rápido (120 ms); parada para quem pede menos movimento. Sobe junto com o teclado. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useColuna } from '../lib/coluna';
import { useLayoutLargo } from '../lib/largura';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, estilos, VIDRO } from '../tema';
import { Icone } from './Icone';
import { T } from './Ui';

const nativo = Platform.OS !== 'web';

export function Janela({ aberta, aoFechar, titulo, children }: { aberta: boolean; aoFechar: () => void; titulo: string; children: React.ReactNode }) {
  const reduzido = useMovimentoReduzido();
  const { largo } = useLayoutLargo();
  const coluna = useColuna();
  const v = useRef(new Animated.Value(0)).current;
  const [visivel, setVisivel] = useState(aberta);
  useEffect(() => {
    if (aberta) setVisivel(true);
    if (reduzido) { v.setValue(aberta ? 1 : 0); if (!aberta) setVisivel(false); return; }
    const anim = aberta
      ? Animated.timing(v, { toValue: 1, duration: 180, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: nativo })
      : Animated.timing(v, { toValue: 0, duration: 120, easing: Easing.in(Easing.cubic), useNativeDriver: nativo });
    anim.start(({ finished }) => { if (finished && !aberta) setVisivel(false); });
    return () => anim.stop();
  }, [aberta, reduzido, v]);

  return (
    <Modal visible={visivel} transparent animationType="none" onRequestClose={aoFechar} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, st.veu, { opacity: v }]}>
        <Pressable accessibilityLabel="Fechar" onPress={aoFechar} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none"
        style={[st.centro, largo && coluna ? { left: coluna.x, width: coluna.w, right: undefined } : null]}>
        <Animated.View accessibilityViewIsModal style={[st.cartao, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
          <View style={st.topo}>
            <T tam={17} peso="500" style={{ flex: 1 }} linhas={1}>{titulo}</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} hitSlop={4}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.fechar, (pressed || hovered) && { backgroundColor: cores.cartao2 }]}>
              <Icone nome="fechar" tamanho={18} cor={cores.texto} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 18 }}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  veu: { backgroundColor: 'rgba(0,0,0,0.5)' },
  centro: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', padding: 16 },
  cartao: {
    width: '100%', maxWidth: 440, maxHeight: '78%', borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: cores.linha2,
    backgroundColor: cores.tinta === '255,255,255' ? 'rgba(20,20,20,0.82)' : cores.painel, ...VIDRO,   // no claro, o vidro claro das folhas boxShadow: '0 30px 70px -24px rgba(0,0,0,0.95)',
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18, paddingRight: 8, height: 56 },
  fechar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
}));
