/* O perfil de outra pessoa, aberto ao tocar na foto de quem publicou: foto, nome, o botão Seguir e as publicações dela.
   Seguidores, descrição, nível e patente de outras pessoas vão aparecer quando a API devolver os perfis. */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone } from '../../componentes/Icone';
import { Cartao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { fmt } from '../../lib/datas';
import { cores, estilos, larguraMax } from '../../tema';
import type { Midia } from '../../tipos';
import { Avatar } from './Avatar';
import { CartaoPost } from './CartaoPost';
import { BotaoSeguir } from './Seguir';
import { todosOsPosts } from './posts';
import { arrobaDe } from './util';

type Props = { nome: string | null; aoFechar: () => void; aoAbrirMidia: (itens: Midia[], indice: number) => void };

export function PerfilPessoa({ nome, aoFechar, aoAbrirMidia }: Props) {
  const insets = useSafeAreaInsets();
  const { estado } = useLoja();
  if (!nome) return null;
  const posts = todosOsPosts(estado).filter((p) => p.autor === nome);

  return (
    <Modal visible animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.tela}>
        <View style={[st.coluna, { paddingTop: insets.top + 8 }]}>
          <View style={st.topo}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={aoFechar} style={st.voltar}>
              <Icone nome="voltar" tamanho={22} cor="#ffffff" />
            </Pressable>
            <T tam={16} peso="500" style={{ flex: 1 }} linhas={1}>@{arrobaDe(nome)}</T>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
            <View style={st.cabeca}>
              <Avatar nome={nome} tamanho={84} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <T tam={18} peso="500">{fmt(posts.length)}</T>
                <T tam={12}>Publicações</T>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12 }}>
              <T tam={18} peso="500" linhas={1} style={{ flex: 1 }}>{nome}</T>
              <BotaoSeguir nome={nome} />
            </View>

            <View style={st.divisor}><Icone nome="grade" tamanho={20} cor="#ffffff" /><T tam={13} peso="500">Publicações</T></View>
            {posts.length ? (
              <View style={{ gap: 14 }}>
                {posts.map((p) => <CartaoPost key={p.id} post={p} timeline aoAbrirMidia={aoAbrirMidia} />)}
              </View>
            ) : (
              <Cartao><T tam={14} style={{ lineHeight: 20 }}>{nome} ainda não publicou nada.</T></Cartao>
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
