/* Criar ou editar um treino próprio: nome, músculos trabalhados e a lista de exercícios (séries, repetições e carga).
   Também serve de revisão para o que veio de um arquivo: a pessoa confere, ajusta e salva. */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Exercicio, Rotina } from '../dados';
import { minutosDe } from '../lib/rotinas';
import { OPCOES_MUSCULO, inferirMusculos, type GrupoMuscular } from '../lib/musculos';
import { cores, estilos, larguraMax } from '../tema';
import { CorpoMusculos } from './CorpoMusculos';
import { Icone } from './Icone';
import { Botao, Campo, Passo, T } from './Ui';

/* um treino em edição: `id` vazio é um treino novo */
export type Rascunho = { id: string; nome: string; exercicios: Exercicio[]; musculos: GrupoMuscular[] };

let seq = 0;
const novoExercicio = (): Exercicio => ({ id: `x${Date.now().toString(36)}${(seq++).toString(36)}`, nome: '', series: 3, faixa: [8, 12], passo: 2.5, inicial: 20 });
const passoDe = (kg: number): number => (kg >= 100 ? 5 : kg >= 40 ? 2.5 : kg >= 15 ? 2 : 1);

type Props = {
  aberto: boolean;
  inicial: Rascunho | null;
  aoFechar: () => void;
  aoSalvar: (r: Rotina) => void;
  aoExcluir?: (id: string) => void;
};

