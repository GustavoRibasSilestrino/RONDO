/* A lixeira dos treinos (desde 2026-11-17, pedido do dono): uma bolinha de vidro no meio, logo acima da barra de abas, que
   aparece quando a pessoa escolhe uma pasta na aba Treino. Arrastar a pasta até ela exclui o treino; com a pasta em cima, ela
   cresce, fica vermelha e a tampa inclina. Tocar nela também exclui a pasta escolhida: excluir não depende só de arrastar
   (WCAG 2.2, "dragging movements"). Quem pede menos movimento a vê aparecer sem animação.
   `aoMedir` informa onde ela está na tela (para a pilha de pastas saber quando a pasta chegou nela). */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayoutLargo } from '../lib/largura';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, VIDRO } from '../tema';
import { Icone } from './Icone';
import { T } from './Ui';

export type Retangulo = { x: number; y: number; w: number; h: number };
const TAMANHO = 58;

export function Lixeira({ visivel, sobre, aviso, aoTocar, aoMedir, aoCancelar }: {
  visivel: boolean; sobre: boolean; aviso?: string; aoTocar: () => void; aoMedir: (r: Retangulo) => void;
  aoCancelar: () => void;   // "Cancelar": a pasta volta para a pilha sem excluir (também ao soltar a pasta fora da lixeira)
}) {
  const insets = useSafeAreaInsets();
  const { largo } = useLayoutLargo();
  const reduzido = useMovimentoReduzido();
  const nativo = Platform.OS !== 'web';
  const entra = useRef(new Animated.Value(visivel ? 1 : 0)).current;
  const cresce = useRef(new Animated.Value(0)).current;
  const caixa = useRef<React.ComponentRef<typeof View>>(null);

  /* entra depois de o + sair (120 ms) e sobe com mola; sai mais rápido do que entrou (160 ms, descendo), e só então o + volta */
  useEffect(() => {
    if (reduzido) { entra.setValue(visivel ? 1 : 0); return undefined; }
    const anim = visivel
      ? Animated.sequence([Animated.delay(120), Animated.spring(entra, { toValue: 1, useNativeDriver: nativo, speed: 16, bounciness: 9 })])
      : Animated.timing(entra, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: nativo });
    anim.start();
    return () => anim.stop();   // interrompível: escolher e soltar a pasta depressa troca o rumo na hora
  }, [visivel, reduzido, entra, nativo]);
  useEffect(() => {
    if (reduzido) { cresce.setValue(sobre ? 1 : 0); return; }
    Animated.spring(cresce, { toValue: sobre ? 1 : 0, useNativeDriver: nativo, speed: 22, bounciness: 10 }).start();
  }, [sobre, reduzido, cresce, nativo]);

  /* onde ela está na tela: medido ao aparecer (e de novo quando a tela muda de tamanho) */
  const medir = () => { caixa.current?.measureInWindow((x: number, y: number, w: number, h: number) => { if (w > 0) aoMedir({ x, y, w, h }); }); };
  useEffect(() => { if (visivel) { const t = setTimeout(medir, 320); return () => clearTimeout(t); } return undefined; });

  return (
    <View pointerEvents="box-none" {...({ dataSet: { semSelecao: '1' } } as object)} style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + (largo ? 28 : 16 + 62 + 12), alignItems: 'center' }}>
      <Animated.View
        pointerEvents={visivel ? 'box-none' : 'none'}
        style={{ alignItems: 'center', opacity: entra, transform: [{ translateY: entra.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }, { scale: entra.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}
      >
        <View style={{ marginBottom: 8, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: sobre ? cores.erro : cores.aviso }}>
          <T tam={12} peso="500" cor="#ffffff">{aviso ?? (sobre ? 'Solte para excluir' : 'Arraste até aqui para excluir')}</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* cancelar sem arrastar: a pasta volta para o lugar dela */}
        <Pressable
          accessibilityRole="button" accessibilityLabel="Cancelar e colocar a pasta de volta" onPress={aoCancelar} hitSlop={8}
          style={({ hovered }: { pressed: boolean; hovered?: boolean }): ViewStyle[] => [{ height: 40, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', backgroundColor: hovered ? 'rgba(214,212,220,0.95)' : 'rgba(255,255,255,0.6)', opacity: sobre ? 0 : 1 }, VIDRO as ViewStyle]}
        >
          <T tam={13} peso="500">Cancelar</T>
        </Pressable>
        <Animated.View style={{ transform: [{ scale: cresce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }] }}>
          <Pressable
            ref={caixa}
            onLayout={medir}
            accessibilityRole="button"
            accessibilityLabel="Excluir o treino escolhido"
            onPress={aoTocar}
            style={({ hovered }: { pressed: boolean; hovered?: boolean }): ViewStyle[] => [{
              width: TAMANHO, height: TAMANHO, borderRadius: TAMANHO / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
              borderColor: sobre ? cores.erro : 'rgba(255,255,255,0.95)',
              backgroundColor: sobre ? cores.erro : hovered ? 'rgba(214,212,220,0.95)' : 'rgba(255,255,255,0.6)',
              boxShadow: sobre ? '0 12px 30px -10px rgba(179,32,58,0.75)' : '0 12px 28px -12px rgba(42,22,80,0.55)',
            }, VIDRO as ViewStyle]}
          >
            {/* a tampa inclina quando a pasta chega */}
            <Animated.View style={{ transform: [{ rotate: cresce.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-14deg'] }) }] }}>
              <Icone nome="lixo" tamanho={24} cor={sobre ? '#ffffff' : cores.texto} />
            </Animated.View>
          </Pressable>
        </Animated.View>
        {/* o mesmo espaço do outro lado, para a lixeira ficar no meio */}
        <View style={{ width: 92 }} />
        </View>
      </Animated.View>
    </View>
  );
}
