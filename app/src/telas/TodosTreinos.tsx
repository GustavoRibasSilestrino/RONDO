/* Todos os treinos: os fixos do RONDO e os que a pessoa criou, em uma tela própria. Tocar em um começa o treino.
   O "+" no topo e o cartão no fim abrem "Adicionar treino" (criar no app ou enviar um arquivo). */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CorpoMusculos } from '../componentes/CorpoMusculos';
import { Icone } from '../componentes/Icone';
import { Chip, T } from '../componentes/Ui';
import type { Rotina } from '../dados';
import { haQuanto } from '../lib/datas';
import { musculosDe } from '../lib/rotinas';
import { cores, estilos, larguraMax } from '../tema';

type Props = {
  aberto: boolean;
  rotinas: Rotina[];
  aoFechar: () => void;
  aoIniciar: (rotinaId: string) => void;
  aoAdicionar: () => void;
  aoEditar: (rotina: Rotina) => void;
  ultimaData: (rotinaId: string) => string | null;
};

export function TodosTreinos({ aberto, rotinas, aoFechar, aoIniciar, aoAdicionar, aoEditar, ultimaData }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.tela}>
        <View style={[st.coluna, { paddingTop: insets.top + 8 }]}>
          <View style={st.topo}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={aoFechar} style={st.botao}>
              <Icone nome="voltar" tamanho={22} cor="#ffffff" />
            </Pressable>
            <T tam={17} peso="500" style={{ flex: 1 }}>Todos os treinos</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Adicionar treino" onPress={aoAdicionar} style={st.mais}>
              <Icone nome="mais" tamanho={20} cor="#ffffff" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, paddingTop: 8, gap: 10 }}>
            {rotinas.map((r) => {
              const data = ultimaData(r.id);
              return (
                <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Começar ${r.nome}`} onPress={() => { aoFechar(); aoIniciar(r.id); }} style={({ pressed }) => [st.rotina, pressed && { opacity: 0.85 }]}>
                  <CorpoMusculos grupos={musculosDe(r)} largura={44} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <T tam={16.5} peso="500" linhas={1}>{r.nome}</T>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {r.propria ? <Chip texto="Seu treino" /> : null}
                      <T tam={12.5} style={{ opacity: 0.8, flexShrink: 1 }} linhas={1}>{r.exercicios.length} {r.exercicios.length === 1 ? 'exercício' : 'exercícios'} · {r.minutos} min</T>
                    </View>
                    <T tam={12} style={{ opacity: 0.6 }} linhas={1}>{data ? `Última vez ${haQuanto(data)}` : 'Ainda não feito'}</T>
                  </View>
                  {r.propria ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${r.nome}`} onPress={() => aoEditar(r)} hitSlop={6} style={st.editar}>
                      <Icone nome="lapis" tamanho={17} cor={cores.texto2} />
                    </Pressable>
                  ) : null}
                  <View style={st.play}><Icone nome="tocar" tamanho={16} cor="#ffffff" /></View>
                </Pressable>
              );
            })}

            <Pressable accessibilityRole="button" accessibilityLabel="Adicionar treino" onPress={aoAdicionar} style={({ pressed }) => [st.novo, pressed && { opacity: 0.85 }]}>
              <View style={st.novoIcone}><Icone nome="mais" tamanho={20} cor="#ffffff" /></View>
              <View style={{ flex: 1 }}>
                <T tam={15.5} peso="500">Adicionar o seu treino</T>
                <T tam={12.5} style={{ marginTop: 2, opacity: 0.75 }}>Crie no app ou envie um arquivo.</T>
              </View>
            </Pressable>
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
  botao: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mais: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  rotina: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 88 },
  editar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  novo: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: cores.linha2, minHeight: 76 },
  novoIcone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
}));
