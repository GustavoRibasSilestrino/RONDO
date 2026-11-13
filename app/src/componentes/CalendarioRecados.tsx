/* O calendário do diário de recados: os dias em que a pessoa gravou ficam preenchidos; tocar num deles mostra os áudios daquele dia.
   Setas trocam o mês (não passa do mês de hoje). */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { diaDaSemana, iso, mesAno, somarDias } from '../lib/datas';
import { cores, estilos } from '../tema';
import { Icone } from './Icone';
import { T } from './Ui';

const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

type Props = {
  dias: Set<string>;                          // os dias com recado
  selecionado: string | null;
  aoEscolher: (dia: string | null) => void;   // tocar de novo no mesmo dia desmarca
};

export function CalendarioRecados({ dias, selecionado, aoEscolher }: Props) {
  const hoje = new Date();
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));

  const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  const celulas: (Date | null)[] = [
    ...Array.from({ length: diaDaSemana(mes) }, () => null),
    ...Array.from({ length: ultimo.getDate() }, (_, k) => somarDias(mes, k)),
  ];
  const atualMes = mes.getFullYear() === hoje.getFullYear() && mes.getMonth() === hoje.getMonth();
  const trocar = (n: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1));
  const noMes = celulas.filter((d): d is Date => !!d && dias.has(iso(d))).length;

  return (
    <View>
      <View style={st.topo}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => trocar(-1)} hitSlop={8} style={st.seta}><Icone nome="voltar" tamanho={20} cor="#ffffff" /></Pressable>
        <T tam={15} peso="500" centro style={{ flex: 1 }}>{mesAno(mes).replace(/^./, (c) => c.toUpperCase())}</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" disabled={atualMes} onPress={() => trocar(1)} hitSlop={8} style={[st.seta, atualMes && { opacity: 0.3 }]}><Icone nome="setaDireita" tamanho={20} cor="#ffffff" /></Pressable>
      </View>

      <View style={st.linha}>
        {LETRAS.map((l, k) => <View key={k} style={st.celula}><T tam={11.5} style={{ opacity: 0.6 }}>{l}</T></View>)}
      </View>
      <View style={st.grade}>
        {celulas.map((d, k) => {
          if (!d) return <View key={k} style={st.celula} />;
          const dia = iso(d);
          const gravou = dias.has(dia);
          const ehHoje = dia === iso(hoje);
          const marcado = selecionado === dia;
          const futuro = dia > iso(hoje);
          return (
            <View key={k} style={st.celula}>
              <Pressable
                accessibilityRole={gravou ? 'button' : undefined}
                accessibilityLabel={gravou ? `Dia ${d.getDate()}, com recado${marcado ? ', selecionado' : ''}` : undefined}
                accessibilityState={gravou ? { selected: marcado } : undefined}
                disabled={!gravou}
                onPress={() => aoEscolher(marcado ? null : dia)}
                style={[st.dia, gravou && st.diaFeito, ehHoje && !gravou && st.diaHoje, marcado && st.diaMarcado]}
              >
                <T tam={13} peso={gravou || ehHoje ? '500' : '300'} style={{ opacity: futuro ? 0.35 : 1 }}>{d.getDate()}</T>
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={st.resumo}>
        <T tam={13.5}>{noMes} {noMes === 1 ? 'dia com recado' : 'dias com recado'} neste mês</T>
        <T tam={13.5} cor={cores.texto3}>{dias.size} no total</T>
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  seta: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
  linha: { flexDirection: 'row' },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  celula: { width: '14.2857%', alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  dia: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  diaFeito: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  diaHoje: { borderColor: cores.destaque },
  diaMarcado: { borderColor: '#ffffff' },
  resumo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: cores.linha },
}));
