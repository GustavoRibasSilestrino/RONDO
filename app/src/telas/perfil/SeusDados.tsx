/* Seus dados: a meta diária em destaque e, abaixo, sexo, medidas, nível de atividade e objetivo em cartões grandes, fáceis de tocar. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icone } from '../../componentes/Icone';
import { T } from '../../componentes/Ui';
import { NIVEIS_ATIVIDADE, OBJETIVOS } from '../../dados';
import { useLoja } from '../../estado/loja';
import { macrosMeta, metaKcal } from '../../lib/calc';
import { fmt } from '../../lib/datas';
import { cores, estilos } from '../../tema';
import type { Sexo } from '../../tipos';

function Opcao({ rotulo, sub, ativo, aoPressionar, largura }: { rotulo: string; sub?: string; ativo: boolean; aoPressionar: () => void; largura?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      onPress={aoPressionar}
      style={[st.opcao, largura ? { width: largura as `${number}%` } : { flex: 1 }, ativo && st.opcaoAtiva]}
    >
      <T tam={14.5} peso={ativo ? '500' : '400'} centro>{rotulo}</T>
      {sub ? <T tam={11.5} centro style={{ marginTop: 2, opacity: 0.8 }}>{sub}</T> : null}
      {ativo ? <View style={st.check}><Icone nome="ok" tamanho={12} cor="#ffffff" espessura={2.6} /></View> : null}
    </Pressable>
  );
}

function Medida({ nome, valor, unidade, passo, min, max, casas, aoMudar }: { nome: string; valor: number; unidade: string; passo: number; min: number; max: number; casas: number; aoMudar: (v: number) => void }) {
  const mudar = (d: number) => aoMudar(Math.min(max, Math.max(min, Math.round((valor + d) * 100) / 100)));
  return (
    <View style={st.medida}>
      <T tam={12} peso="500" style={{ letterSpacing: 0.8 }}>{nome}</T>
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <T tam={28} peso="500">{fmt(valor, casas)}</T>
        <T tam={12}>{unidade}</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Diminuir ${nome.toLowerCase()}`} onPress={() => mudar(-passo)} style={st.passo}><Icone nome="menos" tamanho={18} cor="#ffffff" /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Aumentar ${nome.toLowerCase()}`} onPress={() => mudar(passo)} style={st.passo}><Icone nome="mais" tamanho={18} cor="#ffffff" /></Pressable>
      </View>
    </View>
  );
}

export function SeusDados() {
  const { estado, commit } = useLoja();
  const p = estado.perfil;
  const meta = metaKcal(p);
  const m = macrosMeta(p, meta);
  const set = <K extends 'idade' | 'peso' | 'altura'>(campo: K, v: number) => commit((e) => { e.perfil[campo] = v; });

  return (
    <View style={{ gap: 22 }}>
      <View style={st.meta}>
        <T tam={12} peso="500" style={{ letterSpacing: 1 }}>SUA META DIÁRIA</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <T tam={40} peso="500">{fmt(meta)}</T>
          <T tam={14}>kcal por dia</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {[['Proteína', m.p], ['Carboidrato', m.c], ['Gordura', m.g]].map(([n, v]) => (
            <View key={String(n)} style={st.macro}>
              <T tam={15} peso="500">{v} g</T>
              <T tam={11.5}>{n}</T>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <T tam={13} peso="500">Sexo</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {([['m', 'Masculino'], ['f', 'Feminino']] as [Sexo, string][]).map(([v, n]) => <Opcao key={v} rotulo={n} ativo={p.sexo === v} aoPressionar={() => commit((e) => { e.perfil.sexo = v; })} />)}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <T tam={13} peso="500">Medidas</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Medida nome="IDADE" valor={p.idade} unidade="anos" passo={1} min={14} max={90} casas={0} aoMudar={(v) => set('idade', v)} />
          <Medida nome="PESO" valor={p.peso} unidade="kg" passo={0.5} min={30} max={250} casas={1} aoMudar={(v) => set('peso', v)} />
          <Medida nome="ALTURA" valor={p.altura} unidade="cm" passo={1} min={120} max={230} casas={0} aoMudar={(v) => set('altura', v)} />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <T tam={13} peso="500">Nível de atividade</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {NIVEIS_ATIVIDADE.map((n) => <Opcao key={n.valor} rotulo={n.nome} ativo={p.atividade === n.valor} aoPressionar={() => commit((e) => { e.perfil.atividade = n.valor; })} largura="48%" />)}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <T tam={13} peso="500">Objetivo</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {OBJETIVOS.map((o) => <Opcao key={o.valor} rotulo={o.nome} ativo={p.objetivo === o.valor} aoPressionar={() => commit((e) => { e.perfil.objetivo = o.valor; })} />)}
        </View>
      </View>

      <T tam={11.5} style={{ lineHeight: 17 }}>Meta pelo cálculo de Mifflin-St Jeor, com piso de segurança. É uma estimativa para organização, não uma prescrição.</T>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  meta: { padding: 18, borderRadius: 22, borderWidth: 1, borderColor: cores.destaqueForte, backgroundColor: cores.cartao },
  macro: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14, backgroundColor: cores.cartao2 },
  opcao: { minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 16, borderWidth: 1.5, borderColor: cores.linha2, backgroundColor: cores.cartao },
  opcaoAtiva: { borderColor: cores.destaque, backgroundColor: `rgba(${cores.tom},0.16)` },
  check: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  medida: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  passo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
}));
