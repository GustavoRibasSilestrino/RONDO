/* O perfil de outra pessoa, aberto ao tocar na foto de quem publicou: foto, nome, o botão Seguir e as publicações dela.
   Tocar em Seguidores ou Seguindo abre a lista; tocar em alguém da lista abre o perfil dessa pessoa (o voltar volta para o anterior).
   Tudo vem do servidor: o perfil e as publicações que quem olha pode ver (clube privado não vaza). */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lerPerfil, lerPostsDaPessoa, lerSeguidores, lerSeguindo } from '../../api/social';
import type { PerfilPublico } from '../../api/social';
import { Folha } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, Cartao, T } from '../../componentes/Ui';
import { useLista } from '../../estado/lista';
import { fmt } from '../../lib/datas';
import { cores, estilos, larguraMax } from '../../tema';
import type { Midia } from '../../tipos';
import { Avatar } from './Avatar';
import { CartaoPost } from './CartaoPost';
import { BotaoSeguir } from './Seguir';
import { arrobaDe } from './util';

type Props = { id: number | null; aoFechar: () => void; aoAbrirMidia: (itens: Midia[], indice: number) => void; aoAbrirClube?: (id: number) => void };

export function PerfilPessoa({ id, aoFechar, aoAbrirMidia, aoAbrirClube }: Props) {
  const insets = useSafeAreaInsets();
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [erro, setErro] = useState('');
  /* ao abrir alguém da lista de seguidores, o perfil dele entra numa pilha: o voltar desfaz um de cada vez, até fechar */
  const [pilha, setPilha] = useState<number[]>([]);
  const [conexoes, setConexoes] = useState<'seguidores' | 'seguindo' | null>(null);
  useEffect(() => { setPilha([]); setConexoes(null); }, [id]);
  const atual = pilha.length ? pilha[pilha.length - 1] : id;
  const lista = useLista((cursor) => lerPostsDaPessoa(atual ?? 0, cursor), [atual], atual !== null);
  const pessoas = useLista((cursor) => (conexoes === 'seguidores' ? lerSeguidores(atual ?? 0, cursor) : lerSeguindo(atual ?? 0, cursor)), [atual, conexoes], atual !== null && conexoes !== null);
  useEffect(() => {
    setPerfil(null); setErro('');
    if (atual === null) return undefined;
    let valido = true;
    lerPerfil(atual).then((p) => { if (valido) setPerfil(p); }).catch((e) => { if (valido) setErro(e instanceof Error ? e.message : 'Não foi possível abrir o perfil.'); });
    return () => { valido = false; };
  }, [atual]);
  if (id === null || atual === null) return null;
  const nome = perfil?.nome ?? '';
  const primeiro = nome.split(' ')[0] || 'Essa pessoa';
  const posts = lista.itens;
  const voltar = () => { if (conexoes) setConexoes(null); else if (pilha.length) setPilha((p) => p.slice(0, -1)); else aoFechar(); };
  const abrirOutro = (outro: number) => { setConexoes(null); setPilha((p) => [...p, outro]); };

  return (
    <Modal visible animationType="none" onRequestClose={voltar} statusBarTranslucent>
      <View style={st.tela}>
        <View style={[st.coluna, { paddingTop: insets.top + 8 }]}>
          <View style={st.topo}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={voltar} style={st.voltar}>
              <Icone nome="voltar" tamanho={22} cor="#ffffff" />
            </Pressable>
            <T tam={16} peso="500" style={{ flex: 1 }} linhas={1}>{perfil ? `@${perfil.arroba ?? arrobaDe(nome)}` : erro ? "Perfil" : ""}</T>
          </View>

          <ScrollView key={atual} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
            <View style={st.cabeca}>
              <Avatar nome={nome || ' '} tamanho={84} foto={perfil?.foto ?? undefined} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <T tam={18} peso="500">{fmt(perfil?.posts ?? 0)}</T>
                <T tam={12}>Publicações</T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ver quem segue ${primeiro}: ${perfil?.seguidores ?? 0} seguidores`} disabled={!perfil} onPress={() => setConexoes('seguidores')} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                <T tam={18} peso="500">{fmt(perfil?.seguidores ?? 0)}</T>
                <T tam={12}>Seguidores</T>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ver quem ${primeiro} segue: ${perfil?.seguindo_n ?? 0} pessoas`} disabled={!perfil} onPress={() => setConexoes('seguindo')} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
                <T tam={18} peso="500">{fmt(perfil?.seguindo_n ?? 0)}</T>
                <T tam={12}>Seguindo</T>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12 }}>
              <T tam={18} peso="500" linhas={1} style={{ flex: 1 }}>{nome}</T>
              {perfil && !perfil.voce ? <BotaoSeguir pessoa={perfil} /> : null}
            </View>

            {perfil?.clubes?.length ? (
              <View style={st.clubes}>
                <T tam={12} cor={cores.texto3} style={{ letterSpacing: 1.2 }}>{perfil.clubes.length === 1 ? 'CLUBE' : 'CLUBES'}</T>
                <View style={st.clubesLinha}>
                  {perfil.clubes.map((c) => (
                    <Pressable
                      key={c.id} accessibilityRole="button" accessibilityLabel={`Abrir o clube ${c.nome}`} disabled={!aoAbrirClube}
                      onPress={() => aoAbrirClube?.(c.id)}
                      style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [st.clube, (hovered || pressed) && { backgroundColor: cores.cartao2 }]}
                    >
                      <Icone nome="grupo" tamanho={15} cor={cores.destaque2} />
                      <T tam={13.5} peso="500" cor={cores.destaque2} linhas={1} style={{ flexShrink: 1 }}>{c.nome}</T>
                      <Icone nome="setaDireita" tamanho={13} cor={cores.texto3} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={st.divisor}><Icone nome="grade" tamanho={20} cor="#ffffff" /><T tam={13} peso="500">Publicações</T></View>
            {posts.length ? (
              <View style={{ gap: 14 }}>
                {posts.map((p) => <CartaoPost key={p.id} post={p} timeline aoAbrirMidia={aoAbrirMidia} aoApagar={(pid) => lista.mudar((l) => l.filter((x) => x.id !== pid))} />)}
                {lista.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais" aoPressionar={lista.maisItens} carregando={lista.carregando} /> : null}
              </View>
            ) : (
              <Cartao><T tam={14} style={{ lineHeight: 20 }}>{erro || lista.erro || (lista.carregando || !perfil ? "Carregando..." : `${nome} ainda não publicou nada.`)}</T></Cartao>
            )}
          </ScrollView>
        </View>
      </View>

      {/* a lista de quem segue essa pessoa, ou de quem ela segue */}
      <Folha aberta={conexoes !== null} aoFechar={() => setConexoes(null)} titulo={conexoes === 'seguidores' ? `Seguidores de ${primeiro}` : `Quem ${primeiro} segue`}>
        {pessoas.itens.length ? (
          <View style={{ gap: 14 }}>
            {pessoas.itens.map((n) => (
              <View key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  accessibilityRole="button" accessibilityLabel={`Abrir o perfil de ${n.nome}`} disabled={n.voce}
                  onPress={() => abrirOutro(n.id)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <Avatar nome={n.nome} voce={n.voce} foto={n.foto ?? undefined} />
                  <View style={{ flex: 1 }}>
                    <T tam={15} linhas={1}>{n.voce ? `${n.nome} (você)` : n.nome}</T>
                    {n.arroba ? <T tam={12.5} linhas={1} style={{ opacity: 0.75 }}>@{n.arroba}</T> : null}
                  </View>
                </Pressable>
                {n.voce ? null : <BotaoSeguir pessoa={n} />}
              </View>
            ))}
            {pessoas.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais" aoPressionar={pessoas.maisItens} carregando={pessoas.carregando} /> : null}
          </View>
        ) : (
          <T tam={14} style={{ lineHeight: 20 }}>
            {pessoas.erro || (pessoas.carregando ? 'Carregando...' : conexoes === 'seguidores' ? `Ninguém segue ${primeiro} ainda.` : `${primeiro} ainda não segue ninguém.`)}
          </T>
        )}
      </Folha>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 48 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  clubes: { marginTop: 16, gap: 8 },
  clubesLinha: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clube: { flexDirection: 'row', alignItems: 'center', gap: 7, maxWidth: '100%', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  divisor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22, marginBottom: 14, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: cores.linha },
}));
