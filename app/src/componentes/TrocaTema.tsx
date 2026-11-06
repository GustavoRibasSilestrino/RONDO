/* Troca de tema: a tela esmaece até o preto, o tema muda por baixo e o preto sai. Ao entrar no Ultra, a palavra ULTRA aparece no escuro.
   `useTrocaTema()` devolve a função que dispara a troca. */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { useLoja } from '../estado/loja';
import { useMovimentoReduzido } from '../lib/movimento';
import { FONTE, LETRAS_ULTRA, type TemaId } from '../tema';

const Contexto = createContext<(para: TemaId) => void>(() => {});
export const useTrocaTema = () => useContext(Contexto);

const ENTRA = 380;    // a tela esmaece até o preto
const FICA = 700;     // parada no preto: o tema muda por baixo e, no Ultra, a palavra aparece
const SAI = 520;      // o preto esmaece e some, já com o tema novo

/* a transição: a tela escurece de leve até o preto, o tema troca por baixo e o preto sai. Ao entrar no Ultra, a palavra ULTRA aparece
   no escuro, com as cores das letras do RONDO no tema Ultra. Só opacidade (barata em qualquer aparelho). */
function Esmaecer({ para, aoMeio, aoFim }: { para: TemaId; aoMeio: () => void; aoFim: () => void }) {
  const nativo = Platform.OS !== 'web';
  const preto = useRef(new Animated.Value(0)).current;
  const palavra = useRef(new Animated.Value(0)).current;
  const mostrarPalavra = para === 'ultra';

  useEffect(() => {
    const anima = (valor: Animated.Value, para: number, duracao: number) =>
      Animated.timing(valor, { toValue: para, duration: duracao, easing: Easing.inOut(Easing.cubic), useNativeDriver: nativo });
    const escurece = anima(preto, 1, ENTRA);
    escurece.start(({ finished }) => {
      if (!finished) return;
      aoMeio();
      Animated.sequence([
        Animated.parallel([
          mostrarPalavra ? anima(palavra, 1, 260) : Animated.delay(260),
          Animated.delay(FICA),
        ]),
        Animated.parallel([
          mostrarPalavra ? anima(palavra, 0, 260) : Animated.delay(0),
          anima(preto, 0, SAI),
        ]),
      ]).start(({ finished: fim }) => { if (fim) aoFim(); });
    });
    return () => { preto.stopAnimation(); palavra.stopAnimation(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[st.camada, { opacity: preto }]} pointerEvents="auto">
      <View style={st.preto} />
      {mostrarPalavra ? (
        <Animated.View style={[st.centro, { opacity: palavra, transform: [{ scale: palavra.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]} pointerEvents="none">
          <Text style={st.palavra}>
            {[...'ULTRA'].map((l, i) => <Text key={i} style={{ color: LETRAS_ULTRA[i], textShadowColor: LETRAS_ULTRA[i], textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 } }}>{l}</Text>)}
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
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
        <Esmaecer
          para={onda}
          aoMeio={() => commit((e) => { e.tema = onda; })}
          aoFim={() => { setOnda(null); trocando.current = false; }}
        />
      ) : null}
    </Contexto.Provider>
  );
}

const st = StyleSheet.create({
  camada: { ...StyleSheet.absoluteFill, zIndex: 3000 },
  preto: { ...StyleSheet.absoluteFill, backgroundColor: '#000000' },
  centro: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  palavra: { fontSize: 44, letterSpacing: 16, paddingLeft: 16, fontFamily: FONTE['400'] },
});
