/* Treino: escolher a rotina, registrar série a série, descansar, bater recordes e finalizar. */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CalendarioMes } from '../componentes/CalendarioMes';
import { CorpoMusculos } from '../componentes/CorpoMusculos';
import { EditorTreino, type Rascunho } from '../componentes/EditorTreino';
import { NovoTreino } from '../componentes/NovoTreino';
import { Folha, Tela, useAviso } from '../componentes/Estrutura';
import { GraficoLinha } from '../componentes/Grafico';
import { Icone } from '../componentes/Icone';
import { Botao, Chip, T } from '../componentes/Ui';
import type { Rotina } from '../dados';
import { useLoja } from '../estado/loja';
import { diaAtivo, epley, estagnado, inicioDaSemana, melhor1RM, proximaCarga, ultimaVez, volumeDe } from '../lib/calc';
import type { TreinoLido } from '../lib/importar';
import { inferirMusculos } from '../lib/musculos';
import { exercicioDe, musculosDe, rotinaDe, todasRotinas } from '../lib/rotinas';
import { diaDaSemana, fmt, haQuanto, iso, mmss, num, somarDias } from '../lib/datas';
import { cores, estilos, larguraMax } from '../tema';
import { TodosTreinos } from './TodosTreinos';

const DESCANSO_MS = 90_000;
const SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function Treino() {
  const { estado } = useLoja();
  const [resumo, setResumo] = useState<Resumo | null>(null);   // fica aqui: a sessão some quando o treino é finalizado
  return (
    <>
      {estado.treinoAtual ? <Sessao aoConcluir={setResumo} /> : <Lista />}
      <Folha aberta={!!resumo} aoFechar={() => setResumo(null)} titulo="Treino concluído">
        {resumo ? <ConteudoResumo r={resumo} aoFechar={() => setResumo(null)} /> : null}
      </Folha>
    </>
  );
}

