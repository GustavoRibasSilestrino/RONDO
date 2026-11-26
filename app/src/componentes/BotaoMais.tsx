/* O +, fixo sobre a barra de abas, à direita. Usado para criar (publicação, dieta, treino).
   Desde 2026-11-17 é de vidro, como a barra e os cartões: branco translúcido com desfoque, borda clara e o + roxo-escuro.
   Quando a lixeira dos treinos aparece (lib/botaoMais.ts), ele DESCE e some, rápido (170 ms), para a lixeira subir no lugar; quando
   ela sai, ele volta subindo com mola, depois de ela sumir (as duas não disputam o pé da tela ao mesmo tempo). */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { guardarPosicaoMais, useBotaoMaisEscondido } from '../lib/botaoMais';
import { useMovimentoReduzido } from '../lib/movimento';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayoutLargo } from '../lib/largura';
import { cores, larguraMax, estilos, VERDE, VIDRO } from '../tema';
import { Icone } from './Icone';
import { Vidro } from './Vidro';

export function BotaoMais({ rotulo, aoPressionar }: { rotulo: string; aoPressionar: () => void }) {
  const caixa = useRef<React.ElementRef<typeof View>>(null);
  /* mede onde o + ficou (ao montar, ao mudar de tamanho e na hora do toque) */
  const medir = () => caixa.current?.measureInWindow((x, y, w, h) => { if (w) guardarPosicaoMais({ x, y, w, h }); });
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { largo } = useLayoutLargo();   // no computador não há barra embaixo
  const escondido = useBotaoMaisEscondido();
  const reduzido = useMovimentoReduzido();
  const mostra = useRef(new Animated.Value(escondido ? 0 : 1)).current;
  useEffect(() => {
    const nativo = Platform.OS !== 'web';
    if (reduzido) { mostra.setValue(escondido ? 0 : 1); return; }
    const anim = escondido
      ? Animated.timing(mostra, { toValue: 0, duration: 170, easing: Easing.in(Easing.cubic), useNativeDriver: nativo })   // sai rápido
      : Animated.sequence([Animated.delay(150), Animated.spring(mostra, { toValue: 1, useNativeDriver: nativo, speed: 15, bounciness: 9 })]);   // volta depois da lixeira sair
    anim.start();
    return () => anim.stop();   // interrompível: trocar de ideia no meio muda o rumo na hora
  }, [escondido, reduzido, mostra]);
  return (
    <View pointerEvents="box-none" style={[st.faixa, { bottom: insets.bottom + (largo ? 28 : 16 + 64 + 12) }]}>
      <Animated.View
        pointerEvents={escondido ? 'none' : 'box-none'}
        style={{
          width: largo ? '100%' : Math.min(width, larguraMax), alignItems: 'flex-end', paddingRight: 20,
          opacity: mostra,
          transform: [{ translateY: mostra.interpolate({ inputRange: [0, 1], outputRange: [86, 0] }) }, { scale: mostra.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
        }}
      >
        <View ref={caixa} onLayout={medir}>
        <Vidro interativo tom={VERDE.botao} style={st.mais}>
        <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={() => { medir(); aoPressionar(); }} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.toque, hovered && st.maisSobre, pressed && { transform: [{ scale: 0.94 }] }]}>
          <View pointerEvents="none" style={{ zIndex: 1 }}><Icone nome="mais" tamanho={28} cor="#ffffff" espessura={2} /></View>
        </Pressable>
        </Vidro>
        </View>
      </Animated.View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  faixa: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  mais: { width: 58, height: 58, borderRadius: 29, overflow: 'hidden', backgroundColor: VERDE.botao, borderWidth: 1, borderColor: 'rgba(134,239,172,0.35)', boxShadow: `0 12px 28px -12px ${cores.sombra}`, ...VIDRO },
  toque: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  maisSobre: { backgroundColor: VERDE.sobre },   // o + é um botão: verde (2026-11-26)
}));
