/* Abertura: uma tela preta com o nome do app, que aparece, segura um instante e some, deixando o app por baixo. É a primeira
   coisa que a pessoa vê toda vez que entra, no celular e no navegador; depois dela vem o RONDIN (a apresentação, a conversa do
   cadastro ou a chegada). No navegador o nome já está na tela de carregamento (public/index.html) antes de o app carregar:
   a abertura assume no mesmo lugar, já com o nome à vista, e só segura e some. O relógio dela está em lib/abertura.ts. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { DURACAO_ABERTURA } from '../lib/abertura';
import { useMovimentoReduzido } from '../lib/movimento';
import { estilos } from '../tema';
import { T } from './Ui';

export function Abertura() {
  const reduzido = useMovimentoReduzido();
  const [fim, setFim] = useState(false);
  const nativo = Platform.OS !== 'web';
  const marca = useRef(new Animated.Value(nativo ? 0 : 1)).current;   // entrada do nome (no navegador ele já está à vista)
  const tela = useRef(new Animated.Value(1)).current;                  // a tela inteira, até sumir

  useEffect(() => {
    const entrada = Animated.timing(marca, { toValue: 1, duration: reduzido || !nativo ? 1 : 700, easing: Easing.out(Easing.cubic), useNativeDriver: nativo });
    /* o nome fica DURACAO_ABERTURA ms na tela (lib/abertura.ts) e então some */
    const saida = Animated.timing(tela, { toValue: 0, duration: reduzido ? 1 : 550, delay: reduzido ? 600 : nativo ? DURACAO_ABERTURA - 700 : DURACAO_ABERTURA, useNativeDriver: nativo });
    const seq = Animated.sequence([entrada, saida]);
    seq.start(({ finished }) => { if (finished) setFim(true); });
    return () => seq.stop();
  }, [reduzido, marca, tela, nativo]);

  if (fim) return null;
  return (
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, st.tela, { opacity: tela }]} accessibilityLabel="RONDO">
      <Animated.View
        style={{
          alignItems: 'center', gap: 18, opacity: marca,
          transform: [{ translateY: marca.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }, { scale: marca.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }],
        }}
      >
        <View>
          <T tam={30} peso="200" style={{ letterSpacing: 10 }}>RONDO</T>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
}));
