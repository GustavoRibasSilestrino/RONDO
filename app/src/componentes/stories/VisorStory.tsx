/* O visor de stories, em tela cheia: barras de progresso no topo, 5 segundos por story, toque na direita para avançar e na esquerda para voltar.
   Aceita várias listas (uma por pessoa): ao acabar uma, passa para a próxima. Nos seus stories mostra Excluir. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { quemViuOStory, reagirAoStory, tirarReacaoDoStory } from '../../api/social';
import type { Pessoa, Visualizacao } from '../../api/social';
import { DURACAO_STORY_MS, emojiDe, FUNDOS_STORY, REACOES_STORY, StoryVista, tempoStory } from '../../lib/stories';
import { useUriMidia } from '../../lib/midia';
import { cores, estilos, larguraMax } from '../../tema';
import { Avatar } from '../../telas/comunidade/Avatar';
import { Folha } from '../Estrutura';
import { Icone } from '../Icone';
import { T } from '../Ui';

export type ListaStory = { autor: string; itens: StoryVista[]; rotulo?: string; pessoa?: Pessoa };

type Props = {
  aberto: boolean;
  listas: ListaStory[];
  inicio?: number;                              // qual lista abrir primeiro
  aoFechar: () => void;
  aoVer?: (s: StoryVista) => void;              // um story de outra pessoa foi mostrado
  aoExcluir?: (s: StoryVista) => void;          // só nos seus stories
  aoAbrirPerfil?: (pessoa: Pessoa) => void;     // tocar em quem postou: fecha o story e abre o perfil dela
};

function Foto({ id, url }: { id: string; url?: string }) {
  const uri = useUriMidia(id, url);   // o arquivo do aparelho (seus stories) ou o do servidor (de quem você segue)
  return uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityIgnoresInvertColors /> : null;
}

export function VisorStory({ aberto, listas, inicio = 0, aoFechar, aoVer, aoExcluir, aoAbrirPerfil }: Props) {
  const insets = useSafeAreaInsets();
  const [g, setG] = useState(inicio);
  const [i, setI] = useState(0);
  const p = useRef(new Animated.Value(0)).current;
  const [reacoes, setReacoes] = useState<Record<string, string | null>>({});   // a reação que a pessoa acabou de dar (vale antes de o servidor confirmar)
  const [quemViu, setQuemViu] = useState<{ total: number; itens: Visualizacao[] } | null>(null);   // a folha com a lista de quem viu
  const [erroLista, setErroLista] = useState('');
  const [menu, setMenu] = useState(false);   // o menu das reações, aberto pelo emoji do canto

  /* ao abrir, começa pela lista pedida */
  useEffect(() => { if (aberto) { setG(inicio); setI(0); setReacoes({}); setQuemViu(null); } }, [aberto, inicio]);

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
    if (quemViu || erroLista || menu) return undefined;   // lista de quem viu ou menu de reações aberto: o story espera
    const a = Animated.timing(p, { toValue: 1, duration: DURACAO_STORY_MS, easing: Easing.linear, useNativeDriver: false });
    a.start(({ finished }) => { if (finished) avancar(); });
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, g, i, story?.id, !!quemViu, menu]);
  useEffect(() => { setMenu(false); }, [story?.id]);

  if (!aberto || !lista || !story) return null;

  const minha = story.id in reacoes ? reacoes[story.id] : story.minhaReacao ?? null;
  const reagir = (tipo: string) => {
    const nova = minha === tipo ? null : tipo;   // tocar na mesma reação tira
    const antes = minha;
    setReacoes((r) => ({ ...r, [story.id]: nova }));
    setMenu(false);
    (nova ? reagirAoStory(Number(story.id), nova) : tirarReacaoDoStory(Number(story.id))).catch(() => setReacoes((r) => ({ ...r, [story.id]: antes })));
  };
  const abrirQuemViu = async () => {
    setErroLista('');
    setQuemViu({ total: story.visualizacoes ?? 0, itens: [] });
    try { setQuemViu(await quemViuOStory(Number(story.id))); } catch (e) { setQuemViu(null); setErroLista(e instanceof Error ? e.message : 'Não foi possível ver as visualizações agora.'); }
  };
  const vistos = story.vistos ?? [];
  const total = story.visualizacoes ?? 0;

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
              <Pressable
                accessibilityRole="button" accessibilityLabel={`Abrir o perfil de ${lista.autor}`} disabled={!aoAbrirPerfil || !lista.pessoa}
                onPress={() => { if (lista.pessoa) { aoFechar(); aoAbrirPerfil?.(lista.pessoa); } }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <Avatar nome={lista.autor === 'Você' ? 'Você' : lista.autor} voce={lista.autor === 'Você'} tamanho={34} foto={lista.pessoa?.foto ?? undefined} />
                <View style={{ flex: 1 }}>
                  <T tam={14} peso="500" linhas={1}>{lista.rotulo ?? lista.autor}</T>
                  <T tam={12}>{tempoStory(story.criado)}</T>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} hitSlop={10} style={st.fechar}>
                <Icone nome="fechar" tamanho={22} cor="#ffffff" />
              </Pressable>
            </View>
          </View>

          {/* base: legenda e, nos seus stories, as ações */}
          <View style={[st.base, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
            {story.legenda ? <View style={st.legenda}><T tam={15} centro style={{ lineHeight: 21 }}>{story.legenda}</T></View> : null}
            {story.meu ? (
              <View style={st.linhaBase}>
                {/* quem viu: até 3 bolinhas e, se foram mais, um + ao lado; tocar abre a lista com a reação de cada um */}
                <Pressable accessibilityRole="button" accessibilityLabel={total === 0 ? 'Ninguém viu ainda' : `Ver quem viu: ${total} ${total === 1 ? 'pessoa' : 'pessoas'}`} onPress={abrirQuemViu} style={st.vistos}>
                  {vistos.slice(0, 3).map((v, k) => (
                    <View key={v.id} style={[st.bolinha, { marginLeft: k === 0 ? 0 : -10, zIndex: 10 - k }]}><Avatar nome={v.nome} tamanho={32} foto={v.foto ?? undefined} /></View>
                  ))}
                  {total > 3 ? <View style={[st.bolinha, st.mais, { marginLeft: -10 }]}><T tam={12} peso="500">+{total - 3}</T></View> : null}
                  <T tam={13} peso="500" style={{ marginLeft: vistos.length ? 8 : 0 }}>{total === 0 ? 'Ninguém viu ainda' : `${total} ${total === 1 ? 'visualização' : 'visualizações'}`}</T>
                </Pressable>
                {aoExcluir ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Excluir story" onPress={() => aoExcluir(story)} style={st.excluir}><Icone nome="lixo" tamanho={18} cor="#ffffff" /></Pressable>
                ) : null}
              </View>
            ) : (
              /* reações: um emoji só no canto de baixo à direita; ao tocar, as outras abrem para cima */
              <View style={st.linhaBase}>
                <View />
                <View style={st.reacaoCanto}>
                  {menu ? (
                    <View style={st.menuReacoes} accessibilityRole="menu">
                      {[...REACOES_STORY].reverse().map((r) => (
                        <Pressable
                          key={r.tipo} accessibilityRole="button" accessibilityLabel={minha === r.tipo ? `Tirar a reação ${r.rotulo}` : `Reagir com ${r.rotulo}`} accessibilityState={{ selected: minha === r.tipo }}
                          onPress={() => reagir(r.tipo)} style={[st.reacao, minha === r.tipo && st.reacaoOn]}
                        >
                          <T tam={r.tipo === 'curtir' ? 24 : 22}>{r.emoji}</T>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                  <Pressable
                    accessibilityRole="button" accessibilityLabel={menu ? 'Fechar as reações' : minha ? `Sua reação: ${REACOES_STORY.find((r) => r.tipo === minha)?.rotulo}. Tocar para mudar` : 'Reagir ao story'}
                    accessibilityState={{ expanded: menu }} onPress={() => setMenu((v) => !v)} style={[st.reacao, st.reacaoPrincipal, (menu || !!minha) && st.reacaoOn]}
                  >
                    <T tam={26}>{emojiDe(minha) || '❤️'}</T>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* a lista de quem viu o seu story, com a reação de cada pessoa */}
      <Folha aberta={quemViu !== null} aoFechar={() => setQuemViu(null)} titulo={`Visualizações (${quemViu?.total ?? 0})`}>
        {quemViu && quemViu.itens.length === 0 ? <T tam={14} style={{ lineHeight: 20 }}>{quemViu.total === 0 ? 'Ninguém viu ainda.' : 'Carregando…'}</T> : (
          <View style={{ gap: 14 }}>
            {quemViu?.itens.map((v) => (
              <Pressable
                key={v.pessoa.id} accessibilityRole="button" accessibilityLabel={`Abrir o perfil de ${v.pessoa.nome}`} disabled={!aoAbrirPerfil}
                onPress={() => { setQuemViu(null); aoFechar(); aoAbrirPerfil?.(v.pessoa); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <Avatar nome={v.pessoa.nome} tamanho={40} foto={v.pessoa.foto ?? undefined} />
                <View style={{ flex: 1 }}>
                  <T tam={15} linhas={1}>{v.pessoa.nome}</T>
                  {v.pessoa.arroba ? <T tam={12.5} linhas={1} style={{ opacity: 0.75 }}>@{v.pessoa.arroba}</T> : null}
                </View>
                {v.reacao ? <T tam={22}>{emojiDe(v.reacao)}</T> : null}
              </Pressable>
            ))}
          </View>
        )}
      </Folha>
      <Folha aberta={!!erroLista} aoFechar={() => setErroLista('')} titulo="Visualizações">
        <T tam={14} style={{ lineHeight: 20 }}>{erroLista}</T>
      </Folha>
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
  linhaBase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  vistos: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingRight: 12 },
  bolinha: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000000', backgroundColor: '#000000' },
  mais: { backgroundColor: 'rgba(255,255,255,0.22)' },
  excluir: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  reacaoCanto: { alignItems: 'center' },
  menuReacoes: { position: 'absolute', bottom: 60, right: 0, flexDirection: 'column', gap: 8, alignItems: 'center' },
  reacaoPrincipal: { width: 52, height: 52, borderRadius: 26 },
  reacao: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  reacaoOn: { backgroundColor: 'rgba(139,92,246,0.55)', borderColor: '#c4a8ff' },
  acoes: { flexDirection: 'row', gap: 12 },
  acao: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
}));
