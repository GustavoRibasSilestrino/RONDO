/* Navegação do app: uma barra contínua no pé da tela com todas as abas à vista, sobre um fundo de vidro.
   A aba atual ganha uma pílula roxa e o nome; as outras mostram só o ícone. */
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, degradeBotao, larguraMax } from '../tema';
import { Icone, NomeIcone } from './Icone';
import { T } from './Ui';

export type ItemAba = { id: string; rotulo: string; icone: NomeIcone };

type Props = { itens: ItemAba[]; atual: string; aoEscolher: (id: string) => void };

/* vidro: no navegador desfoca o que passa por trás; no aparelho, uma película escura translúcida */
const vidro = Platform.OS === 'web' ? ({ backdropFilter: 'blur(22px) saturate(1.5)', WebkitBackdropFilter: 'blur(22px) saturate(1.5)' } as object) : null;

export function BarraAbas({ itens, atual, aoEscolher }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const largura = Math.min(width - 24, larguraMax - 24);

  return (
    <View pointerEvents="box-none" style={[st.doca, { bottom: insets.bottom + 10 }]}>
      <View style={[st.barra, vidro, { width: largura }]}>
        <LinearGradient colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} pointerEvents="none" />
        {itens.map((it) => {
          const ativo = it.id === atual;
          return (
            <Pressable
              key={it.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={it.rotulo}
              onPress={() => {
                if (ativo) return;
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                aoEscolher(it.id);
              }}
              style={[st.aba, { flex: ativo ? 1.9 : 1 }]}
            >
              {ativo ? <LinearGradient colors={degradeBotao} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 22 }]} /> : null}
              <Icone nome={it.icone} tamanho={21} cor={ativo ? '#ffffff' : cores.texto2} />
              {ativo ? <T tam={10.5} peso="500" linhas={1} style={{ marginTop: 2 }}>{it.rotulo}</T> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  doca: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  barra: {
    flexDirection: 'row', alignItems: 'center', height: 60, padding: 4, borderRadius: 30, overflow: 'hidden',
    backgroundColor: 'rgba(18,12,36,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 12,
  },
  aba: { height: 52, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
