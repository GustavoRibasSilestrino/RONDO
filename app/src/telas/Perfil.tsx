/* Perfil: os dados que calculam a sua meta, e sair da conta. */
import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Tela, useAviso } from '../componentes/Estrutura';
import { Botao, Cartao, Passo, Segmentos, T, Titulo } from '../componentes/Ui';
import { NIVEIS_ATIVIDADE, OBJETIVOS } from '../dados';
import { useLoja } from '../estado/loja';
import { macrosMeta, metaKcal } from '../lib/calc';
import { fmt } from '../lib/datas';
import { cores } from '../tema';
import type { Sexo } from '../tipos';
import { SITE } from './Login';

export function Perfil() {
  const { estado, commit, limpar } = useLoja();
  const avisar = useAviso();
  const p = estado.perfil;
  const meta = metaKcal(p);
  const m = macrosMeta(p, meta);

  const mudar = (campo: 'idade' | 'peso' | 'altura', v: number) => commit((e) => { e.perfil[campo] = v; });

  return (
    <Tela>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.violeta }}>
          <T tam={26} peso="300" cor="#ffffff">{(estado.usuario?.nome ?? 'V').charAt(0).toUpperCase()}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T tam={28} peso="200" linhas={1}>{estado.usuario?.nome}</T>
          <T tam={13} cor={cores.texto2} linhas={1}>{estado.usuario?.email}</T>
        </View>
      </View>

      <Cartao destaque style={{ marginTop: 24 }}>
        <T tam={11} mono cor={cores.destaque2}>SUA META DIÁRIA</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <T tam={44} peso="200">{fmt(meta)}</T>
          <T tam={14} cor={cores.texto2}>kcal por dia</T>
        </View>
        <T tam={13} cor={cores.texto2} style={{ marginTop: 4 }}>Proteína {m.p} g · Carboidrato {m.c} g · Gordura {m.g} g</T>
      </Cartao>

      <Titulo>Seus dados</Titulo>
      <Cartao style={{ gap: 18 }}>
        <View style={{ gap: 8 }}>
          <T tam={11} mono cor={cores.texto3}>SEXO</T>
          <Segmentos<Sexo> valor={p.sexo} aoMudar={(v) => commit((e) => { e.perfil.sexo = v; })} opcoes={[{ valor: 'm', nome: 'Masculino' }, { valor: 'f', nome: 'Feminino' }]} />
        </View>
        {[
          { campo: 'idade' as const, nome: 'IDADE', valor: p.idade, passo: 1, min: 14, max: 90, unidade: 'anos' },
          { campo: 'peso' as const, nome: 'PESO', valor: p.peso, passo: 0.5, min: 30, max: 250, unidade: 'kg' },
          { campo: 'altura' as const, nome: 'ALTURA', valor: p.altura, passo: 1, min: 120, max: 230, unidade: 'cm' },
        ].map((c) => (
          <View key={c.campo} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T tam={11} mono cor={cores.texto3}>{c.nome}</T>
            <Passo rotulo={c.nome.toLowerCase()} valor={c.valor} passo={c.passo} min={c.min} max={c.max} formato={(v) => fmt(v, c.campo === 'peso' ? 1 : 0)} unidade={c.unidade} aoMudar={(v) => mudar(c.campo, v)} />
          </View>
        ))}
        <View style={{ gap: 8 }}>
          <T tam={11} mono cor={cores.texto3}>ATIVIDADE</T>
          <Segmentos<number> valor={p.atividade} aoMudar={(v) => commit((e) => { e.perfil.atividade = v; })} opcoes={NIVEIS_ATIVIDADE.map((n) => ({ valor: n.valor, nome: n.nome }))} />
        </View>
        <View style={{ gap: 8 }}>
          <T tam={11} mono cor={cores.texto3}>OBJETIVO</T>
          <Segmentos<number> valor={p.objetivo} aoMudar={(v) => commit((e) => { e.perfil.objetivo = v; })} opcoes={OBJETIVOS.map((o) => ({ valor: o.valor, nome: o.nome }))} />
        </View>
      </Cartao>
      <T tam={11} cor={cores.texto3} style={{ marginTop: 10, lineHeight: 17 }}>
        Meta pelo cálculo de Mifflin-St Jeor, com piso de segurança. É uma estimativa para organização, não uma prescrição.
      </T>

      <Titulo>Conta</Titulo>
      <View style={{ gap: 12 }}>
        <Botao tipo="fantasma" icone="sair" titulo="Sair da conta" aoPressionar={() => commit((e) => { e.usuario = null; })} />
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(SITE)} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
          <T tam={13} cor={cores.destaque2}>Assinatura, termos e privacidade no site →</T>
        </Pressable>
        <Botao
          tipo="perigo"
          icone="lixo"
          titulo="Apagar os meus dados deste aparelho"
          aoPressionar={async () => { await limpar(); avisar('Dados apagados.'); }}
        />
      </View>
      <T tam={11} cor={cores.texto3} style={{ marginTop: 22 }}>Yesteryou · versão 0.1.0</T>
    </Tela>
  );
}
