/* Coluna da direita, só no computador: os gráficos de evolução (força e volume) e de constância (12 semanas).
   Tudo vem do que já está no aparelho; nada novo é pedido ao servidor. Tocar em um cartão abre a aba completa. */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLoja } from '../estado/loja';
import { diaAtivo, epley, inicioDaSemana, streakAtual, volumeDe } from '../lib/calc';
import { dataCurta, fmt, iso, num, somarDias } from '../lib/datas';
import { LARGURA_PAINEL } from '../lib/largura';
import { cores, estilos } from '../tema';
import { GraficoBarras, GraficoLinha, MapaCalor } from './Grafico';
import type { Ponto } from './Grafico';
import { Icone } from './Icone';
import { Cartao, T } from './Ui';

const LARG = LARGURA_PAINEL - 40 - 36;   // coluna - margens - recheio do cartão

export function PainelLateral({ ir }: { ir: (tela: string) => void }) {
  const { estado } = useLoja();
  const hoje = new Date();
  const semanaIni = inicioDaSemana(hoje);

  /* evolução: o melhor 1RM por sessão do supino (ou do exercício mais feito) */
  const contagem = new Map<string, number>();
  for (const t of estado.treinos) for (const e of t.exercicios) contagem.set(e.id, (contagem.get(e.id) ?? 0) + 1);
  const exId = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'supino';
  const pontos: Ponto[] = estado.treinos
    .filter((t) => t.exercicios.some((e) => e.id === exId))
    .sort((a, b) => a.fim - b.fim)
    .map((t) => ({ x: t.fim, y: Math.max(...(t.exercicios.find((e) => e.id === exId)?.series ?? []).map((s) => epley(s.kg, s.reps))) }));
  const atual = pontos[pontos.length - 1]?.y ?? 0;

  /* volume das últimas 8 semanas, em toneladas */
  const volumes = Array.from({ length: 8 }, (_, k) => {
    const ini = somarDias(semanaIni, -7 * (7 - k));
    let v = 0;
    for (let i = 0; i < 7; i++) {
      const d = iso(somarDias(ini, i));
      for (const t of estado.treinos) if (t.data === d) v += t.exercicios.reduce((s, e) => s + volumeDe(e.series), 0);
    }
    return v / 1000;
  });
  const rotulos = volumes.map((_, k) => dataCurta(iso(somarDias(semanaIni, -7 * (7 - k)))).slice(0, 5));

  /* constância: 12 semanas, segunda a domingo */
  const mapa = Array.from({ length: 12 }, (_, c) => {
    const ini = somarDias(semanaIni, -7 * (11 - c));
    return Array.from({ length: 7 }, (_, l) => {
      const dia = somarDias(ini, l);
      const futuro = dia.getTime() > hoje.getTime();
      const ativo = !futuro && diaAtivo(estado, iso(dia));
      const folga = !futuro && !ativo && Array.from({ length: 7 }, (_, k) => k).every((k) => k === l || diaAtivo(estado, iso(somarDias(ini, k))));
      return { ativo, folga, futuro };
    });
  });
  const streak = streakAtual(estado, hoje);
  const treinosNoMapa = mapa.flat().filter((d) => d.ativo).length;

  return (
    <ScrollView style={st.painel} contentContainerStyle={st.conteudo} showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="Evolução. Abrir a aba Treino" onPress={() => ir('treino')}>
        <Cartao>
          <View style={st.topo}>
            <T tam={16} peso="400">Evolução</T>
            <Icone nome="setaDireita" tamanho={16} cor={cores.texto3} />
          </View>
          {pontos.length >= 2 ? (
            <>
              <View style={st.linhaNumero}>
                <T tam={30} peso="200">{num(Math.round(atual))}</T>
                <T tam={12.5} cor={cores.texto2}>kg de 1RM estimado</T>
              </View>
              <GraficoLinha pontos={pontos} largura={LARG} altura={130} formato={(v) => `${Math.round(v)} kg`} />
            </>
          ) : (
            <T tam={13} cor={cores.texto2} style={{ lineHeight: 19, marginTop: 8 }}>Registre duas sessões do mesmo exercício e a sua força aparece aqui.</T>
          )}
          <T tam={13} cor={cores.texto2} style={{ marginTop: 14, marginBottom: 6 }}>Volume por semana</T>
          <GraficoBarras valores={volumes} rotulos={rotulos} largura={LARG} altura={104} />
          <T tam={11.5} cor={cores.texto3} style={{ marginTop: 6 }}>Toneladas levantadas. A última barra é esta semana.</T>
        </Cartao>
      </Pressable>

      <Cartao>
        <View style={st.topo}>
          <T tam={16} peso="400">Constância</T>
          <View style={st.chama}>
            <Icone nome="chama" tamanho={14} cor={cores.alerta} />
            <T tam={13} peso="500" cor={cores.alerta}>{streak} {streak === 1 ? 'dia' : 'dias'}</T>
          </View>
        </View>
        <MapaCalor semanas={mapa} largura={LARG} />
        <T tam={11.5} cor={cores.texto3} style={{ marginTop: 10, lineHeight: 16 }}>
          {treinosNoMapa > 0 ? `${fmt(treinosNoMapa)} ${treinosNoMapa === 1 ? 'dia' : 'dias'} com registro em 12 semanas. Tracejado: folga que não quebra a sequência.` : 'Registre algo hoje para começar a sequência. Tracejado: folga que não quebra.'}
        </T>
      </Cartao>
    </ScrollView>
  );
}

const st = estilos(() => StyleSheet.create({
  /* largura fixa: sem flexGrow/flexShrink o ScrollView do react-native-web crescia e a coluna tomava metade da tela */
  painel: { width: LARGURA_PAINEL, flexGrow: 0, flexShrink: 0, height: '100%', borderLeftWidth: 1, borderLeftColor: cores.linha },
  conteudo: { padding: 20, paddingTop: 28, gap: 14 },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  linhaNumero: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  chama: { flexDirection: 'row', alignItems: 'center', gap: 5 },
}));
