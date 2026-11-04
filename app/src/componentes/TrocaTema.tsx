/* Troca de tema com uma onda: uma faixa de água, em 2D, desce pela tela inteira. Quando ela cobre tudo, o tema muda por baixo;
   ao seguir descendo, ela deixa a tela já com a aparência nova. `useTrocaTema()` devolve a função que dispara a troca. */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useLoja } from '../estado/loja';
import { useMovimentoReduzido } from '../lib/movimento';
import type { TemaId } from '../tema';

const AMPLITUDE = 30;      // altura da crista da onda
const ONDA = 360;          // comprimento de uma onda, em px
const DURACAO = 1500;      // a travessia inteira

const COR: Record<TemaId, { base: string; meio: string; crista: string }> = {
  ultra: { base: '#06143a', meio: '#1450e0', crista: '#9ff3ff' },
  normal: { base: '#050505', meio: '#3d0b8f', crista: '#a66bff' },
};

const Contexto = createContext<(para: TemaId) => void>(() => {});
export const useTrocaTema = () => useContext(Contexto);

/* a faixa: borda de cima e de baixo onduladas, cobrindo o dobro da altura da tela */
function caminho(largura: number, altura: number): string {
  const passo = 12;
  let topo = '';
  let baixo = '';
  for (let x = 0; x <= largura; x += passo) {
    const y = AMPLITUDE + AMPLITUDE * Math.sin((2 * Math.PI * x) / ONDA);
    topo += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)} `;
  }
  for (let x = largura; x >= 0; x -= passo) {
    const y = altura - AMPLITUDE + AMPLITUDE * Math.sin((2 * Math.PI * x) / ONDA + 1.3);
    baixo += `L${x} ${y.toFixed(1)} `;
  }
  return `${topo}${baixo}Z`;
}

function Onda({ para, aoMeio, aoFim }: { para: TemaId; aoMeio: () => void; aoFim: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const nativo = Platform.OS !== 'web';
  const altura = 2 * H + 4 * AMPLITUDE;                 // a faixa cobre a tela com folga
  const larguraSvg = W + 2 * ONDA;                       // largura extra para a onda deslizar de lado sem emenda
  const d = useMemo(() => caminho(larguraSvg, altura), [larguraSvg, altura]);
  const y = useRef(new Animated.Value(-altura)).current;
  const x = useRef(new Animated.Value(0)).current;
  const cor = COR[para];

  useEffect(() => {
    const lado = Animated.loop(Animated.timing(x, { toValue: -ONDA, duration: 900, easing: Easing.linear, useNativeDriver: nativo }));
    lado.start();
    const meio = -(altura - H) / 2;                      // faixa cobrindo a tela inteira
    const descendo = Animated.timing(y, { toValue: meio, duration: DURACAO / 2, easing: Easing.in(Easing.cubic), useNativeDriver: nativo });
    descendo.start(({ finished }) => {
      if (!finished) return;
      aoMeio();
      Animated.timing(y, { toValue: H + AMPLITUDE, duration: DURACAO / 2, easing: Easing.out(Easing.cubic), useNativeDriver: nativo }).start(({ finished: fim }) => {
        if (fim) aoFim();
      });
    });
    return () => { lado.stop(); y.stopAnimation(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={st.camada} pointerEvents="auto">
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: W, height: altura, overflow: 'hidden', transform: [{ translateY: y }] }}>
        <Animated.View style={{ width: larguraSvg, height: altura, transform: [{ translateX: x }] }}>
          <Svg width={larguraSvg} height={altura}>
            <Defs>
              <LinearGradient id="agua" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={cor.crista} />
                <Stop offset="0.035" stopColor={cor.meio} />
                <Stop offset="0.5" stopColor={cor.base} />
                <Stop offset="0.965" stopColor={cor.meio} />
                <Stop offset="1" stopColor={cor.crista} />
              </LinearGradient>
            </Defs>
            <Path d={d} fill="url(#agua)" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function TrocaTemaProvider({ children }: { children: React.ReactNode }) {
  const { commit } = useLoja();
  const reduzido = useMovimentoReduzido();
  const [onda, setOnda] = useState<TemaId | null>(null);
  const trocando = useRef(false);

  const trocar = useCallback((para: TemaId) => {
    if (trocando.current) return;
    if (reduzido) { commit((e) => { e.tema = para; }); return; }   // sem movimento: troca direto
    trocando.current = true;
    setOnda(para);
  }, [commit, reduzido]);

  return (
    <Contexto.Provider value={trocar}>
      {children}
      {onda ? (
        <Onda
          para={onda}
          aoMeio={() => commit((e) => { e.tema = onda; })}
          aoFim={() => { setOnda(null); trocando.current = false; }}
        />
      ) : null}
    </Contexto.Provider>
  );
}

const st = StyleSheet.create({
  camada: { ...StyleSheet.absoluteFill, zIndex: 3000, overflow: 'hidden' },
});
