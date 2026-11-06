/* Coluna de resumo à direita, só no computador: a semana, a sequência de dias e os próximos treinos.
   Tudo vem do que já está no aparelho; nada novo é pedido ao servidor. */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLoja } from '../estado/loja';
import { diaAtivo, statsSemana, streakAtual } from '../lib/calc';
import { diaDaSemana, fmt, haQuanto, iso, somarDias } from '../lib/datas';
import { LARGURA_PAINEL } from '../lib/largura';
import { todasRotinas } from '../lib/rotinas';
import { cores, estilos } from '../tema';
import { Icone } from './Icone';
import { Cartao, T } from './Ui';

const SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const NOME_DIA = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

export function PainelLateral({ ir }: { ir: (tela: string) => void }) {
  const { estado } = useLoja();
  const hoje = new Date();
  const segunda = somarDias(hoje, -diaDaSemana(hoje));
  const dias = Array.from({ length: 7 }, (_, k) => {
    const d = somarDias(segunda, k);
    return { k, ativo: diaAtivo(estado, iso(d)), hoje: iso(d) === iso(hoje), futuro: d > hoje && iso(d) !== iso(hoje) };
  });
  const semana = statsSemana(estado, hoje, 0);
  const streak = streakAtual(estado, hoje);

  const ultimaData = (id: string): string | null => [...estado.treinos].reverse().find((t) => t.rotina === id)?.data ?? null;
  const proximos = [...todasRotinas(estado)].sort((a, b) => (ultimaData(a.id) ?? '').localeCompare(ultimaData(b.id) ?? '')).slice(0, 3);

  return (
    <ScrollView style={st.painel} contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
      <Cartao>
        <T tam={16} peso="400" style={st.rotulo}>Sua semana</T>
        <View style={st.dias} accessibilityLabel={`Dias com registro nesta semana: ${dias.filter((d) => d.ativo).length} de 7`}>
          {dias.map((d) => (
            <View key={d.k} style={st.dia} accessibilityLabel={`${NOME_DIA[d.k]}${d.ativo ? ", com registro" : ""}`}>
              <View style={[st.bolinha, d.ativo ? st.bolinhaAtiva : null, d.hoje ? st.bolinhaHoje : null, d.futuro ? { opacity: 0.4 } : null]}>
                {d.ativo ? <Icone nome="ok" tamanho={13} cor="#ffffff" espessura={2.2} /> : null}
              </View>
              <T tam={11.5} cor={d.hoje ? cores.texto : cores.texto3} peso={d.hoje ? '500' : '300'}>{SEMANA[d.k]}</T>
            </View>
          ))}
        </View>
        <View style={st.numeros}>
          <View style={st.numero}><T tam={22} peso="500">{semana.treinos}</T><T tam={12} cor={cores.texto3}>treinos</T></View>
          <View style={st.numero}><T tam={22} peso="500">{fmt(semana.volume / 1000, 1)}</T><T tam={12} cor={cores.texto3}>toneladas</T></View>
          <View style={st.numero}><T tam={22} peso="500">{semana.refeicoes}</T><T tam={12} cor={cores.texto3}>refeições</T></View>
        </View>
      </Cartao>

      <Cartao>
        <View style={st.linha}>
          <View style={st.chama}><Icone nome="chama" tamanho={22} cor="#ffffff" /></View>
          <View style={{ flex: 1 }}>
            <T tam={22} peso="500">{streak} {streak === 1 ? 'dia' : 'dias'}</T>
            <T tam={13} cor={cores.texto2}>{streak > 0 ? 'de sequência. Uma falta por semana não quebra.' : 'Registre algo hoje para começar a sequência.'}</T>
          </View>
        </View>
      </Cartao>

      <Cartao>
        <T tam={16} peso="400" style={st.rotulo}>Próximos treinos</T>
        <View style={{ gap: 6 }}>
          {proximos.map((r, i) => {
            const data = ultimaData(r.id);
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={`${r.nome}, ${r.minutos} minutos. Abrir a aba Treino`}
                onPress={() => ir('treino')}
                style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [st.treino, hovered || pressed ? { backgroundColor: cores.cartao2 } : null]}
              >
                <T tam={13} peso="500" cor={i === 0 ? cores.destaque2 : cores.texto3} style={{ width: 18 }}>{i + 1}</T>
                <View style={{ flex: 1 }}>
                  <T tam={14.5} peso="400" linhas={1}>{r.nome}</T>
                  <T tam={12} cor={cores.texto3} linhas={1}>{r.minutos} min · {data ? `última vez ${haQuanto(data)}` : 'ainda não feito'}</T>
                </View>
                <Icone nome="setaDireita" tamanho={16} cor={cores.texto3} />
              </Pressable>
            );
          })}
        </View>
      </Cartao>
    </ScrollView>
  );
}

const st = estilos(() => StyleSheet.create({
  painel: { width: LARGURA_PAINEL, height: '100%', borderLeftWidth: 1, borderLeftColor: cores.linha },
  conteudo: { padding: 20, paddingTop: 28, gap: 14 },
  rotulo: { marginBottom: 14 },
  dias: { flexDirection: 'row', justifyContent: 'space-between' },
  dia: { alignItems: 'center', gap: 6 },
  bolinha: { width: 28, height: 28, borderRadius: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: cores.linha2 },
  bolinhaAtiva: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  bolinhaHoje: { borderColor: cores.destaque2 },
  numeros: { flexDirection: 'row', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: cores.linha },
  numero: { flex: 1, gap: 2 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chama: { width: 46, height: 46, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  treino: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 3 },
}));
