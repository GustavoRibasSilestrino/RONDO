/* O mascote da conta passeando pelo app (desde 2026-11-19), como o RONDIN do site: de tempos em tempos ele surge num canto
   sorteado da tela, com um balão que fala a verdade sobre os treinos da pessoa (bom ou ruim), lembra de treinar ou só motiva
   (lib/falasMascote.ts). A função útil: o balão traz um atalho para o que ele acabou de falar (beber um copo de água ali
   mesmo, ir treinar ou ver a missão mais perto do próximo brownie). Tocar nele traz outra fala; o X manda ele embora.
   Só aparece para quem tem um mascote (estado.usuario.mascote); sem mascote, nada aparece. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoja } from '../estado/loja';
import { aguaDoDia, COPO_ML, litros, metaAgua } from '../lib/agua';
import { iso } from '../lib/datas';
import { escolherFala, ROTULO_ATALHO, type Fala } from '../lib/falasMascote';
import { mascoteDe } from '../lib/mascotes';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, estilos } from '../tema';
import { Icone } from './Icone';
import { Mascote } from './Mascote';
import { T } from './Ui';

type Canto = 'se' | 'sd' | 'ie' | 'id';   // superior/inferior, esquerda/direita
const CANTOS: Canto[] = ['se', 'sd', 'ie', 'id'];
/* quando ele aparece (dono, 2026-11-27: "a cada 2 a 3 minutos, não toda hora"): um tempo sorteado entre 2 e 3 minutos, tanto
   depois de abrir o app quanto depois de ir embora. Antes a primeira visita vinha 25 s depois de abrir, e cada vez que o app
   abria ou a página recarregava ele voltava em menos de meio minuto. */
const ESPERA_MIN = 2 * 60_000;
const ESPERA_MAX = 3 * 60_000;
const espera = () => ESPERA_MIN + Math.random() * (ESPERA_MAX - ESPERA_MIN);
const FICA = 14_000;           // quanto tempo ele fica, se ninguém mexer
const TAM = 112;               // (pedido do dono, 2026-11-25: maior; antes 72)

