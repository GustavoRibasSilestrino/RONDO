/* O visor de stories, em tela cheia: barras de progresso no topo, 5 segundos por story, toque na direita para avançar e na esquerda para voltar.
   Aceita várias listas (uma por pessoa): ao acabar uma, passa para a próxima. Nos seus stories mostra Excluir. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DURACAO_STORY_MS, FUNDOS_STORY, StoryVista, tempoStory } from '../../lib/stories';
import { useUriMidia } from '../../lib/midia';
import { cores, estilos, larguraMax } from '../../tema';
import { Avatar } from '../../telas/comunidade/Avatar';
import { Icone } from '../Icone';
import { T } from '../Ui';

export type ListaStory = { autor: string; itens: StoryVista[]; rotulo?: string };

type Props = {
  aberto: boolean;
  listas: ListaStory[];
  inicio?: number;                              // qual lista abrir primeiro
  aoFechar: () => void;
  aoVer?: (s: StoryVista) => void;              // um story de outra pessoa foi mostrado
  aoExcluir?: (s: StoryVista) => void;          // só nos seus stories
};

function Foto({ id, url }: { id: string; url?: string }) {
  const uri = useUriMidia(id, url);   // o arquivo do aparelho (seus stories) ou o do servidor (de quem você segue)
  return uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityIgnoresInvertColors /> : null;
}

export function VisorStory({ aberto, listas, inicio = 0, aoFechar, aoVer, aoExcluir }: Props) {
  const insets = useSafeAreaInsets();
  const [g, setG] = useState(inicio);
  const [i, setI] = useState(0);
  const p = useRef(new Animated.Value(0)).current;

  /* ao abrir, começa pela lista pedida */
  useEffect(() => { if (aberto) { setG(inicio); setI(0); } }, [aberto, inicio]);

  const lista = listas[g];
  const story = lista?.itens[i];

  const avancar = () => {
    if (!lista) return;
    if (i < lista.itens.length - 1) setI(i + 1);
    else if (g < listas.length - 1) { setG(g + 1); setI(0); }
    else aoFechar();
  };
  const voltar = () => {
    if (i > 0) setI(i - 1);
    else if (g > 0) { const ant = listas[g - 1]; setG(g - 1); setI(Math.max(0, ant.itens.length - 1)); }
    else { p.setValue(0); }
  };

  /* a barra de progresso corre 5 s e então passa para o próximo */
  useEffect(() => {
    if (!aberto || !story) return undefined;
    p.setValue(0);
    if (!story.meu && aoVer) aoVer(story);
    const a = Animated.timing(p, { toValue: 1, duration: DURACAO_STORY_MS, easing: Easing.linear, useNativeDriver: false });
    a.start(({ finished }) => { if (finished) avancar(); });
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, g, i, story?.id]);

  if (!aberto || !lista || !story) return null;

  return (
    <Modal visible animationType="fade" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.tela}>
        <View style={st.coluna}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: story.midia ? '#000000' : FUNDOS_STORY[(story.fundo ?? 0) % FUNDOS_STORY.length] }]} />
          {story.midia ? <Foto id={story.midia.id} url={story.midia.url} /> : (
            <View style={st.centro}><T tam={28} peso="500" centro style={{ lineHeight: 38 }}>{story.texto}</T></View>
          )}

          {/* toque: esquerda volta, direita avança */}
          <View style={StyleSheet.absoluteFill}>
            <Pressable accessibilityRole="button" accessibilityLabel="Story anterior" onPress={voltar} style={{ position: 'absolute', left: 0, top: 110, bottom: 130, width: '32%' }} />
            <Pressable accessibilityRole="button" accessibilityLabel="Próximo story" onPress={avancar} style={{ position: 'absolute', right: 0, top: 110, bottom: 130, width: '68%' }} />
          </View>

          {/* topo: progresso, quem postou e fechar */}
          <View style={[st.topo, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
            <View style={st.barras}>
              {lista.itens.map((s, k) => (
                <View key={s.id} style={st.trilho}>
                  <Animated.View style={[st.enche, { width: k < i ? '100%' : k === i ? p.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '0%' }]} />
                </View>
              ))}
            </View>
            <View style={st.autor}>
              <Avatar nome={lista.autor === 'Você' ? 'Você' : lista.autor} voce={lista.autor === 'Você'} tamanho={34} />
              <View style={{ flex: 1 }}>
                <T tam={14} peso="500" linhas={1}>{lista.rotulo ?? lista.autor}</T>
                <T tam={12}>{tempoStory(story.criado)}</T>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} hitSlop={10} style={st.fechar}>
                <Icone nome="fechar" tamanho={22} cor="#ffffff" />
              </Pressable>
            </View>
          </View>

          {/* base: legenda e, nos seus stories, as ações */}
          <View style={[st.base, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
            {story.legenda ? <View style={st.legenda}><T tam={15} centro style={{ lineHeight: 21 }}>{story.legenda}</T></View> : null}
            {story.meu && aoExcluir ? (
              <View style={st.acoes}>
                <Pressable accessibilityRole="button" onPress={() => aoExcluir(story)} style={st.acao}><Icone nome="lixo" tamanho={18} cor="#ffffff" /><T tam={13.5} peso="500">Excluir story</T></Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#000000', alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: Math.min(larguraMax, 480), overflow: 'hidden' },
  centro: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 32 },
  topo: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12 },
  barras: { flexDirection: 'row', gap: 4 },
  trilho: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  enche: { height: 3, backgroundColor: '#ffffff' },
  autor: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  fechar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  base: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, gap: 14, alignItems: 'center' },
  legenda: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)' },
  acoes: { flexDirection: 'row', gap: 12 },
  acao: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
}));
