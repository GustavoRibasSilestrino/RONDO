/* O cartão da água (Dieta e Hoje): quanto já bebeu e a meta em litros, uma barra de progresso e os atalhos de +250 ml (copo),
   +500 ml (garrafa) e −250 ml. Ao bater a meta, a barra fica verde e aparece "Meta batida". */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { COPO_ML, GARRAFA_ML, litros } from '../lib/agua';
import { cores, estilos } from '../tema';
import { Icone } from './Icone';
import { Cartao, T } from './Ui';

export function AguaCartao({ ml, meta, aoMudar, style }: { ml: number; meta: number; aoMudar: (ml: number) => void; style?: object }) {
  const p = Math.min(1, meta ? ml / meta : 0);
  const bateu = ml >= meta;
  const atalho = (rotulo: string, delta: number, icone?: 'gota', desligado = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={delta > 0 ? `Somar ${delta} mililitros` : `Tirar ${-delta} mililitros`}
      disabled={desligado}
      onPress={() => aoMudar(Math.max(0, Math.min(8000, ml + delta)))}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.atalho, delta < 0 && st.atalhoMenos, (pressed || hovered) && { backgroundColor: cores.cartao2 }, desligado && { opacity: 0.4 }]}
    >
      {icone ? <Icone nome={icone} tamanho={15} cor={cores.destaque2} /> : null}
      <T tam={13} peso="500" cor={delta > 0 ? cores.texto : cores.texto2}>{rotulo}</T>
    </Pressable>
  );
  return (
    <Cartao style={style}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T tam={18} peso="300">Água</T>
        <T tam={13} cor={bateu ? cores.bom : cores.texto2}>{bateu ? 'Meta batida' : `Meta ${litros(meta)}`}</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 }} accessible accessibilityLabel={`${litros(ml)} de ${litros(meta)}`}>
        <T tam={28} peso="300">{litros(ml)}</T>
        <T tam={13} cor={cores.texto3}>de {litros(meta)}</T>
      </View>
      <View style={st.trilho}>
        <View style={[st.barra, { width: `${p * 100}%`, backgroundColor: bateu ? cores.bom : cores.acao }]} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {atalho(`+${COPO_ML} ml`, COPO_ML, 'gota')}
        {atalho(`+${GARRAFA_ML} ml`, GARRAFA_ML, 'gota')}
        {atalho(`−${COPO_ML} ml`, -COPO_ML, undefined, ml <= 0)}
      </View>
    </Cartao>
  );
}

const st = estilos(() => StyleSheet.create({
  trilho: { height: 10, borderRadius: 5, backgroundColor: cores.cartao2, overflow: 'hidden', marginTop: 10 },
  barra: { height: '100%', borderRadius: 5 },
  atalho: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: cores.linha2 },
  atalhoMenos: { borderColor: cores.linha },
}));
