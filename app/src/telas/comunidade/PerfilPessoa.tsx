/* O perfil de outra pessoa, aberto ao tocar na foto de quem publicou. Desde 2026-11-26 no desenho de "página de jogo" que o dono
   mandou de referência: uma CAPA no alto (a imagem que a pessoa escolheu ou, sem ela, um cinza: telas/perfil/CapaPerfil.tsx), os botões redondos de vidro voltar e "...",
   a foto grande encostada na borda de baixo da capa, as etiquetas ao lado (verificado, selo, mascote), o nome, o @ e a bio, os
   números em chips (seguidores e seguindo abrem a lista), a GALERIA das fotos publicadas num carrossel, os CLUBES e, por fim,
   as publicações. No pé, fixos, dois botões: Compartilhar (escuro) e Seguir (o principal, invertido).
   Tocar em alguém da lista abre o perfil dessa pessoa (o voltar volta para o anterior). Tudo vem do servidor: o perfil e as
   publicações que quem olha pode ver (clube privado não vaza). */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lerPerfil, lerPostsDaPessoa, lerSeguidores, lerSeguindo } from '../../api/social';
import type { PerfilPublico } from '../../api/social';
import { MenuDenunciar } from '../../componentes/Denunciar';
import { DeslizarParaVoltar } from '../../componentes/Deslizar';
import { useAviso } from '../../componentes/Estrutura';
import { Icone, type NomeIcone } from '../../componentes/Icone';
import { Janela } from '../../componentes/Janela';
import { Botao, Cartao, T } from '../../componentes/Ui';
import { Vidro } from '../../componentes/Vidro';
import { useLista } from '../../estado/lista';
import { fmt } from '../../lib/datas';
import { mascoteDe } from '../../lib/mascotes';
import { useUriMidia } from '../../lib/midia';
import { cores, estilos, larguraMax } from '../../tema';
import type { Midia } from '../../tipos';
import { CapaPerfil } from '../perfil/CapaPerfil';
import { Avatar } from './Avatar';
import { CartaoPost } from './CartaoPost';
import { BotaoSeguir, useSeguir } from './Seguir';
import { arrobaDe } from './util';

type Props = { id: number | null; aoFechar: () => void; aoAbrirMidia: (itens: Midia[], indice: number) => void; aoAbrirClube?: (id: number) => void };

const ALTURA_CAPA = 230;
const FOTO = 92;
const ALTURA_PE = 52;   // os dois botões do pé

