/* A apresentação do RONDIN: a primeira coisa que a pessoa vê antes de entrar ou criar conta. No celular, logo depois da
   abertura (a tela preta com o nome RONDO); no navegador, quando a pessoa clica em "Entrar" ou "Criar conta" no site.
   O RONDIN (3D) nasce no meio da tela e se apresenta sozinho, falando; a frase surge palavra por palavra, esmaecendo, com a
   mesma legenda das perguntas (Legenda, de telas/Rondin.tsx). No canto, o alto-falante desliga a voz (fica guardado).
   Quando a frase termina, aparece o botão para seguir. A frase fica em lib/rondinTextos.ts (fala.boasVindas). */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotaoVoz } from '../componentes/BotaoVoz';
import { Icone } from '../componentes/Icone';
import { Orbe } from '../componentes/Orbe';
import { T } from '../componentes/Ui';
import { useMovimentoReduzido } from '../lib/movimento';
import type { EstadoOrbe } from '../lib/orbe';
import { TEXTOS as FALAS } from '../lib/rondinTextos';
import { falar, parar, sotaquePadrao } from '../lib/rondinVoz';
import { Legenda } from './Rondin';

const BOTAO = { pt: 'Vamos lá', en: "Let's go", es: 'Vamos' };

type Props = {
  aoContinuar: () => void;
  atraso?: number;   // ms antes de começar (no celular, o tempo da abertura sumir)
};

export function Apresentacao({ aoContinuar, atraso = 0 }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduzido = useMovimentoReduzido();
  const sotaque = useRef(sotaquePadrao()).current;
  const fala = FALAS[sotaque.idioma].fala.boasVindas;
  const [estado, setEstado] = useState<EstadoOrbe>('quieto');
  const [comecou, setComecou] = useState(false);     // a legenda só corre depois que o RONDIN nasce
  const [indiceVoz, setIndiceVoz] = useState(-1);
  const [duracaoMs, setDuracaoMs] = useState(0);
  const [pronto, setPronto] = useState(false);       // a frase toda apareceu: mostra o botão
  const [chave, setChave] = useState(0);
  const nasce = useRef(new Animated.Value(0)).current;
  const botao = useRef(new Animated.Value(0)).current;
  const nativo = Platform.OS !== 'web';
  const tamanho = Math.round(Math.min(width * 0.8, height * 0.46, 380));

  const apresentar = () => {
    setIndiceVoz(-1); setDuracaoMs(0); setChave((c) => c + 1);
    setEstado('falando');
    falar([fala], sotaque, () => setEstado('quieto'), (i) => setIndiceVoz(i), (ms) => setDuracaoMs(ms));
  };

  useEffect(() => {
    const inicio = setTimeout(() => {
      Animated.timing(nasce, { toValue: 1, duration: reduzido ? 1 : 900, easing: Easing.out(Easing.cubic), useNativeDriver: nativo }).start();
      /* ele começa a falar sozinho, logo depois de nascer */
      setTimeout(() => { setComecou(true); apresentar(); }, reduzido ? 0 : 700);
    }, atraso);
    return () => { clearTimeout(inicio); parar(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pronto) Animated.timing(botao, { toValue: 1, duration: reduzido ? 1 : 520, easing: Easing.out(Easing.cubic), useNativeDriver: nativo }).start();
  }, [pronto, botao, reduzido, nativo]);

  const seguir = () => { parar(); aoContinuar(); };

  return (
    <View style={[st.tela, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      <BotaoVoz idioma={sotaque.idioma} style={[st.voz, { top: insets.top + 14 }]} />

      <View style={st.meio}>
        <Animated.View style={{ opacity: nasce }}>
          <Orbe hud tamanho={tamanho} estado={estado} aoPressionar={apresentar} rotulo={fala} />
        </Animated.View>
        <T tam={12} peso="500" style={st.nome}>RONDIN</T>
        <View style={st.fala}>
          {comecou ? (
            <Legenda
              largo texto={fala} chave={chave} taxa={sotaque.taxa} duracaoMs={duracaoMs} indiceVoz={indiceVoz}
              completa={false} aoCompletar={() => setPronto(true)}
            />
          ) : null}
        </View>
      </View>

      <Animated.View
        pointerEvents={pronto ? 'auto' : 'none'}
        style={[st.base, { opacity: botao, transform: [{ translateY: botao.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}
      >
        <BotaoSeguir titulo={BOTAO[sotaque.idioma]} aoPressionar={seguir} />
      </Animated.View>
    </View>
  );
}

/* o botão de seguir: uma pílula roxa com luz em cima, sombra de volume embaixo, brilho suave por baixo e a seta num círculo.
   Ao tocar, só a seta anda e o brilho muda (nada muda de tamanho, a tela não pula). */
function BotaoSeguir({ titulo, aoPressionar }: { titulo: string; aoPressionar: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={titulo} onPress={aoPressionar} style={st.pilulaCaixa}>
      {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
        <View style={[st.pilula, (hovered || pressed) && st.pilulaAcesa, pressed && { opacity: 0.92 }]}>
          <LinearGradient pointerEvents="none" colors={['#9b6bff', '#7c3aed', '#5b21b6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient pointerEvents="none" colors={[hovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.6 }} style={StyleSheet.absoluteFill} />
          <LinearGradient pointerEvents="none" colors={['rgba(20,0,60,0)', 'rgba(20,0,60,0.3)']} start={{ x: 0, y: 0.5 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
          <T tam={16.5} peso="500" style={st.pilulaTexto}>{titulo}</T>
          <View style={[st.seta, (hovered || pressed) && { transform: [{ translateX: 3 }] }]}>
            <Icone nome="setaDireita" tamanho={18} cor="#ffffff" espessura={2} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 24, alignItems: 'center' },
  voz: { position: 'absolute', right: 16, zIndex: 2 },
  meio: { flex: 1, width: '100%', maxWidth: 560, alignItems: 'center', justifyContent: 'center' },
  nome: { letterSpacing: 5, color: '#c4a8ff', marginTop: 2, opacity: 0.9 },
  fala: { width: '100%', maxWidth: 460, minHeight: 100 },
  base: { width: '100%', maxWidth: 340, alignItems: 'stretch' },
  pilulaCaixa: { borderRadius: 30, ...(Platform.OS === 'web' ? ({ boxShadow: '0 10px 32px -8px rgba(124,58,237,0.75), 0 0 0 1px rgba(196,168,255,0.28)' } as object) : { shadowColor: '#7c3aed', shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 }) },
  pilula: { height: 58, borderRadius: 30, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingLeft: 28, paddingRight: 8 },
  pilulaAcesa: { ...(Platform.OS === 'web' ? ({ filter: 'brightness(1.08)' } as object) : {}) },
  pilulaTexto: { flex: 1, textAlign: 'center', letterSpacing: 0.3, marginLeft: 34, color: '#ffffff' },
  seta: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
});
