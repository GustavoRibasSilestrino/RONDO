/* Navegação do app: uma barra contínua de vidro no pé da tela, com todas as abas à vista.
   Cada aba é um círculo do mesmo tamanho; só a atual vira uma pílula roxa, com o ícone e o nome lado a lado. */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, degradeBotao, larguraMax } from '../tema';
import { Icone, NomeIcone } from './Icone';
import { T } from './Ui';

export type ItemAba = { id: string; rotulo: string; icone: NomeIcone };

type Props = { itens: ItemAba[]; atual: string; aoEscolher: (id: string) => void };

const MARGEM = 12;     // da borda da tela até a barra
const RECHEIO = 6;     // da borda da barra até as abas
const ALTURA = 48;     // altura de cada aba: igual à largura do círculo das inativas, para ficarem redondas
const PILULA_MAX = 104;

/* vidro: no navegador desfoca o que passa por trás; no aparelho, uma película escura translúcida */
const vidro = Platform.OS === 'web' ? ({ backdropFilter: 'blur(24px) saturate(1.6)', WebkitBackdropFilter: 'blur(24px) saturate(1.6)' } as object) : null;

function Aba({ item, largura, ativo, aoPressionar, movimentoReduzido }: { item: ItemAba; largura: number; ativo: boolean; aoPressionar: () => void; movimentoReduzido: boolean }) {
  const w = useRef(new Animated.Value(largura)).current;
  const luz = useRef(new Animated.Value(ativo ? 1 : 0)).current;

  useEffect(() => {
    if (movimentoReduzido) { w.setValue(largura); luz.setValue(ativo ? 1 : 0); return; }
    Animated.parallel([
      Animated.timing(w, { toValue: largura, duration: 280, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: false }),
      Animated.timing(luz, { toValue: ativo ? 1 : 0, duration: 220, useNativeDriver: false }),
    ]).start();
  }, [largura, ativo, movimentoReduzido, w, luz]);

  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: ativo }} accessibilityLabel={item.rotulo} onPress={aoPressionar}>
      <Animated.View style={[st.aba, { width: w }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: luz }]} pointerEvents="none">
          <LinearGradient colors={degradeBotao} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <View pointerEvents="none" style={st.conteudo}>
          <Icone nome={item.icone} tamanho={21} cor={ativo ? '#ffffff' : cores.texto2} />
          {ativo ? <T tam={12.5} peso="500" linhas={1}>{item.rotulo}</T> : null}
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
  const util = barra - 2 * RECHEIO - 2;                                  // 2 = a borda de 1px de cada lado
  const pilula = Math.min(PILULA_MAX, Math.max(92, util - (n - 1) * 32));
  const circulo = Math.min(ALTURA, Math.floor((util - pilula) / (n - 1)));   // as inativas dividem o que sobra
  const folga = util - pilula - circulo * (n - 1);                       // sobra de arredondamento, repartida nas pontas

  return (
    <View pointerEvents="box-none" style={[st.doca, { bottom: insets.bottom + 10 }]}>
      <View style={[st.barra, vidro, { width: barra, paddingHorizontal: RECHEIO + folga / 2 }]}>
        <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
        {itens.map((it) => {
          const ativo = it.id === atual;
          return (
            <Aba
              key={it.id}
              item={it}
              ativo={ativo}
              largura={ativo ? pilula : circulo}
              movimentoReduzido={reduzido}
              aoPressionar={() => {
                if (ativo) return;
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                aoEscolher(it.id);
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  doca: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: ALTURA + 2 * RECHEIO + 2, borderRadius: (ALTURA + 2 * RECHEIO + 2) / 2, overflow: 'hidden',
    backgroundColor: 'rgba(20,14,40,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  aba: { height: ALTURA, borderRadius: ALTURA / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  conteudo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
});
