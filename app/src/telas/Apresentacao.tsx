/* A apresentação do RONDIN: a primeira coisa que a pessoa vê antes de entrar ou criar conta. No celular, logo depois da
   abertura (a tela preta com o nome RONDO); no navegador, quando a pessoa clica em "Entrar" ou "Criar conta" no site.
   A bolha nasce no meio da tela, se apresenta (escrito e falado, na língua do aparelho) e mostra o botão para seguir.
   Tocar na bolha faz ela falar de novo (no navegador, a voz só sai depois de um toque, regra dos navegadores). */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Orbe } from '../componentes/Orbe';
import { Botao, T } from '../componentes/Ui';
import { useMovimentoReduzido } from '../lib/movimento';
import type { EstadoOrbe } from '../lib/orbe';
import { TEXTOS as FALAS } from '../lib/rondinTextos';
import { falar, parar, sotaquePadrao } from '../lib/rondinVoz';

/* a frase fica em lib/rondinTextos.ts (fala.boasVindas), para entrar na geração das vozes da Azure */
const TEXTOS = {
  pt: { botao: 'Vamos lá', ouvir: 'Toque em mim para ouvir' },
  en: { botao: "Let's go", ouvir: 'Tap me to listen' },
  es: { botao: 'Vamos', ouvir: 'Tócame para escuchar' },
};

type Props = {
  aoContinuar: () => void;
  atraso?: number;   // ms antes de começar (no celular, o tempo da abertura sumir)
};

export function Apresentacao({ aoContinuar, atraso = 0 }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduzido = useMovimentoReduzido();
  const sotaque = useRef(sotaquePadrao()).current;
  const txt = { ...TEXTOS[sotaque.idioma], fala: FALAS[sotaque.idioma].fala.boasVindas };
  const palavras = txt.fala.split(' ');
  const [estado, setEstado] = useState<EstadoOrbe>('quieto');
  const [mostradas, setMostradas] = useState(0);   // quantas palavras já apareceram
  const [pronto, setPronto] = useState(false);     // o texto todo apareceu: mostra o botão
  const [pulso, setPulso] = useState(0);
  const nasce = useRef(new Animated.Value(0)).current;
  const botao = useRef(new Animated.Value(0)).current;
  const nativo = Platform.OS !== 'web';
  const tamanho = Math.round(Math.min(width * 0.72, height * 0.42, 340));

  /* a fala: a voz lê a frase e as palavras aparecem no ritmo dela. Sem voz (navegador sem toque, aparelho mudo), elas
     aparecem sozinhas, uma a cada ~230 ms. */
  const apresentar = () => {
    setEstado('falando');
    setMostradas(0);
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setMostradas(i);
      if (i >= palavras.length) clearInterval(timer);
    }, reduzido ? 1 : 230);
    falar([txt.fala], sotaque, () => {
      clearInterval(timer);
      setMostradas(palavras.length);
      setEstado('quieto');
      setPronto(true);
    });
    /* garantia: se a voz não começar (navegador sem toque), o botão aparece mesmo assim */
    setTimeout(() => { setPronto(true); setEstado((e) => (e === 'falando' ? 'quieto' : e)); }, palavras.length * 230 + 1200);
    return timer;
  };

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const inicio = setTimeout(() => {
      Animated.timing(nasce, { toValue: 1, duration: reduzido ? 1 : 900, easing: Easing.out(Easing.back(1.4)), useNativeDriver: nativo }).start();
      setTimeout(() => { timer = apresentar(); }, reduzido ? 0 : 650);
    }, atraso);
    return () => { clearTimeout(inicio); if (timer) clearInterval(timer); parar(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pronto) Animated.timing(botao, { toValue: 1, duration: reduzido ? 1 : 500, easing: Easing.out(Easing.cubic), useNativeDriver: nativo }).start();
  }, [pronto, botao, reduzido, nativo]);

  const seguir = () => { parar(); aoContinuar(); };

  return (
    <View style={[st.tela, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}>
      <View style={st.meio}>
        <Animated.View style={{ opacity: nasce, transform: [{ scale: nasce.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>
          <Orbe
            hud tamanho={tamanho} estado={estado} pulso={pulso}
            aoPressionar={() => { setPulso((p) => p + 1); apresentar(); }}
            rotulo={txt.ouvir}
          />
        </Animated.View>
        <T tam={12.5} peso="500" style={st.nome}>RONDIN</T>
        <View style={st.fala} accessibilityLiveRegion="polite" accessibilityLabel={txt.fala}>
          <T tam={Math.min(26, Math.max(21, width / 17))} centro style={{ lineHeight: Math.min(36, Math.max(30, width / 12.5)) }}>
            {palavras.map((p, i) => (
              <T key={i} tam={Math.min(26, Math.max(21, width / 17))} style={{ opacity: i < mostradas ? 1 : 0.12 }}>{p}{i < palavras.length - 1 ? ' ' : ''}</T>
            ))}
          </T>
        </View>
      </View>
      <Animated.View pointerEvents={pronto ? 'auto' : 'none'} style={[st.base, { opacity: botao, transform: [{ translateY: botao.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
        <Botao titulo={txt.botao} aoPressionar={seguir} />
        <Pressable accessibilityRole="button" onPress={() => { setPulso((p) => p + 1); apresentar(); }} style={st.ouvir} hitSlop={8}>
          <T tam={13} style={{ opacity: 0.7 }}>{txt.ouvir}</T>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 24, alignItems: 'center' },
  meio: { flex: 1, width: '100%', maxWidth: 520, alignItems: 'center', justifyContent: 'center' },
  nome: { letterSpacing: 4, color: '#e6b3ff', marginTop: 4, opacity: 0.85 },
  fala: { marginTop: 18, maxWidth: 440, minHeight: 110, justifyContent: 'flex-start' },
  base: { width: '100%', maxWidth: 440, gap: 8 },
  ouvir: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 12 },
});
