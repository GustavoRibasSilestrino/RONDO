/* Abertura: uma tela preta com o nome do app, que aparece, segura um instante e some, deixando o app por baixo. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useMovimentoReduzido } from '../lib/movimento';
import { Marca } from './Marca';
import { T } from './Ui';

export function Abertura() {
  const reduzido = useMovimentoReduzido();
  const [fim, setFim] = useState(false);
  const marca = useRef(new Animated.Value(0)).current;   // entrada do nome
  const tela = useRef(new Animated.Value(1)).current;    // a tela inteira, até sumir
  const nativo = Platform.OS !== 'web';

  useEffect(() => {
    const entrada = Animated.timing(marca, { toValue: 1, duration: reduzido ? 1 : 700, easing: Easing.out(Easing.cubic), useNativeDriver: nativo });
    const saida = Animated.timing(tela, { toValue: 0, duration: reduzido ? 1 : 550, delay: reduzido ? 600 : 1100, useNativeDriver: nativo });
    const seq = Animated.sequence([entrada, saida]);
    seq.start(({ finished }) => { if (finished) setFim(true); });
    return () => seq.stop();
  }, [reduzido, marca, tela, nativo]);

  if (fim) return null;
  return (
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, st.tela, { opacity: tela }]} accessibilityLabel="Yesteryou">
      <Animated.View
        style={{
          alignItems: 'center', gap: 18, opacity: marca,
          transform: [{ translateY: marca.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: marca.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
        }}
      >
        <Marca altura={44} />
        <View>
          <T tam={30} peso="200" style={{ letterSpacing: 7 }}>yesteryou</T>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  tela: { backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
});
