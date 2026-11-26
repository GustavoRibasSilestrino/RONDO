/* Peças das abas Clubes e Desafios: a linha de "criar" do topo, o título de seção e o estado vazio. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icone, type NomeIcone } from '../../componentes/Icone';
import { Botao, Cartao, T } from '../../componentes/Ui';
import { cores, estilos } from '../../tema';

/* a linha de criar: o + violeta, o nome da ação e uma frase do que ela faz */
export function LinhaCriar({ titulo, frase, aoPressionar }: { titulo: string; frase: string; aoPressionar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={titulo} accessibilityHint={frase} onPress={aoPressionar}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.criar, (pressed || hovered) && st.criarSobre]}
    >
      <View style={st.mais}><Icone nome="mais" tamanho={22} cor={cores.branco} espessura={2} /></View>
      <View style={{ flex: 1 }}>
        <T tam={16} peso="500" pixel>{titulo}</T>
        <T tam={12.5} cor={cores.texto3} style={{ marginTop: 2, lineHeight: 17 }}>{frase}</T>
      </View>
      <Icone nome="setaDireita" tamanho={18} cor={cores.texto3} />
    </Pressable>
  );
}

export function TituloSecao({ children, direita }: { children: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <View style={st.titulo}>
      <T tam={19} peso="400" style={{ letterSpacing: -0.3 }}>{children}</T>
      {direita}
    </View>
  );
}

/* o estado vazio: nada pronto, quem cria são as pessoas (pedido do dono, 2026-11-26) */
export function Vazio({ icone, titulo, frase, acao, aoAcao }: { icone: NomeIcone; titulo: string; frase: string; acao?: string; aoAcao?: () => void }) {
  return (
    <Cartao style={{ alignItems: 'center', paddingVertical: 28 }}>
      <View style={st.vazioIcone}><Icone nome={icone} tamanho={28} cor={cores.destaque2} /></View>
      <T tam={17} peso="400" centro style={{ marginTop: 14 }}>{titulo}</T>
      <T tam={13.5} cor={cores.texto2} centro style={{ marginTop: 6, lineHeight: 20, maxWidth: 320 }}>{frase}</T>
      {acao && aoAcao ? <Botao pequeno icone="mais" titulo={acao} aoPressionar={aoAcao} style={{ marginTop: 16, alignSelf: 'center' }} /> : null}
    </Cartao>
  );
}

const st = estilos(() => StyleSheet.create({
  criar: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  criarSobre: { backgroundColor: cores.cartao2 },
  mais: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.acao },
  titulo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
  vazioIcone: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: `rgba(${cores.tom},0.14)`, borderWidth: 1, borderColor: `rgba(${cores.tom},0.28)` },
}));
