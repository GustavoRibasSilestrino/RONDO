/* Criar desafio (desde 2026-11-26): título, descrição, a meta (o que conta para cumprir), o dia de começar, quantos dias dura e a
   cor da capa, com a prévia da capa no topo. Quem cria já participa. O dia de começar vem por atalhos (hoje, amanhã, segunda,
   dia 1º) ou pelas setas, um dia por vez; a duração, por atalhos (7, 14, 21 ou 30 dias) ou pelas setas. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { criarDesafio } from '../../api/social';
import type { Desafio } from '../../api/social';
import { CampoFlutuante } from '../../componentes/CampoFlutuante';
import { useAviso } from '../../componentes/Estrutura';
import { Janela } from '../../componentes/Janela';
import { Icone } from '../../componentes/Icone';
import { Botao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { doIso, iso, somarDias } from '../../lib/datas';
import { atalhosInicio, diaCurto, DURACOES, periodo } from '../../lib/desafios';
import { CORES_GRUPO } from '../../lib/grupos';
import { cores, estilos } from '../../tema';
import { Capa } from './Capa';

const MAX_DIAS = 366;
const MAX_ANTECEDENCIA = 365;

export function CriarDesafio({ aberto, aoFechar, aoCriar }: { aberto: boolean; aoFechar: () => void; aoCriar: (d: Desafio) => void }) {
  const { atualizarSocial } = useLoja();
  const avisar = useAviso();
  const atalhos = atalhosInicio();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [meta, setMeta] = useState('');
  const [inicio, setInicio] = useState(atalhos[1].dia);   // amanhã: dá tempo de chamar a galera
  const [dias, setDias] = useState(30);
  const [cor, setCor] = useState(0);
  const [tentou, setTentou] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const hoje = iso();
  const fim = iso(somarDias(doIso(inicio), dias - 1));
  const tituloLimpo = titulo.trim();
  const erroTitulo = tentou && tituloLimpo.length < 3 ? 'Dê um nome com pelo menos 3 letras.' : '';

  const moverInicio = (n: number) => {
    const novo = iso(somarDias(doIso(inicio), n));
    if (novo < hoje || novo > iso(somarDias(new Date(), MAX_ANTECEDENCIA))) return;
    setInicio(novo);
  };

  const criar = async () => {
    setTentou(true);
    if (tituloLimpo.length < 3 || enviando) return;
    setEnviando(true);
    try {
      const d = await criarDesafio({ titulo: tituloLimpo, descricao: descricao.trim(), meta: meta.trim() || undefined, inicio, fim, cor });
      void atualizarSocial(true);
      setTitulo(''); setDescricao(''); setMeta(''); setInicio(atalhosInicio()[1].dia); setDias(30); setCor(0); setTentou(false);
      aoCriar(d);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível criar o desafio agora.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Janela aberta={aberto} aoFechar={aoFechar} titulo="Criar desafio">
      <Capa cor={cor} icone="trofeu" altura={112}>
        <View style={st.previa}>
          <T tam={22} peso="300" cor="#ffffff" linhas={2}>{tituloLimpo || 'Nome do desafio'}</T>
          <T tam={12.5} cor="rgba(255,255,255,0.84)">{periodo(inicio, fim)} · {dias} dias</T>
        </View>
      </Capa>

      <View style={{ gap: 14, marginTop: 18 }}>
        <CampoFlutuante rotulo="Nome do desafio" icone="trofeu" value={titulo} onChangeText={setTitulo} maxLength={60} erro={erroTitulo} returnKeyType="next" />
        <CampoFlutuante rotulo="Meta (opcional): o que conta para cumprir" value={meta} onChangeText={setMeta} maxLength={80} returnKeyType="next" />
        <CampoFlutuante rotulo="Descrição (opcional)" value={descricao} onChangeText={setDescricao} maxLength={200} multiline />
      </View>

      <T tam={13} cor={cores.texto2} style={st.rotulo}>Começa</T>
      <View style={st.pilulas}>
        {atalhos.map((a) => {
          const ativo = a.dia === inicio;
          return (
            <Pressable key={a.nome} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => setInicio(a.dia)} style={[st.pilula, ativo && st.pilulaAtiva]}>
              <T tam={13} peso={ativo ? '500' : '300'} cor={ativo ? cores.branco : cores.texto2}>{a.nome}</T>
            </Pressable>
          );
        })}
      </View>
      <Seletor
        texto={inicio === hoje ? `Hoje, ${diaCurto(inicio)}` : diaCurto(inicio)} rotulo="dia de começar"
        aoMenos={() => moverInicio(-1)} aoMais={() => moverInicio(1)} podeMenos={inicio > hoje}
      />

      <T tam={13} cor={cores.texto2} style={st.rotulo}>Dura</T>
      <View style={st.pilulas}>
        {DURACOES.map((n) => {
          const ativo = n === dias;
          return (
            <Pressable key={n} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => setDias(n)} style={[st.pilula, ativo && st.pilulaAtiva]}>
              <T tam={13} peso={ativo ? '500' : '300'} cor={ativo ? cores.branco : cores.texto2}>{n} dias</T>
            </Pressable>
          );
        })}
      </View>
      <Seletor
        texto={`${dias} ${dias === 1 ? 'dia' : 'dias'}`} rotulo="duração"
        aoMenos={() => setDias((n) => Math.max(1, n - 1))} aoMais={() => setDias((n) => Math.min(MAX_DIAS, n + 1))} podeMenos={dias > 1}
      />

      <T tam={13} cor={cores.texto2} style={st.rotulo}>Cor da capa</T>
      <View style={st.cores}>
        {CORES_GRUPO.map((par, i) => {
          const ativo = i === cor;
          return (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Cor ${i + 1}`} accessibilityState={{ selected: ativo }} onPress={() => setCor(i)} style={[st.amostra, ativo && st.amostraAtiva]}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: par[0] }]} />
              {ativo ? <Icone nome="ok" tamanho={18} cor="#ffffff" /> : null}
            </Pressable>
          );
        })}
      </View>

      <T tam={12.5} cor={cores.texto3} style={{ marginTop: 18, lineHeight: 18 }}>
        Qualquer pessoa da comunidade pode ver e entrar até o último dia. Você participa automaticamente.
      </T>
      <Botao titulo={enviando ? 'Criando...' : 'Criar desafio'} icone="mais" aoPressionar={criar} carregando={enviando} style={{ marginTop: 16, alignSelf: 'stretch' }} />
    </Janela>
  );
}

/* um valor com as setas dos lados: um dia (ou um dia de duração) para cada toque */
function Seletor({ texto, rotulo, aoMenos, aoMais, podeMenos }: { texto: string; rotulo: string; aoMenos: () => void; aoMais: () => void; podeMenos: boolean }) {
  return (
    <View style={st.seletor}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Diminuir ${rotulo}`} disabled={!podeMenos} onPress={aoMenos} hitSlop={6} style={[st.seta, !podeMenos && { opacity: 0.35 }]}>
        <Icone nome="voltar" tamanho={18} cor={cores.texto} />
      </Pressable>
      <T tam={16} peso="400" style={{ flex: 1 }} centro>{texto}</T>
      <Pressable accessibilityRole="button" accessibilityLabel={`Aumentar ${rotulo}`} onPress={aoMais} hitSlop={6} style={st.seta}>
        <Icone nome="setaDireita" tamanho={18} cor={cores.texto} />
      </Pressable>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  previa: { position: 'absolute', left: 16, right: 16, bottom: 14, gap: 2 },
  rotulo: { marginTop: 20, marginBottom: 10 },
  pilulas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pilula: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  pilulaAtiva: { backgroundColor: cores.acao, borderColor: cores.acao },
  seletor: { flexDirection: 'row', alignItems: 'center', marginTop: 10, height: 48, borderRadius: 24, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.fundo2 },
  seta: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  cores: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  amostra: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  amostraAtiva: { borderColor: cores.texto },
}));
