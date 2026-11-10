/* Navegação do app: uma barra contínua de vidro escuro no pé da tela, com todas as abas à vista.
   Cada aba é só o ícone, todas do mesmo tamanho; a atual ganha um círculo roxo. */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, DEGRADE, FIM_DIAGONAL, INICIO_DIAGONAL, larguraMax, estilos, temaAtual } from '../tema';
import { Icone, NomeIcone } from './Icone';

export type ItemAba = { id: string; rotulo: string; icone: NomeIcone };

type Props = { itens: ItemAba[]; atual: string; aoEscolher: (id: string) => void };

const MARGEM = 6;      // da borda da tela até a barra
const RECHEIO = 6;     // da borda da barra até as abas
const ALTURA = 48;     // altura de cada aba: igual à largura do círculo das inativas, para ficarem redondas

/* vidro: só no tema Ultra, no navegador. O desfoque é refeito a cada quadro enquanto a tela rola por baixo e trava
   celulares mais simples; no tema normal a barra é quase opaca e não precisa dele. */
const vidro = () => (Platform.OS === 'web' && temaAtual() === 'ultra' ? ({ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as object) : null);

function Aba({ item, largura, ativo, aoPressionar, movimentoReduzido }: { item: ItemAba; largura: number; ativo: boolean; aoPressionar: () => void; movimentoReduzido: boolean }) {
  const luz = useRef(new Animated.Value(ativo ? 1 : 0)).current;   // o círculo roxo aparece e some

  useEffect(() => {
    if (movimentoReduzido) { luz.setValue(ativo ? 1 : 0); return; }
    Animated.timing(luz, { toValue: ativo ? 1 : 0, duration: 220, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: false }).start();
  }, [ativo, movimentoReduzido, luz]);

  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: ativo }} accessibilityLabel={item.rotulo} onPress={aoPressionar} style={[st.aba, { width: largura }]}>
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: ALTURA, height: ALTURA, borderRadius: ALTURA / 2, overflow: 'hidden', backgroundColor: cores.destaqueForte, opacity: luz, ...(temaAtual() === 'ultra' ? ({ boxShadow: '0 6px 14px -6px rgba(42,98,240,0.85)' } as object) : null), transform: [{ scale: luz.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}
      >
        <LinearGradient colors={DEGRADE.roxo} start={INICIO_DIAGONAL} end={FIM_DIAGONAL} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View pointerEvents="none">
        <Icone nome={item.icone} tamanho={23} cor="#ffffff" />
      </View>
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
  const circulo = Math.floor(util / n);   // todas as abas têm o mesmo tamanho: só o ícone; a atual ganha o círculo roxo
  const folga = util - circulo * n;                              // sobra de arredondamento, repartida nas pontas

  return (
    <View pointerEvents="box-none" style={[st.doca, { bottom: insets.bottom + 16 }]}>
      <View style={[st.barra, vidro(), { width: barra, paddingHorizontal: RECHEIO + folga / 2 }]}>
        {itens.map((it) => {
          const ativo = it.id === atual;
          return (
            <Aba
              key={it.id}
              item={it}
              ativo={ativo}
              largura={circulo}
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

const st = estilos(() => StyleSheet.create({
  doca: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: ALTURA + 2 * RECHEIO + 2, borderRadius: (ALTURA + 2 * RECHEIO + 2) / 2, overflow: 'hidden',
    backgroundColor: cores.barra, borderWidth: 1, borderColor: cores.linha2,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  aba: { height: ALTURA, alignItems: 'center', justifyContent: 'center' },
}));
