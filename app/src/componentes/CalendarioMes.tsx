/* Calendário do mês para ver a constância: os dias com treino ou check-in ficam preenchidos. Setas trocam o mês. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLoja } from '../estado/loja';
import { diaAtivo, streakAtual } from '../lib/calc';
import { diaDaSemana, iso, mesAno, somarDias } from '../lib/datas';
import { cores, estilos } from '../tema';
import { Icone } from './Icone';
import { T } from './Ui';

const LETRAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function CalendarioMes() {
  const { estado } = useLoja();
  const hoje = new Date();
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));

  const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  const celulas: (Date | null)[] = [
    ...Array.from({ length: diaDaSemana(mes) }, () => null),
    ...Array.from({ length: ultimo.getDate() }, (_, k) => somarDias(mes, k)),
  ];
  const passou = (d: Date) => iso(d) <= iso(hoje);
  const noMes = celulas.filter((d): d is Date => !!d && passou(d) && diaAtivo(estado, iso(d))).length;
  const atualMes = mes.getFullYear() === hoje.getFullYear() && mes.getMonth() === hoje.getMonth();
  const trocar = (n: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1));
  const seq = streakAtual(estado, hoje);

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
          const futuro = !passou(d);
          const feito = !futuro && diaAtivo(estado, iso(d));
          const ehHoje = iso(d) === iso(hoje);
          return (
            <View key={k} style={st.celula}>
              <View accessibilityLabel={feito ? `Dia ${d.getDate()}, ativo` : undefined} style={[st.dia, feito && st.diaFeito, ehHoje && !feito && st.diaHoje]}>
                <T tam={13} peso={feito || ehHoje ? '500' : '300'} style={{ opacity: futuro ? 0.35 : 1 }}>{d.getDate()}</T>
              </View>
            </View>
          );
        })}
      </View>

      <View style={st.resumo}>
        <T tam={13.5}>{noMes} {noMes === 1 ? 'dia ativo' : 'dias ativos'} neste mês</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Icone nome="chama" tamanho={15} cor={cores.alerta} />
          <T tam={13.5} peso="500" cor={cores.alerta}>{seq} {seq === 1 ? 'dia seguido' : 'dias seguidos'}</T>
        </View>
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  seta: { width: 40, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
  linha: { flexDirection: 'row' },
  grade: { flexDirection: 'row', flexWrap: 'wrap' },
  celula: { width: '14.2857%', alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  dia: { width: 38, height: 38, borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  diaFeito: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  diaHoje: { borderColor: cores.destaque },
  resumo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: cores.linha },
}));