export function EditorTreino({ aberto, inicial, aoFechar, aoSalvar, aoExcluir }: Props) {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState('');
  const [musculos, setMusculos] = useState<GrupoMuscular[]>([]);
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [tentou, setTentou] = useState(false);

  /* ao abrir, carrega o rascunho (ou começa vazio, com um exercício para preencher) */
  useEffect(() => {
    if (!aberto) return;
    setNome(inicial?.nome ?? '');
    setMusculos(inicial?.musculos ?? []);
    setExercicios(inicial?.exercicios.length ? inicial.exercicios : [novoExercicio()]);
    setTentou(false);
  }, [aberto, inicial]);

  const mudar = (id: string, parte: Partial<Exercicio>) => setExercicios((l) => l.map((x) => (x.id === id ? { ...x, ...parte } : x)));
  const marcado = (grupos: GrupoMuscular[]) => grupos.every((g) => musculos.includes(g));
  const alternar = (grupos: GrupoMuscular[]) => setMusculos((m) => (marcado(grupos) ? m.filter((g) => !grupos.includes(g)) : [...new Set([...m, ...grupos])]));

  const nomeOk = nome.trim().length >= 2;
  const validos = exercicios.filter((x) => x.nome.trim().length >= 2);
  const podeSalvar = nomeOk && validos.length > 0;
  const editando = !!inicial?.id;

  const salvar = () => {
    setTentou(true);
    if (!podeSalvar) return;
    const lista = validos.map((x) => ({ ...x, nome: x.nome.trim(), passo: passoDe(x.inicial) }));
    aoSalvar({ id: inicial?.id || `p${Date.now().toString(36)}`, nome: nome.trim(), minutos: minutosDe(lista), exercicios: lista, musculos: musculos.length ? musculos : inferirMusculos(lista.map((x) => x.nome)), propria: true });
  };

  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.tela}>
        <View style={[st.coluna, { paddingTop: insets.top + 8 }]}>
          <View style={st.topo}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={aoFechar} style={st.voltar}>
              <Icone nome="voltar" tamanho={22} cor="#ffffff" />
            </Pressable>
            <T tam={17} peso="500" style={{ flex: 1 }}>{editando ? 'Editar treino' : 'Novo treino'}</T>
            <Botao pequeno titulo="Salvar" icone="ok" aoPressionar={salvar} desabilitado={!podeSalvar && tentou} />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 48, paddingTop: 10, gap: 18 }}>
            <View>
              <Campo rotulo="Nome do treino" value={nome} onChangeText={setNome} placeholder="Ex.: Peito e ombros" maxLength={40} />
              {tentou && !nomeOk ? <T tam={12.5} cor={cores.erro} style={{ marginTop: 6 }}>Dê um nome ao treino (2 letras ou mais).</T> : null}
            </View>

            {/* músculos: marcar pinta a figura */}
            <View style={st.musculos}>
              <View style={{ flex: 1, gap: 10 }}>
                <T tam={14} peso="500">Músculos trabalhados</T>
                <View style={st.chips}>
                  {OPCOES_MUSCULO.map((o) => {
                    const on = marcado(o.grupos);
                    return (
                      <Pressable key={o.rotulo} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => alternar(o.grupos)} style={[st.chip, on && st.chipOn]}>
                        <T tam={13} peso={on ? '500' : '300'}>{o.rotulo}</T>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <CorpoMusculos grupos={musculos} largura={64} />
            </View>

            {/* exercícios */}
            <View style={{ gap: 12 }}>
              <T tam={14} peso="500">Exercícios</T>
              {exercicios.map((x, i) => (
                <View key={x.id} style={st.exercicio}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                    <View style={st.numero}><T tam={12} peso="500">{i + 1}</T></View>
                    <View style={{ flex: 1 }}>
                      <Campo rotulo="Exercício" value={x.nome} onChangeText={(v) => mudar(x.id, { nome: v })} placeholder="Ex.: Supino reto" maxLength={60} />
                    </View>
                    {exercicios.length > 1 ? (
                      <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${x.nome || `exercício ${i + 1}`}`} onPress={() => setExercicios((l) => l.filter((y) => y.id !== x.id))} style={st.remover}>
                        <Icone nome="lixo" tamanho={18} cor={cores.texto2} />
                      </Pressable>
                    ) : null}
                  </View>
                  <View style={st.grade}>
                    <View style={st.celula}><T tam={11} cor={cores.texto2}>Séries</T><Passo rotulo="séries" valor={x.series} aoMudar={(v) => mudar(x.id, { series: v })} min={1} max={10} /></View>
                    <View style={st.celula}><T tam={11} cor={cores.texto2}>Carga</T><Passo rotulo="carga" valor={x.inicial} aoMudar={(v) => mudar(x.id, { inicial: v })} passo={x.inicial >= 40 ? 2.5 : 1} min={0} max={500} unidade="kg" formato={(v) => String(v).replace('.', ',')} /></View>
                    <View style={st.celula}><T tam={11} cor={cores.texto2}>Repetições de</T><Passo rotulo="repetições mínimas" valor={x.faixa[0]} aoMudar={(v) => mudar(x.id, { faixa: [v, Math.max(v, x.faixa[1])] })} min={1} max={50} /></View>
                    <View style={st.celula}><T tam={11} cor={cores.texto2}>até</T><Passo rotulo="repetições máximas" valor={x.faixa[1]} aoMudar={(v) => mudar(x.id, { faixa: [Math.min(x.faixa[0], v), v] })} min={1} max={80} /></View>
                  </View>
                </View>
              ))}
              <Pressable accessibilityRole="button" accessibilityLabel="Adicionar exercício" onPress={() => setExercicios((l) => [...l, novoExercicio()])} style={({ pressed }) => [st.adicionar, pressed && { opacity: 0.8 }]}>
                <Icone nome="mais" tamanho={18} cor="#ffffff" />
                <T tam={14} peso="500">Adicionar exercício</T>
              </Pressable>
              {tentou && validos.length === 0 ? <T tam={12.5} cor={cores.erro}>Preencha o nome de pelo menos um exercício.</T> : null}
            </View>

            <Botao titulo="Salvar treino" icone="ok" aoPressionar={salvar} />
            {editando && aoExcluir ? <Botao tipo="perigo" icone="lixo" titulo="Excluir treino" aoPressionar={() => aoExcluir(inicial!.id)} /> : null}
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
  musculos: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao2 },
  chipOn: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  exercicio: { padding: 14, borderRadius: 22, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, gap: 14 },
  numero: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2, marginBottom: 12 },
  remover: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  celula: { width: '47%', gap: 6 },
  adicionar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: cores.linha2 },
}));