/* `margens`: no computador, o menu lateral (à esquerda) e o painel (à direita) ocupam as bordas; o mascote fica na área do conteúdo */
export function MascoteFlutuante({ ir, oculto, margens }: { ir: (tela: string) => void; oculto?: boolean; margens?: { esquerda: number; direita: number } }) {
  const { estado, commit } = useLoja();
  const insets = useSafeAreaInsets();
  const reduzido = useMovimentoReduzido();
  const nativo = Platform.OS !== 'web';
  const chave = estado.usuario?.mascote ?? null;
  const info = mascoteDe(chave);
  const nomeDele = estado.usuario?.mascoteNome || info?.nome || '';   // o nome que a conta deu com o lápis, ou o de fábrica
  const [visivel, setVisivel] = useState(false);
  const [canto, setCanto] = useState<Canto>('id');
  const [fala, setFala] = useState<Fala | null>(null);
  const ultimas = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entrada = useRef(new Animated.Value(0)).current;
  const balanco = useRef(new Animated.Value(0)).current;
  const recente = useRef(estado);
  recente.current = estado;

  const novaFala = useCallback(() => {
    const f = escolherFala(recente.current, new Date(), ultimas.current);
    ultimas.current = [f.id, ...ultimas.current].slice(0, 4);
    setFala(f);
  }, []);

  const agendar = useCallback((ms: number, acao: () => void) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(acao, ms);
  }, []);

  const sair = useCallback(() => {
    if (reduzido) { setVisivel(false); return; }
    Animated.timing(entrada, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: nativo }).start(() => setVisivel(false));
  }, [entrada, nativo, reduzido]);

  const aparecer = useCallback(() => {
    setCanto(CANTOS[Math.floor(Math.random() * CANTOS.length)]);
    novaFala();
    setVisivel(true);
  }, [novaFala]);

  /* o ciclo: aparece, fica um pouco, vai embora e volta depois */
  useEffect(() => {
    if (!info || oculto) { setVisivel(false); return undefined; }
    if (!visivel) agendar(espera(), aparecer);
    else agendar(FICA, sair);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [info?.chave, oculto, visivel, agendar, aparecer, sair]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* a entrada (sobe do canto) e o balanço de leve enquanto está na tela */
  useEffect(() => {
    if (!visivel) return undefined;
    if (reduzido) { entrada.setValue(1); return undefined; }
    entrada.setValue(0);
    Animated.spring(entrada, { toValue: 1, friction: 6, tension: 80, useNativeDriver: nativo }).start();
    const laco = Animated.loop(Animated.sequence([
      Animated.timing(balanco, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
      Animated.timing(balanco, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
    ]));
    laco.start();
    return () => laco.stop();
  }, [visivel, entrada, balanco, nativo, reduzido]);

  if (!info || !visivel || !fala) return null;

  const emCima = canto[0] === 's';
  const naEsquerda = canto[1] === 'e';
  const lugar = {
    ...(emCima ? { top: insets.top + (margens ? 64 : 92) } : { bottom: insets.bottom + (margens ? 24 : 92) }),
    ...(naEsquerda ? { left: 12 + (margens?.esquerda ?? 0) } : { right: 12 + (margens?.direita ?? 0) }),
  };

  const usarAtalho = () => {
    if (!fala.atalho) return;
    if (fala.atalho === 'agua') {
      const hoje = iso();
      const antes = aguaDoDia(recente.current, hoje);
      commit((e) => { e.agua[hoje] = aguaDoDia(e, hoje) + COPO_ML; });
      const meta = metaAgua(recente.current.perfil);
      const agora = antes + COPO_ML;
      setFala({ id: 'agua-feito', tom: 'bom', peso: 0, texto: agora >= meta ? `Anotado! Meta de água batida: ${litros(agora)}.` : `Anotado: +${COPO_ML} ml. Agora são ${litros(agora)} de ${litros(meta)}.` });
      agendar(5000, sair);
      return;
    }
    ir(fala.atalho === 'treinar' ? 'treino' : 'colecoes');
    sair();
  };
  const cor = fala.tom === 'bom' ? cores.bom : fala.tom === 'ruim' ? cores.erro : cores.destaque2;

  const balao = (
    <View style={[st.balao, naEsquerda ? { borderBottomLeftRadius: emCima ? 18 : 6 } : { borderBottomRightRadius: emCima ? 18 : 6 }, emCima && (naEsquerda ? { borderTopLeftRadius: 6 } : { borderTopRightRadius: 6 })]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={[st.tom, { backgroundColor: cor }]} />
        <View style={{ flex: 1 }}>
          <T tam={11.5} peso="500" cor={cores.texto3} style={{ letterSpacing: 0.6 }}>{nomeDele.toUpperCase()}</T>
          <T tam={14} style={{ marginTop: 2, lineHeight: 20 }}>{fala.texto}</T>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Mandar o mascote embora" onPress={sair} hitSlop={10} style={st.fechar}>
          <Icone nome="fechar" tamanho={14} cor={cores.texto2} />
        </Pressable>
      </View>
      {fala.atalho ? (
        <Pressable accessibilityRole="button" accessibilityLabel={ROTULO_ATALHO[fala.atalho]} onPress={usarAtalho}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.atalho, (pressed || hovered) && { opacity: 0.85 }]}>
          <Icone nome={fala.atalho === 'agua' ? 'gota' : fala.atalho === 'treinar' ? 'halter' : 'brownie'} tamanho={15} cor="#ffffff" />
          <T tam={13} peso="500" cor="#ffffff">{ROTULO_ATALHO[fala.atalho]}</T>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      style={[st.raiz, lugar, { alignItems: naEsquerda ? 'flex-start' : 'flex-end', opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [emCima ? -30 : 30, 0] }) }, { scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}
    >
      {emCima ? null : balao}
      <Pressable accessibilityRole="button" accessibilityLabel={`${nomeDele}, o seu mascote. Tocar para ouvir outra coisa`} onPress={() => { novaFala(); agendar(FICA, sair); }} style={{ alignSelf: naEsquerda ? 'flex-start' : 'flex-end' }}>
        <Animated.View style={{ transform: [{ translateY: balanco.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }}>
          <Mascote chave={info.chave} tamanho={TAM} />
        </Animated.View>
      </Pressable>
      {emCima ? balao : null}
    </Animated.View>
  );
}

const st = estilos(() => StyleSheet.create({
  raiz: { position: 'absolute', zIndex: 900, maxWidth: 300, gap: 6 },
  balao: {
    width: 280, maxWidth: '100%', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.painel,
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  tom: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginTop: 2 },
  fechar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', marginTop: -4, marginRight: -4 },
  atalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, minHeight: 36, borderRadius: 18, backgroundColor: cores.acao },
}));
