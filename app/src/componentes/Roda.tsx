/* Navegação do app: um botão redondo embaixo, só com o ícone da tela atual. Ao tocar, ele some e sobe uma roda com as
   outras telas: deslize para o lado para girar e toque em um ícone para abrir a tela na hora. Tocar no fundo fecha. */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, PanResponder, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, degradeBotao } from '../tema';
import { Icone, NomeIcone } from './Icone';
import { T } from './Ui';

export type ItemRoda = { id: string; rotulo: string; icone: NomeIcone };

const mod = (v: number, p: number) => ((v % p) + p) % p;

type Props = { itens: ItemRoda[]; atual: string; aoEscolher: (id: string) => void };

export function Roda({ itens, atual, aoEscolher }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const nativo = Platform.OS !== 'web';

  const lista = useMemo(() => itens.filter((i) => i.id !== atual), [itens, atual]);   // todas menos a tela atual
  const itemAtual = itens.find((i) => i.id === atual) ?? itens[0];
  const n = lista.length;
  const passo = Math.min(360 / n, 40);   // graus entre dois ícones
  const periodo = n * passo;
  const R = Math.min(160, Math.max(118, width * 0.38));   // raio do arco
  const lift = insets.bottom + 42;                        // altura do centro da roda: o centro do botão redondo de baixo

  const [aberta, setAberta] = useState(false);
  const [montada, setMontada] = useState(false);   // a camada existe enquanto a animação de saída roda
  const [rot, setRot] = useState(0);
  const [congelada, setCongelada] = useState<ItemRoda[]>([]);   // a ordem da roda fica fixa enquanto ela está na tela, mesmo depois de trocar de tela
  const rotRef = useRef(0);
  const ativoRef = useRef(-1);
  const raf = useRef<number | null>(null);
  const arrasto = useRef({ r0: 0, fim: 0 });
  const anim = useRef(new Animated.Value(0)).current;

  const parar = () => {
    if (raf.current !== null) { cancelAnimationFrame(raf.current); raf.current = null; }
  };

  const definir = (v: number) => {
    rotRef.current = v;
    setRot(v);
    const k = mod(Math.round(-v / passo), n);
    if (k !== ativoRef.current) {
      ativoRef.current = k;
      if (nativo) Haptics.selectionAsync().catch(() => {});
    }
  };

  /* depois de arrastar, a roda encaixa no ícone mais próximo do topo */
  const encaixar = () => {
    parar();
    const de = rotRef.current;
    const para = -Math.round(-de / passo) * passo;
    const t0 = Date.now();
    const quadro = () => {
      const p = Math.min(1, (Date.now() - t0) / 220);
      definir(de + (para - de) * (1 - Math.pow(1 - p, 3)));
      raf.current = p < 1 ? requestAnimationFrame(quadro) : null;
    };
    quadro();
  };

  const abrir = () => {
    const idxAtual = itens.findIndex((i) => i.id === atual);
    const proximo = lista.findIndex((i) => itens.indexOf(i) > idxAtual);   // a próxima tela da lista começa no topo
    ativoRef.current = -1;
    definir(-Math.max(0, proximo) * passo);
    setCongelada(lista);
    setMontada(true);
    setAberta(true);
    Animated.timing(anim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: nativo }).start();
  };

  const fechar = () => {
    parar();
    setAberta(false);
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: nativo }).start(({ finished }) => {
      if (finished) setMontada(false);   // se reabriu no meio, a animação foi interrompida e a camada fica
    });
  };

  /* no navegador, soltar o mouse depois de arrastar também dispara um clique; logo depois de girar a roda, ele é ignorado */
  const foiArrasto = () => Date.now() - arrasto.current.fim < 250;

  const escolher = (id: string) => {
    if (foiArrasto()) return;
    fechar();
    aoEscolher(id);   // sem confirmação: tocou, abriu
  };

  /* botão voltar do Android: com a roda aberta, fecha a roda */
  useEffect(() => {
    if (!aberta) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { fechar(); return true; });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberta]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => { parar(); arrasto.current.r0 = rotRef.current; },
        onPanResponderMove: (_e, g) => definir(arrasto.current.r0 + g.dx * (180 / (Math.PI * R))),   // 1 px de deslize = 1 px no arco
        onPanResponderRelease: () => { arrasto.current.fim = Date.now(); encaixar(); },
        onPanResponderTerminate: () => { arrasto.current.fim = Date.now(); encaixar(); },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [R, passo, n],
  );

  const ativo = mod(Math.round(-rot / passo), n);
  const roda = montada ? congelada : lista;

  return (
    <>
      {montada ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: anim }]} {...pan.panHandlers}>
          <LinearGradient colors={['rgba(5,5,7,0.55)', 'rgba(10,5,24,0.94)', '#0a0518']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (!foiArrasto()) fechar(); }} accessibilityLabel="Fechar menu" />

          <View pointerEvents="none" style={[st.rotulo, { bottom: lift + R + 64 }]}>
            <T tam={40} peso="200" centro>{roda[ativo]?.rotulo ?? ''}</T>
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: width / 2 - R, bottom: lift - R, width: 2 * R, height: 2 * R, borderRadius: R, borderWidth: 1, borderColor: cores.linha2 }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: width / 2, bottom: lift + R + 22, width: 1, height: 16, backgroundColor: cores.destaque2 }} />

          {roda.map((it, k) => {
            const a = mod(k * passo + rot + periodo / 2, periodo) - periodo / 2;   // ícones passam por trás e reaparecem do outro lado
            const rad = (a * Math.PI) / 180;
            const longe = Math.abs(a) > 90;                                          // escondido atrás do item de baixo
            const sel = k === ativo;
            return (
              <Pressable
                key={it.id}
                disabled={longe}
                onPress={() => escolher(it.id)}
                accessibilityRole="button"
                accessibilityLabel={it.rotulo}
                style={[st.item, { left: width / 2 + R * Math.sin(rad) - 28, bottom: lift + R * Math.cos(rad) - 28, opacity: longe ? 0 : 1, transform: [{ scale: longe ? 0.6 : sel ? 1.18 : 1 }] }]}
              >
                {sel ? <LinearGradient colors={degradeBotao} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
                <View pointerEvents="none" style={{ zIndex: 1 }}>
                  <Icone nome={it.icone} tamanho={22} cor={sel ? '#ffffff' : cores.texto2} />
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
      ) : null}

      {/* só o ícone da tela atual, redondo, embaixo e no meio; some enquanto a roda está aberta */}
      <Animated.View
        pointerEvents={aberta ? 'none' : 'box-none'}
        style={[st.doca, { bottom: insets.bottom + 14, opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
      >
        <Pressable
          onPress={abrir}
          accessibilityRole="button"
          accessibilityLabel={`Menu: ${itemAtual.rotulo}. Toque para escolher outra tela`}
          style={({ pressed }) => [st.botao, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Icone nome={itemAtual.icone} tamanho={22} />
        </Pressable>
      </Animated.View>
    </>
  );
}

const st = StyleSheet.create({
  rotulo: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  item: { position: 'absolute', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'rgba(14,10,26,0.94)', borderWidth: 1, borderColor: cores.linha2 },
  doca: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  botao: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(8,6,14,0.92)', borderWidth: 1, borderColor: cores.linha2,
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
});