export function PerfilPessoa({ id, aoFechar, aoAbrirMidia, aoAbrirClube }: Props) {
  const insets = useSafeAreaInsets();
  const avisar = useAviso();
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [erro, setErro] = useState('');
  /* ao abrir alguém da lista de seguidores, o perfil dele entra numa pilha: o voltar desfaz um de cada vez, até fechar */
  const [pilha, setPilha] = useState<number[]>([]);
  const [conexoes, setConexoes] = useState<'seguidores' | 'seguindo' | null>(null);
  const [denunciando, setDenunciando] = useState(false);   // o menu de denunciar e bloquear este perfil
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
  const arroba = perfil ? perfil.arroba ?? arrobaDe(nome) : '';
  const posts = lista.itens;
  /* a galeria: as fotos e os vídeos das publicações, na ordem delas */
  const galeria = posts.flatMap((p) => p.midia ?? []);
  const mascote = mascoteDe(perfil?.mascote);
  const comPe = !!perfil && !perfil.voce;
  const voltar = () => { if (conexoes) setConexoes(null); else if (pilha.length) setPilha((p) => p.slice(0, -1)); else aoFechar(); };
  const abrirOutro = (outro: number) => { setConexoes(null); setPilha((p) => [...p, outro]); };
  const compartilhar = async () => {
    try {
      await Share.share({ message: `Conheça ${nome} (@${arroba}) no RONDO. Compita com quem você foi ontem.` });
    } catch {
      avisar('Compartilhar não está disponível neste aparelho.');
    }
  };

  /* as etiquetas ao lado da foto */
  const etiquetas: { icone: NomeIcone; texto: string }[] = [];
  if (perfil?.verificado) etiquetas.push({ icone: 'verificado', texto: 'Verificado' });
  if (perfil?.selo) etiquetas.push({ icone: 'medalha', texto: perfil.selo });
  if (mascote) etiquetas.push({ icone: 'estrela', texto: `${perfil?.mascote_nome || mascote.nome} · ${mascote.raridade.nome}` });

  return (
    <Modal visible animationType="none" onRequestClose={voltar} statusBarTranslucent>
      <DeslizarParaVoltar aoVoltar={voltar}>
      <View style={st.tela}>
        <View style={st.coluna}>
          <ScrollView key={atual} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + (comPe ? ALTURA_PE + 40 : 32) }}>
            <CapaPerfil capa={perfil?.capa} altura={ALTURA_CAPA + insets.top} />

            <View style={st.corpo}>
              {/* a foto encostada na borda de baixo da capa e, à direita, as etiquetas */}
              <View style={st.linhaFoto}>
                <View style={st.anel}>
                  <Avatar nome={nome || ' '} tamanho={FOTO} foto={perfil?.foto ?? undefined} />
                </View>
                <View style={st.etiquetas}>
                  {etiquetas.map((e) => (
                    <View key={e.texto} style={st.etiqueta}>
                      <Icone nome={e.icone} tamanho={14} cor={cores.texto} />
                      <T tam={12.5} peso="400" linhas={1} style={{ flexShrink: 1 }}>{e.texto}</T>
                    </View>
                  ))}
                </View>
              </View>

              <T tam={24} peso="500" linhas={2} style={{ marginTop: 12, letterSpacing: -0.5 }}>{nome || (erro ? 'Perfil' : ' ')}</T>
              {arroba ? <T tam={13.5} cor={cores.texto3} style={{ marginTop: 2 }}>@{arroba}</T> : null}
              {perfil?.bio ? <T tam={14} cor={cores.texto2} style={{ marginTop: 8, lineHeight: 21 }}>{perfil.bio}</T> : null}

              {/* os números em chips: seguidores e seguindo abrem a lista */}
              <View style={st.chips}>
                <Chip icone="grade" texto={`${fmt(perfil?.posts ?? 0)} ${perfil?.posts === 1 ? 'publicação' : 'publicações'}`} />
                <Chip
                  icone="social" texto={`${fmt(perfil?.seguidores ?? 0)} ${perfil?.seguidores === 1 ? 'seguidor' : 'seguidores'}`}
                  rotulo={`Ver quem segue ${primeiro}`} aoPressionar={perfil ? () => setConexoes('seguidores') : undefined}
                />
                <Chip
                  icone="perfil" texto={`${fmt(perfil?.seguindo_n ?? 0)} seguindo`}
                  rotulo={`Ver quem ${primeiro} segue`} aoPressionar={perfil ? () => setConexoes('seguindo') : undefined}
                />
              </View>

              {galeria.length ? (
                <>
                  <T tam={15} peso="400" cor={cores.texto3} style={st.secao}>Galeria</T>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.carrossel} contentContainerStyle={st.carrosselMiolo}>
                    {galeria.map((m, i) => <Miniatura key={`${m.id}-${i}`} midia={m} aoPressionar={() => aoAbrirMidia(galeria, i)} />)}
                  </ScrollView>
                </>
              ) : null}

              {perfil?.clubes?.length ? (
                <>
                  <T tam={15} peso="400" cor={cores.texto3} style={st.secao}>Clubes</T>
                  <View style={{ gap: 8 }}>
                    {perfil.clubes.map((c) => (
                      <Pressable
                        key={c.id} accessibilityRole="button" accessibilityLabel={`Abrir o clube ${c.nome}`} disabled={!aoAbrirClube}
                        onPress={() => aoAbrirClube?.(c.id)}
                        style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [st.clube, (hovered || pressed) && { backgroundColor: cores.cartao2 }]}
                      >
                        <View style={st.clubeIcone}><Icone nome="grupo" tamanho={18} cor={cores.texto} /></View>
                        <T tam={15} peso="400" linhas={1} style={{ flex: 1 }}>{c.nome}</T>
                        {aoAbrirClube ? <Icone nome="setaDireita" tamanho={16} cor={cores.texto3} /> : null}
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <T tam={15} peso="400" cor={cores.texto3} style={st.secao}>Publicações</T>
              {posts.length ? (
                <View style={{ gap: 14 }}>
                  {posts.map((p) => <CartaoPost key={p.id} post={p} timeline aoAbrirMidia={aoAbrirMidia} aoApagar={(pid) => lista.mudar((l) => l.filter((x) => x.id !== pid))} aoBloquear={() => voltar()} />)}
                  {lista.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais" aoPressionar={lista.maisItens} carregando={lista.carregando} /> : null}
                </View>
              ) : (
                <Cartao><T tam={14} style={{ lineHeight: 20 }}>{erro || lista.erro || (lista.carregando || !perfil ? 'Carregando...' : `${nome} ainda não publicou nada.`)}</T></Cartao>
              )}
            </View>
          </ScrollView>

          {/* voltar e "...", fixos por cima da capa (o "..." denuncia ou bloqueia) */}
          <View pointerEvents="box-none" style={[st.topo, { top: insets.top + 8 }]}>
            <BotaoRedondo icone="voltar" rotulo="Voltar" aoPressionar={voltar} />
            {perfil && !perfil.voce ? <BotaoRedondo icone="pontos" rotulo={`Denunciar ou bloquear ${nome}`} aoPressionar={() => setDenunciando(true)} /> : null}
          </View>

          {/* o pé: Compartilhar e Seguir, fixos (sem eles no seu próprio perfil) */}
          {comPe && perfil ? (
            <View pointerEvents="box-none" style={[st.pe, { paddingBottom: insets.bottom + 12 }]}>
              {/* um véu do fundo atrás dos botões, para eles não brigarem com as fotos que passam por baixo */}
              <LinearGradient pointerEvents="none" colors={['transparent', cores.fundo, cores.fundo]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
              <Vidro interativo style={[st.peBotao, st.peSecundario]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Compartilhar o perfil de ${nome}`} onPress={compartilhar} style={({ pressed }) => [st.peToque, pressed && { opacity: 0.8 }]}>
                  <Icone nome="compartilhar" tamanho={18} cor={cores.texto} />
                  <T tam={16} peso="500">Compartilhar</T>
                </Pressable>
              </Vidro>
              <BotaoSeguirGrande pessoa={perfil} aoMudar={(segue) => setPerfil((p) => (p ? { ...p, seguindo: segue, seguidores: Math.max(0, p.seguidores + (segue ? 1 : -1)) } : p))} />
            </View>
          ) : null}
        </View>
      </View>

      <MenuDenunciar
        alvo={denunciando && perfil ? { tipo: 'pessoa', id: perfil.id, pessoa: perfil } : null}
        aoFechar={() => setDenunciando(false)}
        aoEsconder={({ bloqueou }) => { if (bloqueou) voltar(); }}
      />
      {/* a lista de quem segue essa pessoa, ou de quem ela segue: no meio da tela (pedido do dono, nada de baixo para cima) */}
      <Janela aberta={conexoes !== null} aoFechar={() => setConexoes(null)} titulo={conexoes === 'seguidores' ? `Seguidores de ${primeiro}` : `Quem ${primeiro} segue`}>
        {pessoas.itens.length ? (
          <View style={{ gap: 14 }}>
            {pessoas.itens.map((n) => (
              <View key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  accessibilityRole="button" accessibilityLabel={`Abrir o perfil de ${n.nome}`} disabled={n.voce}
                  onPress={() => abrirOutro(n.id)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}
                >
                  <Avatar nome={n.nome} voce={n.voce} foto={n.foto ?? undefined} />
                  <View style={{ flex: 1 }}>
                    <T tam={15} linhas={1}>{n.voce ? `${n.nome} (você)` : n.nome}</T>
                    {n.arroba ? <T tam={12.5} linhas={1} cor={cores.texto3}>@{n.arroba}</T> : null}
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
      </Janela>
      </DeslizarParaVoltar>
    </Modal>
  );
}

export function Chip({ icone, texto, rotulo, aoPressionar }: { icone: NomeIcone; texto: string; rotulo?: string; aoPressionar?: () => void }) {
  const miolo = (
    <>
      <Icone nome={icone} tamanho={15} cor={cores.texto} />
      <T tam={13} peso="400" linhas={1}>{texto}</T>
    </>
  );
  if (!aoPressionar) return <View style={st.chip}>{miolo}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={rotulo ?? texto} onPress={aoPressionar} hitSlop={4}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.chip, (pressed || hovered) && { backgroundColor: cores.cartao2 }]}>
      {miolo}
    </Pressable>
  );
}

/* uma foto (ou vídeo) da galeria, com o canto bem arredondado */
export function Miniatura({ midia, aoPressionar }: { midia: Midia; aoPressionar: () => void }) {
  const uri = useUriMidia(midia.id, midia.url);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={midia.tipo === 'video' ? 'Abrir o vídeo' : 'Abrir a foto'} onPress={aoPressionar} style={({ pressed }) => [st.miniatura, pressed && { opacity: 0.85 }]}>
      {uri && midia.tipo === 'imagem' ? (
        <Image source={{ uri }} resizeMode="cover" accessibilityIgnoresInvertColors style={StyleSheet.absoluteFill} />
      ) : (
        <View style={st.miniaturaVazia}><Icone nome={midia.tipo === 'video' ? 'video' : 'imagem'} tamanho={28} cor={cores.texto3} /></View>
      )}
      {midia.tipo === 'video' ? <View style={st.play}><Icone nome="tocar" tamanho={16} cor="#ffffff" /></View> : null}
    </Pressable>
  );
}

/* voltar e "...": redondos, de vidro, sobre a capa */
export function BotaoRedondo({ icone, rotulo, aoPressionar }: { icone: NomeIcone; rotulo: string; aoPressionar: () => void }) {
  return (
    <Vidro interativo style={st.redondo}>
      <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={aoPressionar} hitSlop={4} style={({ pressed }) => [st.redondoToque, pressed && { opacity: 0.75 }]}>
        <Icone nome={icone} tamanho={21} cor="#ffffff" />
      </Pressable>
    </Vidro>
  );
}

/* o botão principal do pé: invertido (no escuro, claro com texto escuro; no claro, o contrário) */
/* `aoMudar`: o chip de seguidores acompanha na hora */
function BotaoSeguirGrande({ pessoa, aoMudar }: { pessoa: PerfilPublico; aoMudar: (seguindo: boolean) => void }) {
  const { seguindo, alternar } = useSeguir(pessoa);
  const tocar = () => { aoMudar(!seguindo); void alternar(); };
  return (
    <Vidro interativo tom={cores.texto} style={[st.peBotao, st.pePrincipal]}>
      <Pressable
        accessibilityRole="button" accessibilityState={{ selected: seguindo }}
        accessibilityLabel={seguindo ? `Deixar de seguir ${pessoa.nome}` : `Seguir ${pessoa.nome}`}
        onPress={tocar} style={({ pressed }) => [st.peToque, pressed && { opacity: 0.85 }]}
      >
        {seguindo ? <Icone nome="ok" tamanho={18} cor={cores.fundo} /> : null}
        <T tam={16} peso="500" cor={cores.fundo}>{seguindo ? 'Seguindo' : 'Seguir'}</T>
      </Pressable>
    </Vidro>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax },
  corpo: { paddingHorizontal: 20, marginTop: -FOTO / 2 },
  linhaFoto: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  anel: { borderRadius: (FOTO + 8) / 2, padding: 4, backgroundColor: cores.fundo },
  etiquetas: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, paddingBottom: 6 },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: cores.cartao2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  secao: { marginTop: 26, marginBottom: 12 },
  carrossel: { marginHorizontal: -20 },
  carrosselMiolo: { paddingHorizontal: 20, gap: 12 },
  miniatura: { width: 132, height: 150, borderRadius: 22, overflow: 'hidden', backgroundColor: cores.cartao2 },
  miniaturaVazia: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  play: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  clube: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.cartao },
  clubeIcone: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
  topo: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  redondo: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.32)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  redondoToque: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pe: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 36 },
  peBotao: { flex: 1, height: ALTURA_PE, borderRadius: ALTURA_PE / 2, overflow: 'hidden' },
  peSecundario: { backgroundColor: cores.cartao2, borderWidth: 1, borderColor: cores.linha2 },
  pePrincipal: { backgroundColor: cores.texto },
  peToque: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
}));
