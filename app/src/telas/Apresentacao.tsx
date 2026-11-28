/* A apresentação do RONDIN: a primeira coisa que a pessoa vê antes de entrar ou criar conta. No celular, logo depois da
   abertura (a tela preta com o nome RONDO); no navegador, quando a pessoa clica em "Entrar" ou "Criar conta" no site.
   O RONDIN (3D) nasce no meio da tela e se apresenta sozinho, falando; a frase surge palavra por palavra, esmaecendo, com a
   mesma legenda das perguntas (Legenda, de telas/Rondin.tsx). No canto, o alto-falante desliga a voz (fica guardado).
   Quando a frase termina, aparece o botão para seguir (o botão principal do app, componentes/Ui.tsx). A frase fica em lib/rondinTextos.ts (fala.boasVindas). */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotaoVoz } from '../componentes/BotaoVoz';
import { Orbe } from '../componentes/Orbe';
import { Botao, T } from '../componentes/Ui';
import { useMovimentoReduzido } from '../lib/movimento';
import type { EstadoOrbe } from '../lib/orbe';
import { TEXTOS as FALAS } from '../lib/rondinTextos';
import { falar, parar, somEstaBloqueado, sotaquePadrao, useSomBloqueado, useVozDesligada } from '../lib/rondinVoz';
import { Legenda } from './Rondin';

const BOTAO = { pt: 'Vamos lá', en: "Let's go", es: 'Vamos' };
const TOQUE = { pt: 'Toque para ter a experiência', en: 'Tap for the full experience', es: 'Toca para vivir la experiencia' };

type Props = {
  aoContinuar: () => void;
  atraso?: number;   // ms antes de começar (o tempo de a abertura preta sumir, lib/abertura.ts)
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
  /* o RONDIN nasce depois da abertura preta (o nome RONDO), no celular e no navegador */
  const nasce = useRef(new Animated.Value(0)).current;
  const botao = useRef(new Animated.Value(0)).current;
  const nativo = Platform.OS !== 'web';
  const tamanho = Math.round(Math.min(width * 0.8, height * 0.46, 380));

  /* um toque só pode fazer ele se apresentar uma vez: o toque que libera o som (no orbe, o lugar natural) disparava a
     apresentação duas vezes, uma pela liberação e outra pelo toque no orbe, e a frase começava, era cortada e recomeçava */
  const ultimaVez = useRef(0);
  const reserva = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* `porToque`: a pessoa acabou de tocar (no orbe ou em qualquer lugar, liberando o som). Aí o navegador já não recusa o som,
     e a legenda aparece NA HORA, sem esperar o áudio começar. Antes ela esperava a voz começar de verdade, e no iPhone, quando
     o áudio demorava ou travava, a tela ficava vazia por até 8 s depois do "Toque para ter a experiência" (dono, 2026-11-27:
     "eu toco e não aparece nada depois"). */
  const apresentar = (porToque = false) => {
    const agora = Date.now();
    if (agora - ultimaVez.current < 1200) return;
    ultimaVez.current = agora;
    setIndiceVoz(-1); setDuracaoMs(0); setChave((c) => c + 1);
    setEstado('falando');
    if (reserva.current) clearTimeout(reserva.current);
    /* na primeira vez, sozinho (sem toque), a legenda espera a voz começar: se o navegador recusa o som, a frase não aparece
       para sumir logo em seguida, trocada pelo "Toque para ter a experiência". No celular (app instalado) não há recusa, e
       depois de um toque também não: a legenda vem junto. Se a voz não começar em 1,2 s (sem recusa), a legenda vem assim mesmo. */
    if (porToque || nativo) setComecou(true);
    else reserva.current = setTimeout(() => { if (!somEstaBloqueado()) setComecou(true); }, 1200);
    falar([fala], sotaque, () => setEstado('quieto'), (i) => setIndiceVoz(i), (ms) => setDuracaoMs(ms), () => setComecou(true));
  };

  useEffect(() => {
    const inicio = setTimeout(() => {
      Animated.timing(nasce, { toValue: 1, duration: reduzido ? 1 : 600, easing: Easing.out(Easing.cubic), useNativeDriver: nativo }).start();
      /* ele começa a falar sozinho, logo depois de nascer (era 700 ms; desde 2026-11-27, 250 ms) */
      setTimeout(() => apresentar(), reduzido ? 100 : 250);
    }, atraso);
    return () => { clearTimeout(inicio); if (reserva.current) clearTimeout(reserva.current); parar(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* no navegador, a primeira fala pode ser recusada (o som só é liberado depois de um toque na página). Aí o RONDIN fica
     parado no meio, sem falar e sem legenda, só com "Toque para ter a experiência" (pedido do dono: disfarça o toque que o
     navegador exige); no primeiro toque em qualquer lugar ele começa a se apresentar, com a voz e a legenda juntas */
  const bloqueado = useSomBloqueado();
  const [mudo] = useVozDesligada();
  const estavaBloqueado = useRef(false);
  const aviso = useRef(new Animated.Value(0)).current;
  const esperandoToque = bloqueado && !mudo;
  useEffect(() => {
    if (bloqueado) { estavaBloqueado.current = true; setComecou(false); }
    else if (estavaBloqueado.current) { estavaBloqueado.current = false; if (!mudo) apresentar(true); }
    Animated.timing(aviso, { toValue: bloqueado && !mudo ? 1 : 0, duration: reduzido ? 1 : 400, useNativeDriver: nativo }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloqueado, mudo]);

  useEffect(() => {
    if (pronto) Animated.timing(botao, { toValue: 1, duration: reduzido ? 1 : 520, easing: Easing.out(Easing.cubic), useNativeDriver: nativo }).start();
  }, [pronto, botao, reduzido, nativo]);

  const seguir = () => { parar(); aoContinuar(); };

  return (
    <View style={[st.tela, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      <BotaoVoz idioma={sotaque.idioma} style={[st.voz, { top: insets.top + 14 }]} />

      <View style={st.meio}>
        <Animated.View style={{ opacity: nasce }}>
          <Orbe hud tamanho={tamanho} estado={estado} aoPressionar={() => apresentar(true)} rotulo={fala} />
        </Animated.View>
        <T tam={12} peso="500" style={st.nome}>RONDIN</T>
        <View style={st.fala}>
          {esperandoToque ? (
            <Animated.View pointerEvents="none" style={[st.aviso, { opacity: aviso }]}>
              <T tam={15} cor="rgba(228,228,228,0.86)" style={{ textAlign: 'center', letterSpacing: 0.3 }}>{TOQUE[sotaque.idioma]}</T>
            </Animated.View>
          ) : comecou ? (
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
        <Botao titulo={BOTAO[sotaque.idioma]} aoPressionar={seguir} style={{ minHeight: 56 }} />
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 24, alignItems: 'center' },
  voz: { position: 'absolute', right: 16, zIndex: 2 },
  meio: { flex: 1, width: '100%', maxWidth: 560, alignItems: 'center', justifyContent: 'center' },
  nome: { letterSpacing: 5, color: '#22c55e', marginTop: 2, opacity: 0.9 },   // o nome RONDIN, no verde dele (mais escuro desde 2026-11-27)
  fala: { width: '100%', maxWidth: 460, minHeight: 100 },
  base: { width: '100%', maxWidth: 340, alignItems: 'stretch' },
  aviso: { paddingTop: 18, paddingHorizontal: 16, alignItems: 'center' },
});
