/* Navegação do app: uma pílula de vidro claro flutuando no pé da tela, com todas as abas à vista (desde 2026-11-17).
   A aba ATIVA vira uma pílula roxo-escura mais larga, com o ícone e o NOME da aba ao lado (pedido do dono, 2026-11-18); as
   outras ficam só com o ícone, que o leitor de tela lê pelo nome. A troca anima a largura e o nome aparece esmaecendo
   (parado para quem pede menos movimento). */
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, larguraMax, estilos, VIDRO } from '../tema';
import { Icone, NomeIcone } from './Icone';
import { T } from './Ui';
import { Vidro } from './Vidro';

export type ItemAba = { id: string; rotulo: string; icone: NomeIcone };

type Props = { itens: ItemAba[]; atual: string; aoEscolher: (id: string) => void };

const MARGEM = 12;     // da borda da tela até a barra
const RECHEIO = 6;     // da borda da barra até as abas
const ALTURA = 50;     // altura de cada aba

function Aba({ item, larguraAtiva, larguraInativa, ativo, aoPressionar, movimentoReduzido }: {
  item: ItemAba; larguraAtiva: number; larguraInativa: number; ativo: boolean; aoPressionar: () => void; movimentoReduzido: boolean;
}) {
  const luz = useRef(new Animated.Value(ativo ? 1 : 0)).current;   // 0 = só o ícone; 1 = pílula com o nome
  useEffect(() => {
    if (movimentoReduzido) { luz.setValue(ativo ? 1 : 0); return; }
    Animated.timing(luz, { toValue: ativo ? 1 : 0, duration: 260, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: false }).start();
  }, [ativo, movimentoReduzido, luz]);
  const largura = luz.interpolate({ inputRange: [0, 1], outputRange: [larguraInativa, larguraAtiva] });

  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: ativo }} accessibilityLabel={item.rotulo} onPress={aoPressionar}>
      <Animated.View style={[st.aba, { width: largura }]}>
        {/* a pílula roxo-escura da aba ativa */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st.pilula, { opacity: luz }]} />
        <View pointerEvents="none" style={st.miolo}>
          <Icone nome={item.icone} tamanho={22} cor={ativo ? cores.branco : cores.texto} />
          {ativo ? (
            <Animated.View style={{ opacity: luz, transform: [{ translateX: luz.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }}>
              <T tam={13.5} peso="500" cor="#ffffff" linhas={1}>{item.rotulo}</T>
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function BarraAbas({ itens, atual, aoEscolher }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduzido = useMovimentoReduzido();

  const n = itens.length;
  const barra = Math.min(width - 2 * MARGEM, larguraMax - 2 * MARGEM);
  const util = barra - 2 * RECHEIO - 2;   // 2 = a borda de 1px de cada lado
  /* a ativa leva o espaço do nome; as outras dividem o resto (sem aba ativa, todas iguais) */
  const ativa = itens.find((i) => i.id === atual);
  const temAtiva = !!ativa;
  /* a ativa tem a largura do nome dela, com folga (ícone 22 + espaço 8 + margens 34): "Comunidade" ficava apertado (2026-11-18).
     As outras nunca ficam com menos de 44 px, o mínimo de toque. */
  const larguraAtiva = Math.min(util - 44 * (n - 1), Math.max(108, (ativa?.rotulo.length ?? 6) * 7.8 + 64));
  const larguraInativa = temAtiva ? (util - larguraAtiva) / (n - 1) : util / n;

  return (
    <View pointerEvents="box-none" style={[st.doca, { bottom: insets.bottom + 16 }]}>
      {/* a pílula é de vidro (Liquid Glass no iOS 26+; nos outros, o vidro translúcido de antes: componentes/Vidro.tsx) */}
      <Vidro tom={cores.barra} style={[st.barra, { width: barra, paddingHorizontal: RECHEIO }]}>
        {itens.map((it) => {
          const ativo = it.id === atual;
          return (
            <Aba
              key={it.id}
              item={it}
              ativo={ativo}
              larguraAtiva={larguraAtiva}
              larguraInativa={larguraInativa}
              movimentoReduzido={reduzido}
              aoPressionar={() => {
                if (ativo) return;
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                aoEscolher(it.id);
              }}
            />
          );
        })}
      </Vidro>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  doca: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: ALTURA + 2 * RECHEIO + 2, borderRadius: (ALTURA + 2 * RECHEIO + 2) / 2, overflow: 'hidden',
    backgroundColor: cores.barra, borderWidth: 1, borderColor: cores.linha2, ...VIDRO,
    shadowColor: '#232323', shadowOpacity: cores.tinta === '255,255,255' ? 0.28 : 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  aba: { height: ALTURA, alignItems: 'center', justifyContent: 'center' },
  pilula: { borderRadius: ALTURA / 2, backgroundColor: cores.destaqueForte },
  miolo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 10 },
}));
