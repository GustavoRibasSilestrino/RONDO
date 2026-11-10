/* Hoje: o painel do dia. O que você fez comparado com a sua semana passada, o treino, as calorias e a água. */
import React from 'react';
import { Pressable, View } from 'react-native';
import { Copos } from '../componentes/Copos';
import { Tela, useAviso } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Anel, Barra, Botao, Cartao, Chip, T } from '../componentes/Ui';
import { rotinaDe, todasRotinas } from '../lib/rotinas';
import { useLoja } from '../estado/loja';
import { comparar, diaDaComparacao, macrosMeta, metaKcal, situacaoDaSequencia, statsSemana, totaisDia } from '../lib/calc';
import { ChamaJoia } from '../componentes/ChamaJoia';
import { diaExtenso, fmt, iso, nomeDoDia, num } from '../lib/datas';
import { cores } from '../tema';

const delta = (v: number | null): string => (v === null ? '—' : `${v >= 0 ? '+' : ''}${Math.round(v)}%`);
const corDelta = (v: number | null): string => (v === null ? cores.texto3 : v >= 0 ? cores.bom : cores.alerta);

export function Hoje({ ir }: { ir: (id: string) => void }) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const agora = new Date();
  const d = iso(agora);
  const hora = agora.getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  const { dias: streak, situacao } = situacaoDaSequencia(estado, agora);
  const cur = statsSemana(estado, agora, 0);
  const prev = statsSemana(estado, agora, 1);
  const cmp = comparar(cur, prev);

  const meta = metaKcal(estado.perfil);
  const metas = macrosMeta(estado.perfil, meta);
  const tot = totaisDia(estado, d);

  const rotinas = todasRotinas(estado);
  const ultima = estado.treinos[estado.treinos.length - 1];
  const idxUltima = ultima ? rotinas.findIndex((r) => r.id === ultima.rotina) : -1;
  const sugerida = rotinas[(idxUltima + 1) % rotinas.length];
  const treinouHoje = estado.treinos.some((t) => t.data === d);
  const agua = estado.agua[d] ?? 0;
  const checkin = !!estado.checkins[d];

  return (
    <Tela>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: situacao === 'apagada' ? 'rgba(255,255,255,0.05)' : 'rgba(138,61,255,0.16)', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 99, marginBottom: 14 }}>
          <ChamaJoia tamanho={20} situacao={situacao} />
          <T tam={15} peso="500" cor={situacao === 'apagada' ? cores.texto3 : cores.destaque2}>{streak} {streak === 1 ? 'dia' : 'dias'}</T>
        </View>
        <T tam={14} cor={cores.texto2} centro>{saudacao}</T>
        <T tam={40} peso="200" linhas={1} centro>{estado.usuario?.nome ?? ''}</T>
        <T tam={13} cor={cores.texto3} centro style={{ marginTop: 2 }}>{diaExtenso(agora)}</T>
      </View>

      {/* Você vs. ontem */}
      <Cartao destaque style={{ marginTop: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T tam={12} mono cor={cores.destaque2}>VOCÊ VS. ONTEM</T>
          <T tam={11} cor={cores.texto2}>até {nomeDoDia(diaDaComparacao(estado, agora)).split('-')[0]} · vs. semana anterior</T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 6 }}>
          <T tam={64} peso="200" cor={cmp.geral === null || cmp.geral >= 0 ? cores.destaque2 : cores.alerta} style={{ lineHeight: 70 }}>
            {delta(cmp.geral)}
          </T>
          <T tam={13} cor={cores.texto2} style={{ paddingBottom: 12, flex: 1 }}>
            {cmp.geral === null ? 'Registre alguns dias para comparar.' : cmp.geral >= 0 ? 'você está à frente do seu ontem' : 'um passo atrás do seu ontem'}
          </T>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, rowGap: 14 }}>
          {[
            { nome: 'Treinos', valor: String(cur.treinos), d: cmp.treinos },
            { nome: 'Volume', valor: `${fmt(cur.volume / 1000, 1)} t`, d: cmp.volume },
            { nome: 'Refeições', valor: String(cur.refeicoes), d: cmp.refeicoes },
            { nome: 'Água/dia', valor: fmt(cur.agua, 1), d: cmp.agua },
          ].map((m) => (
            <View key={m.nome} style={{ width: '50%', paddingRight: 8 }}>
              <T tam={11} mono cor={cores.texto3}>{m.nome.toUpperCase()}</T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <T tam={24} peso="300">{m.valor}</T>
                <T tam={12} peso="500" cor={corDelta(m.d)}>{delta(m.d)}</T>
              </View>
            </View>
          ))}
        </View>
      </Cartao>

      {/* Treino de hoje */}
      <Cartao style={{ marginTop: 14 }}>
        {estado.treinoAtual ? (
          <>
            <T tam={24} peso="300">Treino em andamento</T>
            <T tam={13} cor={cores.texto2} style={{ marginTop: 2 }}>{estado.treinoAtual ? rotinaDe(estado, estado.treinoAtual.rotina)?.nome : undefined}</T>
            <Botao titulo="Continuar treino" icone="treino" aoPressionar={() => ir('treino')} style={{ marginTop: 14 }} />
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T tam={24} peso="300" style={{ flex: 1 }}>{sugerida.nome}</T>
              {treinouHoje ? <Chip texto="feito hoje" tom="bom" /> : <Chip texto={`~ ${sugerida.minutos} min`} />}
            </View>
            <T tam={13} cor={cores.texto2} style={{ marginTop: 2 }}>
              {sugerida.exercicios.length} exercícios · {sugerida.exercicios.reduce((t, e) => t + e.series, 0)} séries
            </T>
            <Botao titulo={treinouHoje ? 'Treinar de novo' : 'Começar treino'} icone="treino" aoPressionar={() => ir('treino')} style={{ marginTop: 14 }} />
          </>
        )}
      </Cartao>

      {/* Calorias */}
      <Pressable onPress={() => ir('dieta')} accessibilityRole="button" accessibilityLabel="Abrir a dieta">
        <Cartao style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <Anel progresso={meta ? tot.kcal / meta : 0} tamanho={112}>
              <T tam={22} peso="300">{fmt(Math.max(0, meta - tot.kcal))}</T>
              <T tam={10} cor={cores.texto2}>kcal restantes</T>
            </Anel>
            <View style={{ flex: 1, gap: 10 }}>
              {[
                { nome: 'Proteína', v: tot.p, m: metas.p, cor: cores.destaque },
                { nome: 'Carbo', v: tot.c, m: metas.c, cor: cores.alerta },
                { nome: 'Gordura', v: tot.g, m: metas.g, cor: cores.bom },
              ].map((x) => (
                <View key={x.nome} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <T tam={12} cor={cores.texto2}>{x.nome}</T>
                    <T tam={12} cor={cores.texto2}>{num(Math.round(x.v))} / {x.m} g</T>
                  </View>
                  <Barra valor={x.v} max={x.m} cor={x.cor} />
                </View>
              ))}
            </View>
          </View>
        </Cartao>
      </Pressable>

      {/* Água */}
      <Cartao style={{ marginTop: 14 }}>
        <T tam={24} peso="300" style={{ marginBottom: 12 }}>{agua} de 8 copos</T>
        <Copos cheios={agua} aoMudar={(n) => commit((e) => { e.agua[d] = n; })} />
      </Cartao>

      {/* Check-in */}
      <Cartao style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <T tam={14} cor={cores.texto2} style={{ lineHeight: 20 }}>
              {checkin ? 'Check-in feito hoje. A sua constância agradece.' : 'Marque que você apareceu hoje. Vale pontos no ranking.'}
            </T>
          </View>
          {checkin ? (
            <Chip texto="feito" tom="bom" />
          ) : (
            <Botao pequeno tipo="fantasma" titulo="Check-in" icone="camera" aoPressionar={() => { commit((e) => { e.checkins[d] = true; }); avisar('Check-in registrado. +10 pontos.'); }} />
          )}
        </View>
      </Cartao>
    </Tela>
  );
}
