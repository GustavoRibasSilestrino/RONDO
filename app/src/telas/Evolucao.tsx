/* Evolução: força por exercício, volume semanal, calendário de constância e peso (privado). */
import React, { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Folha, Tela, useAviso } from '../componentes/Estrutura';
import { GraficoBarras, GraficoLinha, MapaCalor, Ponto } from '../componentes/Grafico';
import { Icone } from '../componentes/Icone';
import { Botao, Cartao, Chip, Passo, T, Titulo } from '../componentes/Ui';
import { todosExercicios } from '../lib/rotinas';
import { useLoja } from '../estado/loja';
import { diaAtivo, epley, estagnado, inicioDaSemana, streakAtual, volumeDe } from '../lib/calc';
import { dataCurta, fmt, iso, num, somarDias } from '../lib/datas';
import { cores, larguraMax } from '../tema';

export function Evolucao() {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const { width } = useWindowDimensions();
  const hoje = new Date();
  const larg = Math.min(width, larguraMax) - 40 - 34;   // coluna - margens da tela - padding do cartão
  const [exId, setExId] = useState('supino');
  const [pesando, setPesando] = useState(false);
  const [novoPeso, setNovoPeso] = useState(estado.perfil.peso);

  /* força: o melhor 1RM de cada sessão do exercício */
  const sessoes = estado.treinos
    .filter((t) => t.exercicios.some((e) => e.id === exId))
    .sort((a, b) => a.fim - b.fim)
    .map((t) => ({ ts: t.fim, rm: Math.max(...(t.exercicios.find((e) => e.id === exId)?.series ?? []).map((s) => epley(s.kg, s.reps))) }));
  let recorde = 0;
  const pontos: Ponto[] = sessoes.map((s) => {
    const novo = s.rm > recorde + 0.01 && recorde > 0;
    recorde = Math.max(recorde, s.rm);
    return { x: s.ts, y: s.rm, destaque: novo };
  });
  const atual = sessoes[sessoes.length - 1]?.rm ?? 0;
  const oitoSemanas = sessoes.filter((s) => s.ts <= hoje.getTime() - 56 * 86400000).pop()?.rm ?? sessoes[0]?.rm ?? 0;
  const parado = estagnado(estado, exId, hoje);

  /* volume das últimas 8 semanas */
  const semanaIni = inicioDaSemana(hoje);
  const volumes = Array.from({ length: 8 }, (_, k) => {
    const ini = somarDias(semanaIni, -7 * (7 - k));
    let v = 0;
    for (let i = 0; i < 7; i++) {
      const d = iso(somarDias(ini, i));
      for (const t of estado.treinos) if (t.data === d) v += t.exercicios.reduce((s, e) => s + volumeDe(e.series), 0);
    }
    return v / 1000;
  });
  const rotulosSemana = volumes.map((_, k) => dataCurta(iso(somarDias(semanaIni, -7 * (7 - k)))).slice(0, 5));

  /* calendário: 12 semanas, segunda a domingo */
  const mapa = Array.from({ length: 12 }, (_, c) => {
    const ini = somarDias(semanaIni, -7 * (11 - c));
    return Array.from({ length: 7 }, (_, l) => {
      const dia = somarDias(ini, l);
      const d = iso(dia);
      const futuro = dia.getTime() > hoje.getTime();
      const ativo = !futuro && diaAtivo(estado, d);
      // falta isolada (sem outra na mesma semana) é folga e não quebra a sequência
      const folga = !futuro && !ativo && Array.from({ length: 7 }, (_, k) => k).every((k) => k === l || diaAtivo(estado, iso(somarDias(ini, k))));
      return { ativo, folga, futuro };
    });
  });

  const pesos = estado.pesos.map((p) => ({ x: new Date(p.data).getTime(), y: p.kg }));
  const ultimoPeso = estado.pesos[estado.pesos.length - 1];

  return (
    <Tela>
      <T tam={15} peso="400" centro>Evolução</T>
      <T tam={13} centro cor={cores.texto2} style={{ marginTop: 6 }}>Você, comparado com você.</T>

      <Titulo>Força</Titulo>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {todosExercicios(estado).map((e) => {
          const ativo = e.id === exId;
          return (
            <Pressable key={e.id} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => setExId(e.id)} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 4, backgroundColor: ativo ? cores.texto : cores.cartao2 }}>
              <T tam={13} peso={ativo ? '500' : '300'} cor={ativo ? cores.fundo : cores.texto2}>{e.nome}</T>
            </Pressable>
          );
        })}
      </ScrollView>
      <Cartao style={{ marginTop: 12 }}>
        {pontos.length >= 2 ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <T tam={40} peso="200">{num(Math.round(atual))}</T>
              <T tam={13} cor={cores.texto2}>kg de 1RM estimado</T>
              {atual - oitoSemanas > 0.5 ? <Chip texto={`+${num(Math.round(atual - oitoSemanas))} kg em 8 sem.`} tom="bom" style={{ marginLeft: 'auto' }} /> : null}
            </View>
            <View style={{ marginTop: 8 }}>
              <GraficoLinha pontos={pontos} largura={larg} formato={(v) => `${Math.round(v)} kg`} />
            </View>
            <T tam={11} cor={cores.texto3} style={{ marginTop: 6 }}>Pontos verdes: novos recordes pessoais.</T>
            {parado ? <Chip texto="ESTAGNOU HÁ 3 SEMANAS: TROQUE O ESTÍMULO" tom="alerta" style={{ marginTop: 10 }} /> : null}
          </>
        ) : (
          <T tam={14} cor={cores.texto2} style={{ lineHeight: 21 }}>Registre pelo menos duas sessões desse exercício para ver o gráfico.</T>
        )}
      </Cartao>

      <Titulo>Volume por semana</Titulo>
      <Cartao>
        <GraficoBarras valores={volumes} rotulos={rotulosSemana} largura={larg} />
        <T tam={11} cor={cores.texto3} style={{ marginTop: 6 }}>Toneladas levantadas (carga × repetições). A última barra é a semana atual.</T>
      </Cartao>

      <Titulo direita={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Icone nome="chama" tamanho={15} cor={cores.alerta} /><T tam={14} peso="500" cor={cores.alerta}>{streakAtual(estado, hoje)} dias</T></View>}>
        Constância
      </Titulo>
      <Cartao>
        <MapaCalor semanas={mapa} largura={larg} />
        <T tam={11} cor={cores.texto3} style={{ marginTop: 10 }}>12 semanas. Tracejado: folga que não quebra a sequência.</T>
      </Cartao>

      <Titulo direita={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Icone nome="cadeado" tamanho={13} cor={cores.texto3} /><T tam={12} cor={cores.texto3}>Privado</T></View>}>
        Peso
      </Titulo>
      <Cartao>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <T tam={40} peso="200">{ultimoPeso ? fmt(ultimoPeso.kg, 1) : '—'}</T>
          <T tam={13} cor={cores.texto2}>kg</T>
        </View>
        {pesos.length >= 2 ? <GraficoLinha pontos={pesos} largura={larg} altura={120} cor={cores.texto2} formato={(v) => `${fmt(v, 1)} kg`} /> : null}
        <Botao tipo="fantasma" pequeno titulo="Registrar peso" icone="mais" aoPressionar={() => { setNovoPeso(ultimoPeso?.kg ?? estado.perfil.peso); setPesando(true); }} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
      </Cartao>

      <Folha aberta={pesando} aoFechar={() => setPesando(false)} titulo="Registrar peso">
        <View style={{ gap: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Passo rotulo="peso" valor={novoPeso} passo={0.1} min={30} max={250} formato={(v) => fmt(v, 1)} unidade="kg" aoMudar={setNovoPeso} />
          </View>
          <T tam={12} cor={cores.texto3} centro>O peso fica só no seu aparelho e só aparece para você.</T>
          <Botao
            titulo="Salvar"
            icone="ok"
            aoPressionar={() => {
              commit((e) => { e.pesos.push({ data: iso(), kg: novoPeso }); e.perfil.peso = novoPeso; });
              setPesando(false);
              avisar('Peso registrado.');
            }}
          />
        </View>
      </Folha>
    </Tela>
  );
}
