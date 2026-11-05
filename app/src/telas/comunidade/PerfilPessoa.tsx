/* O perfil de outra pessoa, aberto ao tocar na foto de quem publicou: foto, nome, o botão Seguir e as publicações dela.
   Tudo vem do servidor: o perfil e as publicações que quem olha pode ver (clube privado não vaza). */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lerPerfil, lerPostsDaPessoa } from '../../api/social';
import type { PerfilPublico } from '../../api/social';
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

type Props = { id: number | null; aoFechar: () => void; aoAbrirMidia: (itens: Midia[], indice: number) => void };

export function PerfilPessoa({ id, aoFechar, aoAbrirMidia }: Props) {
  const insets = useSafeAreaInsets();
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [erro, setErro] = useState('');
  const lista = useLista((cursor) => lerPostsDaPessoa(id ?? 0, cursor), [id], id !== null);
  useEffect(() => {
    setPerfil(null); setErro('');
    if (id === null) return undefined;
    let valido = true;
    lerPerfil(id).then((p) => { if (valido) setPerfil(p); }).catch((e) => { if (valido) setErro(e instanceof Error ? e.message : 'Não foi possível abrir o perfil.'); });
    return () => { valido = false; };
  }, [id]);
  if (id === null) return null;
  const nome = perfil?.nome ?? '';
  const posts = lista.itens;

  return (
    <Modal visible animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.tela}>
        <View style={[st.coluna, { paddingTop: insets.top + 8 }]}>
          <View style={st.topo}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={aoFechar} style={st.voltar}>
              <Icone nome="voltar" tamanho={22} cor="#ffffff" />
            </Pressable>
            <T tam={16} peso="500" style={{ flex: 1 }} linhas={1}>{perfil ? `@${perfil.arroba ?? arrobaDe(nome)}` : erro ? "Perfil" : ""}</T>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
            <View style={st.cabeca}>
              <Avatar nome={nome || ' '} tamanho={84} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <T tam={18} peso="500">{fmt(perfil?.posts ?? 0)}</T>
                <T tam={12}>Publicações</T>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <T tam={18} peso="500">{fmt(perfil?.seguidores ?? 0)}</T>
                <T tam={12}>Seguidores</T>
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <T tam={18} peso="500">{fmt(perfil?.seguindo_n ?? 0)}</T>
                <T tam={12}>Seguindo</T>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12 }}>
              <T tam={18} peso="500" linhas={1} style={{ flex: 1 }}>{nome}</T>
              {perfil && !perfil.voce ? <BotaoSeguir pessoa={perfil} /> : null}
            </View>

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
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 48 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  divisor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22, marginBottom: 14, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: cores.linha },
}));
