/* Dieta: meta de calorias e macros, refeições do dia e a água. */
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Copos } from '../componentes/Copos';
import { Folha, Tela } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Anel, Barra, Botao, Campo, Cartao, Segmentos, T } from '../componentes/Ui';
import { ALIMENTOS, Alimento, REFEICOES } from '../dados';
import { useLoja } from '../estado/loja';
import { macrosDe, macrosMeta, metaKcal, totaisDia } from '../lib/calc';
import { dataCurta, doIso, fmt, iso, num, somarDias } from '../lib/datas';
import { cores } from '../tema';
import type { TipoRefeicao } from '../tipos';

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Dieta() {
  const { estado, commit } = useLoja();
  const hoje = iso();
  const [dia, setDia] = useState(hoje);
  const [adicionando, setAdicionando] = useState<TipoRefeicao | null>(null);

  const meta = metaKcal(estado.perfil);
  const metas = macrosMeta(estado.perfil, meta);
  const tot = totaisDia(estado, dia);
  const itens = estado.refeicoes[dia] ?? [];
  const agua = estado.agua[dia] ?? 0;
  const rotuloDia = dia === hoje ? 'Hoje' : dia === iso(somarDias(new Date(), -1)) ? 'Ontem' : dataCurta(dia);
  const restante = meta - tot.kcal;

  const mudarDia = (n: number) => {
    const novo = iso(somarDias(doIso(dia), n));
    if (novo <= hoje) setDia(novo);
  };

  return (
    <Tela>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T tam={36} peso="200">Dieta</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cores.cartao2, borderRadius: 99 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Dia anterior" onPress={() => mudarDia(-1)} style={{ padding: 10 }}>
            <Icone nome="seta" tamanho={16} cor={cores.texto2} />
          </Pressable>
          <T tam={13} peso="400" style={{ minWidth: 54, textAlign: 'center' }}>{rotuloDia}</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Próximo dia" disabled={dia === hoje} onPress={() => mudarDia(1)} style={{ padding: 10, opacity: dia === hoje ? 0.3 : 1 }}>
            <View style={{ transform: [{ rotate: '180deg' }] }}><Icone nome="seta" tamanho={16} cor={cores.texto2} /></View>
          </Pressable>
        </View>
      </View>

      <Cartao style={{ marginTop: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <Anel progresso={meta ? tot.kcal / meta : 0} tamanho={124} cor={restante < 0 ? cores.alerta : cores.destaque}>
            <T tam={26} peso="300">{fmt(Math.abs(restante))}</T>
            <T tam={10} cor={cores.texto2}>{restante < 0 ? 'kcal acima' : 'kcal restantes'}</T>
          </Anel>
          <View style={{ flex: 1, gap: 12 }}>
            <T tam={12} cor={cores.texto3} mono>META {fmt(meta)} KCAL</T>
            {[
              { nome: 'Proteína', v: tot.p, m: metas.p, cor: cores.destaque },
              { nome: 'Carboidrato', v: tot.c, m: metas.c, cor: cores.alerta },
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

      {REFEICOES.map((r) => {
        const lista = itens.filter((x) => x.refeicao === r.id);
        const kcal = lista.reduce((t, x) => t + x.kcal, 0);
        return (
          <Cartao key={r.id} style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T tam={18} peso="300">{r.nome}</T>
              <T tam={13} cor={cores.texto2}>{kcal > 0 ? `${fmt(kcal)} kcal` : ''}</T>
            </View>
            {lista.map((x) => (
              <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: cores.linha }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <T tam={14} linhas={1}>{x.alimento}</T>
                  <T tam={12} cor={cores.texto3}>{x.gramas} g · P {num(x.p)} · C {num(x.c)} · G {num(x.g)}</T>
                </View>
                <T tam={13} cor={cores.texto2} style={{ marginRight: 10 }}>{x.kcal}</T>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${x.alimento}`}
                  onPress={() => commit((e) => { e.refeicoes[dia] = (e.refeicoes[dia] ?? []).filter((y) => y.id !== x.id); })}
                  style={{ padding: 6 }}
                >
                  <Icone nome="lixo" tamanho={16} cor={cores.texto3} />
                </Pressable>
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={() => setAdicionando(r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' }}>
              <Icone nome="mais" tamanho={14} cor={cores.destaque2} />
              <T tam={13} peso="500" cor={cores.destaque2}>Adicionar alimento</T>
            </Pressable>
          </Cartao>
        );
      })}

      <Cartao style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <T tam={18} peso="300">Água</T>
          <T tam={13} cor={cores.texto2}>{agua} de 8 copos</T>
        </View>
        <Copos cheios={agua} aoMudar={(n) => commit((e) => { e.agua[dia] = n; })} />
      </Cartao>

      <T tam={11} cor={cores.texto3} style={{ marginTop: 18, lineHeight: 17 }}>
        Valores aproximados, no estilo da Tabela TACO. Meta calculada por Mifflin-St Jeor. O Yesteryou organiza e acompanha, mas não substitui avaliação profissional.
      </T>

      <AdicionarAlimento
        refeicaoInicial={adicionando}
        aoFechar={() => setAdicionando(null)}
        aoAdicionar={(refeicao, alimento, gramas) => {
          const m = macrosDe(alimento, gramas);
          commit((e) => {
            (e.refeicoes[dia] ??= []).push({ id: `${Date.now()}-${alimento.id}`, refeicao, alimento: alimento.nome, gramas, ...m });
          });
          setAdicionando(null);
        }}
      />
    </Tela>
  );
}

/* ---------- painel: buscar e escolher o alimento ---------- */
function AdicionarAlimento({ refeicaoInicial, aoFechar, aoAdicionar }: { refeicaoInicial: TipoRefeicao | null; aoFechar: () => void; aoAdicionar: (r: TipoRefeicao, a: Alimento, gramas: number) => void }) {
  const [busca, setBusca] = useState('');
  const [escolhido, setEscolhido] = useState<Alimento | null>(null);
  const [gramas, setGramas] = useState(100);
  const [refeicao, setRefeicao] = useState<TipoRefeicao>('almoco');

  const resultados = useMemo(() => {
    const q = semAcento(busca.trim());
    return q ? ALIMENTOS.filter((a) => semAcento(a.nome).includes(q)) : ALIMENTOS;
  }, [busca]);

  // ao abrir, a refeição escolhida na lista vira o padrão e o painel recomeça do zero
  React.useEffect(() => {
    if (refeicaoInicial) { setRefeicao(refeicaoInicial); setEscolhido(null); setBusca(''); setGramas(100); }
  }, [refeicaoInicial]);

  const prev = escolhido ? macrosDe(escolhido, gramas) : null;

  return (
    <Folha aberta={!!refeicaoInicial} aoFechar={aoFechar} titulo={escolhido ? escolhido.nome : 'Adicionar alimento'}>
      {!escolhido ? (
        <View style={{ gap: 12 }}>
          <Campo rotulo="Buscar" value={busca} onChangeText={setBusca} placeholder="Arroz, frango, banana..." autoCorrect={false} />
          {resultados.length === 0 ? <T tam={14} cor={cores.texto2}>Nenhum alimento encontrado.</T> : null}
          {resultados.map((a) => (
            <Pressable key={a.id} accessibilityRole="button" onPress={() => setEscolhido(a)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: cores.linha }}>
              <T tam={15} style={{ flex: 1 }}>{a.nome}</T>
              <T tam={12} cor={cores.texto3} mono>{a.kcal} kcal/100 g</T>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T tam={13} cor={cores.texto2}>Quantidade</T>
            <Passo10 valor={gramas} aoMudar={setGramas} />
          </View>
          {prev ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { nome: 'KCAL', v: String(prev.kcal) },
                { nome: 'PROT', v: `${num(prev.p)} g` },
                { nome: 'CARBO', v: `${num(prev.c)} g` },
                { nome: 'GORD', v: `${num(prev.g)} g` },
              ].map((m) => (
                <View key={m.nome} style={{ flex: 1, backgroundColor: cores.fundo2, borderRadius: 8, padding: 10 }}>
                  <T tam={10} mono cor={cores.texto3}>{m.nome}</T>
                  <T tam={17} peso="300">{m.v}</T>
                </View>
              ))}
            </View>
          ) : null}
          <Segmentos opcoes={REFEICOES.map((r) => ({ valor: r.id, nome: r.nome.split(' ')[0] }))} valor={refeicao} aoMudar={setRefeicao} />
          <Botao titulo="Adicionar" icone="mais" aoPressionar={() => aoAdicionar(refeicao, escolhido, gramas)} />
          <Botao tipo="discreto" titulo="Escolher outro alimento" aoPressionar={() => setEscolhido(null)} />
        </View>
      )}
    </Folha>
  );
}

/* passo de 10 em 10 gramas */
function Passo10({ valor, aoMudar }: { valor: number; aoMudar: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo2, borderRadius: 8, borderWidth: 1, borderColor: cores.linha }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Menos gramas" onPress={() => aoMudar(Math.max(10, valor - 10))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icone nome="menos" tamanho={16} cor={cores.texto2} />
      </Pressable>
      <View style={{ minWidth: 70, alignItems: 'center' }}>
        <T tam={18} peso="400">{valor} g</T>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Mais gramas" onPress={() => aoMudar(Math.min(2000, valor + 10))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icone nome="mais" tamanho={16} cor={cores.texto2} />
      </Pressable>
    </View>
  );
}
