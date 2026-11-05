/* Todos os treinos: a lista completa de rotinas, em uma tela própria. Tocar em uma começa o treino. */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone } from '../componentes/Icone';
import { T } from '../componentes/Ui';
import { ROTINAS } from '../dados';
import { haQuanto } from '../lib/datas';
import { cores, estilos, larguraMax } from '../tema';

type Props = { aberto: boolean; aoFechar: () => void; aoIniciar: (rotinaId: string) => void; ultimaData: (rotinaId: string) => string | null };

export function TodosTreinos({ aberto, aoFechar, aoIniciar, ultimaData }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.tela}>
        <View style={[st.coluna, { paddingTop: insets.top + 8 }]}>
          <View style={st.topo}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={aoFechar} style={st.voltar}>
              <Icone nome="voltar" tamanho={22} cor="#ffffff" />
            </Pressable>
            <T tam={17} peso="500" style={{ flex: 1 }}>Todos os treinos</T>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, paddingTop: 8, gap: 10 }}>
            {ROTINAS.map((r) => {
              const data = ultimaData(r.id);
              return (
                <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Começar ${r.nome}`} onPress={() => { aoFechar(); aoIniciar(r.id); }} style={({ pressed }) => [st.rotina, pressed && { opacity: 0.85 }]}>
                  <View style={st.icone}><Icone nome="treino" tamanho={22} cor="#ffffff" /></View>
                  <View style={{ flex: 1 }}>
                    <T tam={16.5} peso="500" linhas={1}>{r.nome}</T>
                    <T tam={12.5} style={{ marginTop: 2, opacity: 0.8 }} linhas={1}>{r.exercicios.length} exercícios · {r.minutos} min · {data ? haQuanto(data) : 'ainda não feito'}</T>
                  </View>
                  <View style={st.play}><Icone nome="tocar" tamanho={16} cor="#ffffff" /></View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 52 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  rotina: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 72 },
  icone: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
}));
