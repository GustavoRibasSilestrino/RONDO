/* Troca de tema com uma onda sem cor: uma faixa de água em preto e branco atravessa a tela da direita para a esquerda. Quando ela cobre tudo, o tema muda por baixo;
   ao seguir descendo, ela deixa a tela já com a aparência nova. `useTrocaTema()` devolve a função que dispara a troca. */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useLoja } from '../estado/loja';
import { useMovimentoReduzido } from '../lib/movimento';
import type { TemaId } from '../tema';

const AMPLITUDE = 34;     // o quanto a borda da onda balança
const ONDA = 420;          // altura de uma ondulação, em px
const DURACAO = 1700;      // a travessia inteira, da direita para a esquerda

const Contexto = createContext<(para: TemaId) => void>(() => {});
export const useTrocaTema = () => useContext(Contexto);

/* a faixa: bordas de cima a baixo, onduladas, e uma segunda linha fina logo atrás da primeira */
function caminho(largura: number, altura: number, deslocamento = 0, fase = 0): string {
  const passo = 14;
  let esq = '';
  let dir = '';
  for (let y = 0; y <= altura; y += passo) {
    const x = deslocamento + AMPLITUDE + AMPLITUDE * Math.sin((2 * Math.PI * y) / ONDA + fase);
    esq += `${y === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y} `;
  }
  for (let y = altura; y >= 0; y -= passo) {
    const x = largura - AMPLITUDE + AMPLITUDE * Math.sin((2 * Math.PI * y) / ONDA + fase + 1.4);
    dir += `L${x.toFixed(1)} ${y} `;
  }
  return `${esq}${dir}Z`;
}

/* sem cor: uma crista clara, um corpo quase preto e a crista clara de novo, como água vista em preto e branco */
function Onda({ aoMeio, aoFim }: { aoMeio: () => void; aoFim: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const nativo = Platform.OS !== 'web';
  const faixa = 2 * W + 4 * AMPLITUDE;                  // a faixa cobre a tela com folga
  const alturaSvg = H + 2 * ONDA;                        // altura extra para a onda deslizar de cima a baixo sem emenda
  const d = useMemo(() => caminho(faixa, alturaSvg), [faixa, alturaSvg]);
  const x = useRef(new Animated.Value(W + AMPLITUDE)).current;
  const y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const desliza = Animated.loop(Animated.timing(y, { toValue: -ONDA, duration: 1100, easing: Easing.linear, useNativeDriver: nativo }));
    desliza.start();
    const meio = -(faixa - W) / 2;                       // faixa cobrindo a tela inteira
    const entrando = Animated.timing(x, { toValue: meio, duration: DURACAO / 2, easing: Easing.bezier(0.55, 0.05, 0.4, 1), useNativeDriver: nativo });
    entrando.start(({ finished }) => {
      if (!finished) return;
      aoMeio();
      Animated.timing(x, { toValue: -faixa - AMPLITUDE, duration: DURACAO / 2, easing: Easing.bezier(0.3, 0.1, 0.35, 0.95), useNativeDriver: nativo }).start(({ finished: fim }) => {
        if (fim) aoFim();
      });
    });
    return () => { desliza.stop(); x.stopAnimation(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={st.camada} pointerEvents="auto">
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: faixa, height: H, overflow: 'hidden', transform: [{ translateX: x }] }}>
        <Animated.View style={{ width: faixa, height: alturaSvg, transform: [{ translateY: y }] }}>
          <Svg width={faixa} height={alturaSvg}>
            <Defs>
              <LinearGradient id="agua" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#ffffff" />
                <Stop offset="0.02" stopColor="#d4d4da" />
                <Stop offset="0.05" stopColor="#3b3b42" />
                <Stop offset="0.14" stopColor="#101013" />
                <Stop offset="0.5" stopColor="#060607" />
                <Stop offset="0.86" stopColor="#101013" />
                <Stop offset="0.95" stopColor="#3b3b42" />
                <Stop offset="0.98" stopColor="#d4d4da" />
                <Stop offset="1" stopColor="#ffffff" />
              </LinearGradient>
            </Defs>
            <Path d={d} fill="url(#agua)" />
            {/* a espuma: uma linha clara e fina, um pouco à frente da crista */}
            <Path d={caminho(faixa, alturaSvg, 26, 0.9)} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1.2} />
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