/* ---------- escolher a rotina ---------- */
function Lista() {
  const { estado, commit } = useLoja();
  const { width } = useWindowDimensions();
  const [calendario, setCalendario] = useState(false);
  const avisar = useAviso();
  const [todos, setTodos] = useState(false);
  const [novo, setNovo] = useState(false);                          // a folha 'Adicionar treino'
  const [editor, setEditor] = useState<{ inicial: Rascunho | null } | null>(null);   // o editor aberto (treino novo, de arquivo ou existente)
  const rotinas = todasRotinas(estado);
  const [serie, setSerie] = useState<'constancia' | 'evolucao'>('constancia');

  const iniciar = (rotinaId: string) =>
    commit((e) => {
      const rotina = rotinaDe(e, rotinaId);
      if (!rotina) return;
      e.treinoAtual = {
        rotina: rotina.id,
        inicio: Date.now(),
        descansoAte: null,
        exercicios: rotina.exercicios.map((ex) => {
          const ult = ultimaVez(e, ex.id);
          const prox = proximaCarga(ult, ex.faixa);
          const kg = prox?.kg ?? ex.inicial;
          const reps = prox?.sobe || !ult ? ex.faixa[0] : ult.series[0].reps;
          return { id: ex.id, series: Array.from({ length: ex.series }, () => ({ kg, reps, ok: false })) };
        }),
      };
    });

  /* criar, editar e excluir os treinos próprios */
  const abrirCriar = () => { setNovo(false); setTodos(false); setEditor({ inicial: null }); };
  const abrirArquivo = (lido: TreinoLido, nomeDoArquivo: string) => {
    setNovo(false);
    setTodos(false);
    setEditor({ inicial: { id: '', nome: lido.nome ?? nomeDoArquivo, exercicios: lido.exercicios, musculos: inferirMusculos(lido.exercicios.map((x) => x.nome)) } });
  };
  const abrirEditar = (r: Rotina) => { setTodos(false); setEditor({ inicial: { id: r.id, nome: r.nome, exercicios: r.exercicios, musculos: r.musculos ?? [] } }); };
  const salvarTreino = (r: Rotina) => {
    commit((e) => {
      const i = e.rotinasProprias.findIndex((x) => x.id === r.id);
      if (i >= 0) e.rotinasProprias[i] = r; else e.rotinasProprias.push(r);
    });
    setEditor(null);
    avisar('Treino salvo.');
  };
  const excluirTreino = (id: string) => {
    commit((e) => { e.rotinasProprias = e.rotinasProprias.filter((x) => x.id !== id); });
    setEditor(null);
    avisar('Treino excluído.');
  };

  const ultimaData = (id: string): string | null => [...estado.treinos].reverse().find((t) => t.rotina === id)?.data ?? null;

  /* a rotina sugerida é a que está há mais tempo sem treinar (ou nunca foi feita) */
  const sugerida = [...rotinas].sort((a, b) => (ultimaData(a.id) ?? '').localeCompare(ultimaData(b.id) ?? ''))[0];

  /* a semana: segunda a domingo, com os dias em que houve treino */
  const hoje = new Date();
  const segunda = somarDias(hoje, -diaDaSemana(hoje));
  const dias = Array.from({ length: 7 }, (_, k) => { const d = somarDias(segunda, k); return { letra: SEMANA[k], treinou: estado.treinos.some((t) => t.data === iso(d)), hoje: iso(d) === iso(hoje) }; });
  const naSemana = dias.filter((d) => d.treinou).length;

  /* as últimas 8 semanas: dias ativos (constância) e toneladas levantadas (evolução) */
  const larg = Math.min(width, larguraMax) - 40 - 34;
  const semanaIni = inicioDaSemana(hoje);
  const semanas = Array.from({ length: 8 }, (_, k) => {
    const ini = somarDias(semanaIni, -7 * (7 - k));
    let ativos = 0, volume = 0;
    for (let i = 0; i < 7; i++) {
      const d = iso(somarDias(ini, i));
      if (diaAtivo(estado, d)) ativos++;
      for (const t of estado.treinos) if (t.data === d) volume += t.exercicios.reduce((a, e) => a + volumeDe(e.series), 0);
    }
    return { x: k, ativos, volume: volume / 1000 };
  });
  const pontos = semanas.map((w) => ({ x: w.x, y: serie === 'constancia' ? w.ativos : w.volume }));
  const atualSemana = semanas[7], anteriorSemana = semanas[6];
  const mediaAtivos = semanas.reduce((t, w) => t + w.ativos, 0) / 8;
  const dif = atualSemana.volume - anteriorSemana.volume;

  const totalSeries = (r: Rotina) => r.exercicios.reduce((t, x) => t + x.series, 0);

  return (
    <Tela>
      <View style={{ justifyContent: 'center' }}>
        <T tam={15} peso="400" centro>Treino</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Adicionar treino" onPress={() => setNovo(true)} hitSlop={8} style={st.botaoMais}>
          <Icone nome="mais" tamanho={20} cor="#ffffff" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir o calendário de constância" onPress={() => setCalendario(true)} hitSlop={8} style={st.botaoCalendario}>
          <Icone nome="calendario" tamanho={20} cor="#ffffff" />
        </Pressable>
      </View>

      {/* a semana */}
      <View style={st.semana}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T tam={14} peso="500">Esta semana</T>
          <T tam={13}>{naSemana} {naSemana === 1 ? 'treino' : 'treinos'}</T>
        </View>
        <View style={st.dias}>
          {dias.map((d, k) => (
            <View key={k} style={{ alignItems: 'center', gap: 6 }}>
              <View style={[st.dia, d.treinou && st.diaFeito, d.hoje && !d.treinou && st.diaHoje]}>
                {d.treinou ? <Icone nome="ok" tamanho={16} cor="#ffffff" espessura={2.4} /> : null}
              </View>
              <T tam={11.5} peso={d.hoje ? '500' : '300'} style={{ opacity: d.hoje ? 1 : 0.7 }}>{d.letra}</T>
            </View>
          ))}
        </View>
      </View>

      {/* gráfico de constância e evolução */}
      <View style={st.grafico}>
        <View style={st.alternar}>
          {([['constancia', 'Constância'], ['evolucao', 'Evolução']] as const).map(([id, rotulo]) => {
            const ativa = serie === id;
            return (
              <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: ativa }} onPress={() => setSerie(id)} style={[st.opcao, ativa && st.opcaoAtiva]}>
                <T tam={13} peso={ativa ? '500' : '300'}>{rotulo}</T>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
          <T tam={32} peso="200">{serie === 'constancia' ? atualSemana.ativos : fmt(atualSemana.volume, 1)}</T>
          <T tam={13}>{serie === 'constancia' ? (atualSemana.ativos === 1 ? 'dia ativo nesta semana' : 'dias ativos nesta semana') : 't levantadas nesta semana'}</T>
        </View>
        <View style={{ marginTop: 6 }}>
          <GraficoLinha pontos={pontos} largura={larg} altura={120} formato={(v) => (serie === 'constancia' ? `${Math.round(v)} ${Math.round(v) === 1 ? 'dia' : 'dias'}` : `${fmt(v, 1)} t`)} />
        </View>
        <T tam={11.5} style={{ marginTop: 4, opacity: 0.75 }}>
          {serie === 'constancia' ? `Últimas 8 semanas · média de ${fmt(mediaAtivos, 1)} dias por semana.` : `Últimas 8 semanas · ${dif >= 0 ? '+' : '−'}${fmt(Math.abs(dif), 1)} t em relação à semana passada.`}
        </T>
      </View>

      {/* o treino sugerido, em destaque */}
      <View style={st.hero}>
        <View style={st.selo}><T tam={10.5} peso="500" style={{ letterSpacing: 1 }}>SUGERIDO PARA HOJE</T></View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <T tam={28} peso="500" style={{ letterSpacing: -0.5 }}>{sugerida.nome}</T>
            <View style={st.metas}>
              <View style={st.meta}><Icone nome="relogio" tamanho={15} cor="#ffffff" /><T tam={12.5}>{sugerida.minutos} min</T></View>
              <View style={st.meta}><Icone nome="treino" tamanho={15} cor="#ffffff" /><T tam={12.5}>{sugerida.exercicios.length} exercícios</T></View>
              <View style={st.meta}><Icone nome="ok" tamanho={15} cor="#ffffff" /><T tam={12.5}>{totalSeries(sugerida)} séries</T></View>
            </View>
          </View>
          <CorpoMusculos grupos={musculosDe(sugerida)} largura={64} />
        </View>
        <View style={{ marginTop: 16, gap: 10 }}>
          {sugerida.exercicios.map((x, k) => (
            <View key={x.id} style={st.linhaEx}>
              <View style={st.numero}><T tam={12} peso="500">{k + 1}</T></View>
              <T tam={14.5} style={{ flex: 1 }} linhas={1}>{x.nome}</T>
              <T tam={13} style={{ opacity: 0.85 }}>{x.series} × {x.faixa[0] === x.faixa[1] ? x.faixa[0] : `${x.faixa[0]}-${x.faixa[1]}`}{x.inicial > 0 ? <T tam={13} peso="500" cor={cores.destaque2}>{`  ·  ${num(x.inicial)} kg`}</T> : null}</T>
            </View>
          ))}
        </View>
        <T tam={12.5} style={{ marginTop: 14, opacity: 0.75 }}>{ultimaData(sugerida.id) ? `Última vez: ${haQuanto(ultimaData(sugerida.id)!)}` : 'Ainda não feito'}. O app abre com a sua última carga e sugere a próxima.</T>
        <Botao titulo="Começar treino" icone="treino" aoPressionar={() => iniciar(sugerida.id)} style={{ marginTop: 16 }} />
        <Botao tipo="fantasma" icone="menu" titulo="Ver todos os treinos" aoPressionar={() => setTodos(true)} style={{ marginTop: 10 }} />
      </View>

      <TodosTreinos aberto={todos} rotinas={rotinas} aoFechar={() => setTodos(false)} aoIniciar={iniciar} aoAdicionar={() => setNovo(true)} aoEditar={abrirEditar} ultimaData={ultimaData} />
      <NovoTreino aberta={novo} aoFechar={() => setNovo(false)} aoCriar={abrirCriar} aoArquivo={abrirArquivo} />
      <EditorTreino aberto={!!editor} inicial={editor?.inicial ?? null} aoFechar={() => setEditor(null)} aoSalvar={salvarTreino} aoExcluir={excluirTreino} />
      <Folha aberta={calendario} aoFechar={() => setCalendario(false)} titulo="Constância">
        <CalendarioMes />
      </Folha>
    </Tela>
  );
}

/* ---------- treino em andamento ---------- */
type Resumo = { nome: string; volume: number; series: number; minutos: number; recordes: string[] };

/* um contador com − e + nas pontas e o valor grande no meio */
function Contador({ rotulo, valor, passo, min, max, formato, unidade, aoMudar, feita }: { rotulo: string; valor: number; passo: number; min: number; max: number; formato?: (n: number) => string; unidade: string; aoMudar: (v: number) => void; feita: boolean }) {
  const mudar = (d: number) => aoMudar(Math.min(max, Math.max(min, Math.round((valor + d) * 100) / 100)));
  return (
    <View style={[st.contador, feita && st.contadorFeito]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Diminuir ${rotulo}`} onPress={() => mudar(-passo)} hitSlop={4} style={st.botaoContador}><Icone nome="menos" tamanho={16} cor="#ffffff" /></Pressable>
      <View style={{ alignItems: 'center', flex: 1 }}>
        <T tam={17} peso="500">{formato ? formato(valor) : String(valor)}</T>
        <T tam={10.5} style={{ opacity: 0.7, marginTop: -1 }}>{unidade}</T>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Aumentar ${rotulo}`} onPress={() => mudar(passo)} hitSlop={4} style={st.botaoContador}><Icone nome="mais" tamanho={16} cor="#ffffff" /></Pressable>
    </View>
  );
}

function Sessao({ aoConcluir }: { aoConcluir: (r: Resumo) => void }) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const ta = estado.treinoAtual;
  const [agora, setAgora] = useState(Date.now());
  const [descartar, setDescartar] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  if (!ta) return null;   // o pai troca para a lista; o resumo é mostrado por ele

  const rotina = rotinaDe(estado, ta.rotina);
  const restante = ta.descansoAte ? Math.max(0, Math.ceil((ta.descansoAte - agora) / 1000)) : 0;
  const hoje = new Date();
  const totalSeries = ta.exercicios.reduce((t, ex) => t + ex.series.length, 0);
  const feitas = ta.exercicios.reduce((t, ex) => t + ex.series.filter((s) => s.ok).length, 0);
  const volumeAgora = ta.exercicios.reduce((t, ex) => t + ex.series.filter((s) => s.ok).reduce((a, s) => a + s.kg * s.reps, 0), 0);

  const mudarSerie = (i: number, j: number, campo: 'kg' | 'reps', valor: number) =>
    commit((e) => { const s = e.treinoAtual?.exercicios[i]?.series[j]; if (s) s[campo] = valor; });

  const alternar = (i: number, j: number) => {
    commit((e) => {
      const t = e.treinoAtual;
      const s = t?.exercicios[i]?.series[j];
      if (!t || !s) return;
      s.ok = !s.ok;
      if (s.ok) t.descansoAte = Date.now() + DESCANSO_MS;   // marcou a série: começa o descanso
    });
    setAgora(Date.now());   // o relógio da tela só anda a cada meio segundo: acerta já, para o descanso começar em 01:30
  };

  const adicionarSerie = (i: number) =>
    commit((e) => {
      const lista = e.treinoAtual?.exercicios[i]?.series;
      if (!lista) return;
      const ultima = lista[lista.length - 1];
      lista.push({ kg: ultima?.kg ?? 20, reps: ultima?.reps ?? 8, ok: false });
    });

  const pularDescanso = () => commit((e) => { if (e.treinoAtual) e.treinoAtual.descansoAte = null; });

  const finalizar = () => {
    const feitos = ta.exercicios
      .map((ex) => ({ id: ex.id, nome: exercicioDe(estado, ex.id)?.nome ?? ex.id, series: ex.series.filter((s) => s.ok).map(({ kg, reps }) => ({ kg, reps })) }))
      .filter((ex) => ex.series.length > 0);
    if (feitos.length === 0) { avisar('Marque pelo menos uma série como feita.'); return; }

    const recordes = feitos.flatMap((ex) => {
      const antes = melhor1RM(estado, ex.id);
      const agoraRm = Math.max(...ex.series.map((s) => epley(s.kg, s.reps)));
      return antes > 0 && agoraRm > antes + 0.01 ? [`${ex.nome} · 1RM ${num(Math.round(agoraRm))} kg`] : [];
    });
    const volume = feitos.reduce((t, ex) => t + volumeDe(ex.series), 0);
    const nome = rotina?.nome ?? 'Treino';
    const fim = Date.now();

    commit((e) => {
      const hojeIso = iso();
      e.treinos.push({ data: hojeIso, rotina: ta.rotina, nome, inicio: ta.inicio, fim, exercicios: feitos });
      e.treinoAtual = null;
      e.checkins[hojeIso] = true;
      e.posts.unshift({ id: `u${fim}`, autor: 'Você', texto: `Concluí ${nome} · volume de ${fmt(volume / 1000, 1)} t`, destaque: recordes[0] ? `Recorde: ${recordes[0]}` : undefined, quando: fim });
    });
    aoConcluir({ nome, volume, series: feitos.reduce((t, ex) => t + ex.series.length, 0), minutos: Math.max(1, Math.round((fim - ta.inicio) / 60000)), recordes });
  };

  const descartarTreino = () => {
    if (!descartar) { setDescartar(true); return; }
    commit((e) => { e.treinoAtual = null; });
    avisar('Treino descartado.');
  };

  return (
    <Tela>
      {/* topo: nome da rotina, tempo e finalizar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T tam={22} peso="500" linhas={1} style={{ letterSpacing: -0.3 }}>{rotina?.nome}</T>
          <View style={st.tempo}><Icone nome="relogio" tamanho={14} cor="#ffffff" /><T tam={13} peso="500">{mmss((agora - ta.inicio) / 1000)}</T></View>
        </View>
        <CorpoMusculos grupos={rotina ? musculosDe(rotina) : []} largura={40} />
        <Botao pequeno titulo="Finalizar" icone="ok" aoPressionar={finalizar} />
      </View>

      {/* progresso da sessão */}
      <View style={st.progresso}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T tam={13} peso="500">{feitas} de {totalSeries} séries</T>
          <T tam={13}>{fmt(volumeAgora / 1000, 2)} t de volume</T>
        </View>
        <View style={st.trilho}><View style={[st.enche, { width: `${totalSeries ? (feitas / totalSeries) * 100 : 0}%` }]} /></View>
      </View>

      {/* descanso: aparece depois de marcar uma série */}
      {restante > 0 ? (
        <View style={st.descanso}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Icone nome="relogio" tamanho={20} cor="#ffffff" />
            <View>
              <T tam={11.5} peso="500" style={{ letterSpacing: 0.8 }}>DESCANSO</T>
              <T tam={24} peso="500">{mmss(restante)}</T>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Pular o descanso" onPress={pularDescanso} style={st.pular}>
            <T tam={13} peso="500">Pular</T>
          </Pressable>
          <View style={st.descansoTrilho}><View style={[st.descansoEnche, { width: `${(restante * 1000 / DESCANSO_MS) * 100}%` }]} /></View>
        </View>
      ) : null}

      {ta.exercicios.map((exAtual, i) => {
        const def = exercicioDe(estado, exAtual.id);
        if (!def) return null;
        const ult = ultimaVez(estado, def.id);
        const prox = proximaCarga(ult, def.faixa);
        const historico = melhor1RM(estado, def.id);
        const sessao = exAtual.series.filter((s) => s.ok).map((s) => epley(s.kg, s.reps));
        const recorde = sessao.length > 0 && historico > 0 && Math.max(...sessao) > historico + 0.01;
        const parado = estagnado(estado, def.id, hoje);
        const feitasEx = exAtual.series.filter((s) => s.ok).length;
        const completo = feitasEx === exAtual.series.length;
        return (
          <View key={def.id} style={[st.exercicio, completo && st.exercicioFeito]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[st.indice, completo && { backgroundColor: cores.bom }]}>
                {completo ? <Icone nome="ok" tamanho={16} cor="#04140c" espessura={2.6} /> : <T tam={13} peso="500">{i + 1}</T>}
              </View>
              <View style={{ flex: 1 }}>
                <T tam={18} peso="500" linhas={1} style={{ letterSpacing: -0.2 }}>{def.nome}</T>
                <T tam={12} style={{ marginTop: 2, opacity: 0.8 }} linhas={1}>
                  {ult ? `Última vez: ${num(Math.max(...ult.series.map((s) => s.kg)))} kg × ${ult.series[0].reps} · 1RM ${num(Math.round(historico))} kg` : `Faixa: ${def.faixa[0]} a ${def.faixa[1]} repetições`}
                </T>
              </View>
              <T tam={12.5} peso="500" style={{ opacity: 0.8 }}>{feitasEx}/{exAtual.series.length}</T>
            </View>

            {recorde || parado ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {recorde ? <Chip texto="RECORDE" tom="bom" /> : null}
                {parado ? <Chip texto="ESTAGNOU" tom="alerta" /> : null}
              </View>
            ) : null}

            {prox ? (
              <View style={st.dica}>
                <Icone nome="evolucao" tamanho={16} cor="#ffffff" />
                <T tam={12.5} style={{ flex: 1, lineHeight: 17 }}>
                  {prox.sobe ? `Topo da faixa batido. Próxima carga: ${num(prox.kg)} kg` : `Mantenha ${num(prox.kg)} kg até bater ${def.faixa[1]} repetições em todas as séries`}
                </T>
              </View>
            ) : null}

            {/* cabeçalho da tabela de séries */}
            <View style={st.cabecalho}>
              <T tam={10.5} peso="500" style={{ width: 30, textAlign: 'center', opacity: 0.6 }}>SÉRIE</T>
              <T tam={10.5} peso="500" style={{ flex: 1, textAlign: 'center', opacity: 0.6 }}>CARGA</T>
              <T tam={10.5} peso="500" style={{ flex: 1, textAlign: 'center', opacity: 0.6 }}>REPETIÇÕES</T>
              <View style={{ width: 44 }} />
            </View>

            <View style={{ gap: 8 }}>
              {exAtual.series.map((s, j) => (
                <View key={j} style={[st.serie, s.ok && st.serieFeita]}>
                  <View style={st.numeroSerie}><T tam={13} peso="500" style={{ opacity: 0.8 }}>{j + 1}</T></View>
                  <Contador rotulo="carga" valor={s.kg} passo={def.passo} min={0} max={500} formato={num} unidade="kg" aoMudar={(v) => mudarSerie(i, j, 'kg', v)} feita={s.ok} />
                  <Contador rotulo="repetições" valor={s.reps} passo={1} min={1} max={50} unidade="reps" aoMudar={(v) => mudarSerie(i, j, 'reps', v)} feita={s.ok} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Série ${j + 1} ${s.ok ? 'feita' : 'pendente'}`}
                    onPress={() => alternar(i, j)}
                    style={[st.marcar, s.ok && { backgroundColor: cores.bom, borderColor: cores.bom }]}
                  >
                    <Icone nome="ok" tamanho={20} cor={s.ok ? '#04140c' : '#ffffff'} espessura={2.2} />
                  </Pressable>
                </View>
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={() => adicionarSerie(i)} style={st.adicionar}>
              <Icone nome="mais" tamanho={15} cor="#ffffff" />
              <T tam={13} peso="500">Adicionar série</T>
            </Pressable>
          </View>
        );
      })}

      <View style={{ height: 26 }} />
      <Botao tipo="discreto" titulo={descartar ? 'Toque de novo para descartar' : 'Descartar treino'} aoPressionar={descartarTreino} />
    </Tela>
  );
}

function ConteudoResumo({ r, aoFechar }: { r: Resumo; aoFechar: () => void }) {
  return (
    <View style={{ gap: 14 }}>
      <T tam={14} cor={cores.texto2}>{r.nome}</T>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[
          { nome: 'VOLUME', valor: `${fmt(r.volume / 1000, 1)} t` },
          { nome: 'SÉRIES', valor: String(r.series) },
          { nome: 'TEMPO', valor: `${r.minutos} min` },
        ].map((m) => (
          <View key={m.nome} style={{ flex: 1, backgroundColor: cores.fundo2, borderRadius: 8, padding: 12 }}>
            <T tam={10} mono cor={cores.texto3}>{m.nome}</T>
            <T tam={22} peso="300">{m.valor}</T>
          </View>
        ))}
      </View>
      {r.recordes.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Chip texto="NOVOS RECORDES" tom="bom" />
          {r.recordes.map((x) => <T key={x} tam={15}>{x}</T>)}
        </View>
      ) : null}
      <T tam={12} cor={cores.texto3}>Check-in de hoje registrado e treino publicado no seu feed.</T>
      <Botao titulo="Fechar" aoPressionar={aoFechar} />
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  /* lista */
  semana: { marginTop: 18, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.cartao },
  dias: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  dia: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: cores.linha2 },
  diaFeito: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  diaHoje: { borderColor: cores.destaque },
  hero: { marginTop: 14, padding: 20, borderRadius: 28, borderWidth: 1.5, borderColor: cores.destaqueForte, backgroundColor: cores.cartao },
  selo: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: cores.destaqueForte },
  metas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: cores.cartao2 },
  linhaEx: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numero: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
  botaoMais: { position: 'absolute', left: 0, top: -9, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  botaoCalendario: { position: 'absolute', right: 0, top: -9, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2, borderWidth: 1, borderColor: cores.linha2 },
  grafico: { marginTop: 14, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.cartao },
  alternar: { flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: cores.cartao2 },
  opcao: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: 999 },
  opcaoAtiva: { backgroundColor: cores.destaqueForte },

  /* sessão */
  tempo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  progresso: { marginTop: 16, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.cartao },
  trilho: { height: 8, borderRadius: 4, backgroundColor: cores.cartao2, marginTop: 10, overflow: 'hidden' },
  enche: { height: 8, borderRadius: 4, backgroundColor: cores.destaqueForte },
  descanso: { marginTop: 14, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingLeft: 16, paddingRight: 12, borderRadius: 20, backgroundColor: cores.destaqueForte, overflow: 'hidden' },
  pular: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)' },
  descansoTrilho: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.18)' },
  descansoEnche: { height: 4, backgroundColor: '#ffffff' },
  exercicio: { marginTop: 16, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  exercicioFeito: { borderColor: `${cores.bom}66` },
  indice: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
  dica: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: cores.cartao2 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 8 },
  serie: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, borderRadius: 18, borderWidth: 1, borderColor: 'transparent' },
  serieFeita: { backgroundColor: `${cores.bom}1a`, borderColor: `${cores.bom}55` },
  numeroSerie: { width: 30, alignItems: 'center' },
  contador: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 52, borderRadius: 14, backgroundColor: cores.cartao2, paddingHorizontal: 4 },
  contadorFeito: { opacity: 0.85 },
  botaoContador: { width: 32, height: 40, alignItems: 'center', justifyContent: 'center' },
  marcar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: cores.linha2, backgroundColor: cores.cartao },
  adicionar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, minHeight: 46, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: cores.linha2 },
}));
