/* Criar grupo: nome, descrição, categoria, público ou privado, objetivo e cor da capa, com a prévia da capa no topo.
   Quem cria já entra no grupo. Grupo privado ganha um código de convite para compartilhar. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CampoFlutuante } from '../../componentes/CampoFlutuante';
import { Folha } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, Segmentos, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { categoria, CATEGORIAS, CORES_GRUPO, novoCodigo } from '../../lib/grupos';
import { cores } from '../../tema';
import type { CategoriaGrupo } from '../../tipos';
import { Capa } from './Capa';

export function CriarGrupo({ aberto, aoFechar, aoCriar }: { aberto: boolean; aoFechar: () => void; aoCriar: (id: string) => void }) {
  const { commit } = useLoja();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cat, setCat] = useState<CategoriaGrupo>('treino');
  const [privado, setPrivado] = useState(false);
  const [meta, setMeta] = useState('');
  const [cor, setCor] = useState(0);
  const [tentou, setTentou] = useState(false);

  const nomeLimpo = nome.trim();
  const erroNome = tentou && nomeLimpo.length < 3 ? 'Dê um nome com pelo menos 3 letras.' : '';

  const criar = () => {
    setTentou(true);
    if (nomeLimpo.length < 3) return;
    const id = `g${Date.now().toString(36)}`;
    commit((e) => {
      e.grupos.unshift({ id, nome: nomeLimpo, descricao: descricao.trim(), categoria: cat, privado, cor, dono: 'Você', criado: Date.now(), codigo: novoCodigo(), meta: meta.trim() || undefined });
      e.clubes[id] = true;
    });
    setNome(''); setDescricao(''); setCat('treino'); setPrivado(false); setMeta(''); setCor(0); setTentou(false);
    aoCriar(id);
  };

  return (
    <Folha aberta={aberto} aoFechar={aoFechar} titulo="Criar grupo">
      <Capa cor={cor} cat={cat} altura={112}>
        <View style={st.previa}>
          <T tam={24} peso="300" cor="#ffffff" linhas={2}>{nomeLimpo || 'Nome do grupo'}</T>
          <T tam={12.5} cor="rgba(255,255,255,0.82)">{privado ? 'Privado' : 'Público'} · {categoria(cat).nome}</T>
        </View>
      </Capa>

      <View style={{ gap: 14, marginTop: 18 }}>
        <CampoFlutuante rotulo="Nome do grupo" icone="grupo" value={nome} onChangeText={setNome} maxLength={40} erro={erroNome} returnKeyType="next" />
        <CampoFlutuante rotulo="Descrição (opcional)" value={descricao} onChangeText={setDescricao} maxLength={160} multiline />
      </View>

      <T tam={13} cor={cores.texto2} style={{ marginTop: 20, marginBottom: 10 }}>Categoria</T>
      <View style={st.pilulas}>
        {CATEGORIAS.map((c) => {
          const ativo = c.id === cat;
          return (
            <Pressable key={c.id} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => setCat(c.id)} style={[st.pilula, ativo && st.pilulaAtiva]}>
              <Icone nome={c.icone} tamanho={16} cor={ativo ? '#ffffff' : cores.texto2} />
              <T tam={13} peso={ativo ? '500' : '300'} cor={ativo ? '#ffffff' : cores.texto2}>{c.nome}</T>
            </Pressable>
          );
        })}
      </View>

      <T tam={13} cor={cores.texto2} style={{ marginTop: 20, marginBottom: 10 }}>Quem pode entrar</T>
      <Segmentos<'publico' | 'privado'> valor={privado ? 'privado' : 'publico'} aoMudar={(v) => setPrivado(v === 'privado')} opcoes={[{ valor: 'publico', nome: 'Público' }, { valor: 'privado', nome: 'Privado' }]} />
      <T tam={12.5} cor={cores.texto3} style={{ marginTop: 8, lineHeight: 18 }}>
        {privado ? 'Só entra quem tem o código de convite, que aparece na página do grupo.' : 'Qualquer pessoa da comunidade pode entrar.'}
      </T>

      <View style={{ marginTop: 18 }}>
        <CampoFlutuante rotulo="Meta ou objetivo (opcional)" value={meta} onChangeText={setMeta} maxLength={70} returnKeyType="done" />
      </View>

      <T tam={13} cor={cores.texto2} style={{ marginTop: 20, marginBottom: 10 }}>Cor da capa</T>
      <View style={st.cores}>
        {CORES_GRUPO.map((par, i) => {
          const ativo = i === cor;
          return (
            <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Cor ${i + 1}`} accessibilityState={{ selected: ativo }} onPress={() => setCor(i)} style={[st.amostra, ativo && st.amostraAtiva]}>
              <LinearGradient colors={[par[0], par[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              {ativo ? <Icone nome="ok" tamanho={18} cor="#ffffff" /> : null}
            </Pressable>
          );
        })}
      </View>

      <Botao titulo="Criar grupo" icone="mais" aoPressionar={criar} style={{ marginTop: 24 }} />
    </Folha>
  );
}

const st = StyleSheet.create({
  previa: { position: 'absolute', left: 16, right: 16, bottom: 14, gap: 2 },
  pilulas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pilula: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  pilulaAtiva: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  cores: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  amostra: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  amostraAtiva: { borderColor: '#ffffff' },
});
