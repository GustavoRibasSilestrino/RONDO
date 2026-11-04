/* O perfil de outra pessoa, aberto ao tocar na foto de quem publicou: foto com o anel de story, contagens, descrição, patente,
   o botão Seguir e as publicações dela. Em modo demonstração os números e a descrição saem do nome; com a API virão do servidor. */
import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone } from '../../componentes/Icone';
import { AnelStory } from '../../componentes/stories/AnelStory';
import { VisorStory } from '../../componentes/stories/VisorStory';
import { Cartao, T } from '../../componentes/Ui';
import { RANKING_BASE } from '../../dados';
import { useLoja } from '../../estado/loja';
import { fmt } from '../../lib/datas';
import { patenteDe } from '../../lib/patentes';
import { haStoryNovo, storiesDeDemo } from '../../lib/stories';
import { cores, estilos, larguraMax } from '../../tema';
import type { Midia } from '../../tipos';
import { Avatar } from './Avatar';
import { CartaoPost } from './CartaoPost';
import { BotaoSeguir } from './Seguir';
import { todosOsPosts } from './posts';

const BIOS = [
  'Competindo todo dia com quem eu fui ontem.',
  'Treino, comida de verdade e constância.',
  'Um dia de cada vez, uma série de cada vez.',
  'Corrida de manhã, perna à tarde.',
  'Começando de novo, sempre que precisar.',
];

const hash = (s: string): number => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 100003, 7);
const arroba = (nome: string): string => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');

type Props = { nome: string | null; aoFechar: () => void; aoAbrirMidia: (itens: Midia[], indice: number) => void };

export function PerfilPessoa({ nome, aoFechar, aoAbrirMidia }: Props) {
  const insets = useSafeAreaInsets();
  const { estado, commit } = useLoja();
  const [story, setStory] = useState(false);

  const dados = useMemo(() => {
    if (!nome) return null;
    const h = hash(nome);
    const pontos = RANKING_BASE.find((r) => r.nome === nome)?.pontos ?? 150 + (h % 150);
    const nivel = 4 + Math.floor(pontos / 28);
    return { seguidores: 120 + (h % 900), seguindo: 40 + (h % 300), bio: BIOS[h % BIOS.length], nivel, patente: patenteDe(nivel).atual };
  }, [nome]);

  if (!nome || !dados) return null;
  const posts = todosOsPosts(estado).filter((p) => p.autor === nome);
  const stories = storiesDeDemo().find((s) => s.autor === nome);
  const novo = stories ? haStoryNovo(stories.itens, estado.storiesVistos) : false;

  return (
    <Modal visible animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.tela}>
        <View style={[st.coluna, { paddingTop: insets.top + 8 }]}>
          <View style={st.topo}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={aoFechar} style={st.voltar}>
              <Icone nome="voltar" tamanho={22} cor="#ffffff" />
            </Pressable>
            <T tam={16} peso="500" style={{ flex: 1 }} linhas={1}>@{arroba(nome)}</T>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
            <View style={st.cabeca}>
              <AnelStory tamanho={84} estado={stories ? (novo ? 'novo' : 'visto') : 'nenhum'} rotulo={stories ? `Ver o story de ${nome}` : undefined} aoPressionar={stories ? () => setStory(true) : undefined}>
                <Avatar nome={nome} tamanho={84} />
              </AnelStory>
              <View style={st.contagens}>
                <Contagem n={posts.length} rotulo="Publicações" />
                <Contagem n={dados.seguidores} rotulo="Seguidores" />
                <Contagem n={dados.seguindo} rotulo="Seguindo" />
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12 }}>
              <View style={{ flex: 1 }}>
                <T tam={18} peso="500" linhas={1}>{nome}</T>
                <T tam={13} style={{ marginTop: 2 }}>Nível {dados.nivel}{dados.patente ? ` · ${dados.patente.nome}` : ''}</T>
              </View>
              <BotaoSeguir nome={nome} />
            </View>
            <T tam={14} style={{ marginTop: 10, lineHeight: 20 }}>{dados.bio}</T>

            {dados.patente ? (
              <View style={st.patente}>
                <Image source={dados.patente.img} style={{ width: 120, height: 114 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                <T tam={14} peso="500" style={{ marginTop: 4 }}>Patente {dados.patente.nome}</T>
              </View>
            ) : null}

            <View style={st.divisor}><Icone nome="grade" tamanho={20} cor="#ffffff" /><T tam={13} peso="500">Publicações</T></View>
            {posts.length ? (
              <View style={{ gap: 14 }}>
                {posts.map((p) => <CartaoPost key={p.id} post={p} aoAbrirMidia={aoAbrirMidia} />)}
              </View>
            ) : (
              <Cartao><T tam={14} style={{ lineHeight: 20 }}>{nome} ainda não publicou nada.</T></Cartao>
            )}
          </ScrollView>
        </View>
      </View>

      {stories ? (
        <VisorStory
          aberto={story}
          listas={[{ autor: nome, itens: stories.itens }]}
          aoFechar={() => setStory(false)}
          aoVer={(s) => { if (!estado.storiesVistos[s.id]) commit((e) => { e.storiesVistos[s.id] = true; }); }}
        />
      ) : null}
    </Modal>
  );
}

function Contagem({ n, rotulo }: { n: number; rotulo: string }) {
  return (
    <View style={st.contagem} accessibilityLabel={`${rotulo}: ${n}`}>
      <T tam={18} peso="500">{fmt(n)}</T>
      <T tam={12}>{rotulo}</T>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 48 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  contagens: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  contagem: { alignItems: 'center', minWidth: 64 },
  patente: { alignItems: 'center', marginTop: 18, paddingVertical: 14, borderRadius: 20, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.cartao },
  divisor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22, marginBottom: 14, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: cores.linha },
}));
