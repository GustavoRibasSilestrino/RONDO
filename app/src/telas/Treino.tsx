/* Treino: escolher a rotina, registrar série a série, descansar, bater recordes e finalizar. */
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Folha, Tela, useAviso } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Botao, Cartao, Chip, Passo, T } from '../componentes/Ui';
import { ROTINAS, exercicioPorId } from '../dados';
import { useLoja } from '../estado/loja';
import { epley, estagnado, melhor1RM, proximaCarga, ultimaVez, volumeDe } from '../lib/calc';
import { dataCurta, fmt, iso, mmss, num } from '../lib/datas';
import { cores } from '../tema';

const DESCANSO_MS = 90_000;

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

  const iniciar = (rotinaId: string) =>
    commit((e) => {
      const rotina = ROTINAS.find((r) => r.id === rotinaId);
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

  return (
    <Tela>
      <T tam={15} peso="400" centro>Treino</T>
      <T tam={13} centro cor={cores.texto2} style={{ marginTop: 6, lineHeight: 21 }}>
        Escolha a rotina. O app abre com a sua última carga e sugere a próxima.
      </T>
      <View style={{ gap: 14, marginTop: 24 }}>
        {ROTINAS.map((r) => {
          const feito = [...estado.treinos].reverse().find((t) => t.rotina === r.id);
          return (
            <Cartao key={r.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T tam={22} peso="300" style={{ flex: 1 }}>{r.nome}</T>
                <Chip texto={`~ ${r.minutos} min`} />
              </View>
              <T tam={13} cor={cores.texto2} style={{ marginTop: 6, lineHeight: 20 }}>{r.exercicios.map((x) => x.nome).join(' · ')}</T>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <T tam={12} cor={cores.texto3}>{feito ? `Última vez: ${dataCurta(feito.data)}` : 'Ainda não feito'}</T>
                <Botao pequeno titulo="Começar" icone="treino" aoPressionar={() => iniciar(r.id)} />
              </View>
            </Cartao>
          );
        })}
      </View>
    </Tela>
  );
}

/* ---------- treino em andamento ---------- */
type Resumo = { nome: string; volume: number; series: number; minutos: number; recordes: string[] };

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

  const rotina = ROTINAS.find((r) => r.id === ta.rotina);
  const restante = ta.descansoAte ? Math.max(0, Math.ceil((ta.descansoAte - agora) / 1000)) : 0;
  const hoje = new Date();

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
      .map((ex) => ({ id: ex.id, nome: exercicioPorId(ex.id)?.nome ?? ex.id, series: ex.series.filter((s) => s.ok).map(({ kg, reps }) => ({ kg, reps })) }))
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <T tam={30} peso="200">{rotina?.nome}</T>
          <T tam={13} cor={cores.texto2} mono style={{ marginTop: 4 }}>{mmss((agora - ta.inicio) / 1000)}</T>
        </View>
        <Botao pequeno titulo="Finalizar" icone="ok" aoPressionar={finalizar} />
      </View>

      {restante > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: cores.texto, borderRadius: 99, paddingVertical: 10, paddingLeft: 18, paddingRight: 10, marginTop: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icone nome="relogio" tamanho={18} cor={cores.fundo} />
            <T tam={13} peso="500" cor={cores.fundo}>Descanso</T>
            <T tam={20} peso="500" mono cor={cores.fundo}>{mmss(restante)}</T>
          </View>
          <Pressable accessibilityRole="button" onPress={pularDescanso} style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99, backgroundColor: 'rgba(5,5,7,0.1)' }}>
            <T tam={12} peso="500" cor={cores.fundo}>Pular</T>
          </Pressable>
        </View>
      ) : null}

      {ta.exercicios.map((exAtual, i) => {
        const def = exercicioPorId(exAtual.id);
        if (!def) return null;
        const ult = ultimaVez(estado, def.id);
        const prox = proximaCarga(ult, def.faixa);
        const historico = melhor1RM(estado, def.id);
        const sessao = exAtual.series.filter((s) => s.ok).map((s) => epley(s.kg, s.reps));
        const recorde = sessao.length > 0 && historico > 0 && Math.max(...sessao) > historico + 0.01;
        const parado = estagnado(estado, def.id, hoje);
        return (
          <Cartao key={def.id} style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <T tam={20} peso="300">{def.nome}</T>
                <T tam={12} cor={cores.texto2} style={{ marginTop: 3 }}>
                  {ult ? `Última vez: ${num(Math.max(...ult.series.map((s) => s.kg)))} kg × ${ult.series[0].reps} · 1RM ${num(Math.round(historico))} kg` : `Faixa: ${def.faixa[0]} a ${def.faixa[1]} repetições`}
                </T>
              </View>
              <View style={{ gap: 6, alignItems: 'flex-end' }}>
                {recorde ? <Chip texto="RECORDE" tom="bom" /> : null}
                {parado ? <Chip texto="ESTAGNOU" tom="alerta" /> : null}
              </View>
            </View>

            {prox ? (
              <View style={{ marginTop: 12, backgroundColor: 'rgba(139,92,246,0.12)', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 }}>
                <T tam={12} peso="500" cor={cores.destaque2}>
                  {prox.sobe ? `Topo da faixa batido. Próxima carga: ${num(prox.kg)} kg` : `Mantenha ${num(prox.kg)} kg até bater ${def.faixa[1]} repetições em todas as séries`}
                </T>
              </View>
            ) : null}

            <View style={{ marginTop: 12, gap: 10 }}>
              {exAtual.series.map((s, j) => (
                <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <T tam={12} mono cor={cores.texto3} style={{ width: 16 }}>{j + 1}</T>
                  <Passo rotulo="carga" valor={s.kg} passo={def.passo} min={0} max={500} formato={num} unidade="kg" aoMudar={(v) => mudarSerie(i, j, 'kg', v)} />
                  <Passo rotulo="repetições" valor={s.reps} passo={1} min={1} max={50} unidade="reps" aoMudar={(v) => mudarSerie(i, j, 'reps', v)} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Série ${j + 1} ${s.ok ? 'feita' : 'pendente'}`}
                    onPress={() => alternar(i, j)}
                    style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: s.ok ? cores.bom : cores.fundo2, borderWidth: 1, borderColor: s.ok ? cores.bom : cores.linha }}
                  >
                    <Icone nome="ok" tamanho={18} cor={s.ok ? '#04140c' : cores.texto3} />
                  </Pressable>
                </View>
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={() => adicionarSerie(i)} style={{ alignSelf: 'flex-start', marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icone nome="mais" tamanho={14} cor={cores.texto2} />
              <T tam={13} cor={cores.texto2}>Adicionar série</T>
            </Pressable>
          </Cartao>
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
