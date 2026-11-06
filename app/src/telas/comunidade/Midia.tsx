/* Fotos e vídeos nas publicações: a grade (1 a 4 itens), a miniatura e o visor em tela cheia, com vídeo e passagem de um para o outro. */
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone } from '../../componentes/Icone';
import { T } from '../../componentes/Ui';
import { useUriMidia } from '../../lib/midia';
import { cores, estilos } from '../../tema';
import type { Midia } from '../../tipos';

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* uma miniatura: a foto, ou um bloco escuro com o play e a duração quando é vídeo */
export function Miniatura({ m, style, aoAbrir, extra }: { m: Midia; style?: StyleProp<ViewStyle>; aoAbrir?: () => void; extra?: number }) {
  const uri = useUriMidia(m.id, m.url);
  return (
    <Pressable
      onPress={aoAbrir}
      disabled={!aoAbrir}
      accessibilityRole="imagebutton"
      accessibilityLabel={m.tipo === 'video' ? 'Abrir vídeo' : 'Abrir foto'}
      style={[st.tile, style]}
    >
      {m.tipo === 'imagem' && uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {m.tipo === 'video' ? (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#161616' }]} />
          <View style={st.centro}>
            <View style={st.play}>
              <Icone nome="tocar" tamanho={22} cor="#ffffff" />
            </View>
          </View>
          {m.duracao ? (
            <View style={st.duracao}>
              <T tam={11} mono cor="#ffffff">{mmss(m.duracao)}</T>
            </View>
          ) : null}
        </>
      ) : null}
      {extra ? (
        <View style={st.extra}>
          <T tam={26} peso="200" cor="#ffffff">+{extra}</T>
        </View>
      ) : null}
    </Pressable>
  );
}

/* a grade muda conforme a quantidade: 1 grande, 2 lado a lado, 3 com um destaque, 4 em quadro */
export function MidiaGrade({ itens, aoAbrir }: { itens: Midia[]; aoAbrir: (i: number) => void }) {
  const n = itens.length;
  if (n === 0) return null;
  if (n === 1) {
    const m = itens[0];
    const r = m.largura && m.altura ? Math.min(1.6, Math.max(0.8, m.largura / m.altura)) : 1.25;
    return <Miniatura m={m} aoAbrir={() => aoAbrir(0)} style={{ width: '100%', aspectRatio: r }} />;
  }
  if (n === 2) {
    return (
      <View style={st.linha}>
        {itens.map((m, i) => <Miniatura key={m.id} m={m} aoAbrir={() => aoAbrir(i)} style={{ flex: 1, aspectRatio: 1 }} />)}
      </View>
    );
  }
  if (n === 3) {
    return (
      <View style={[st.linha, { aspectRatio: 1.5 }]}>
        <Miniatura m={itens[0]} aoAbrir={() => aoAbrir(0)} style={{ flex: 2 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Miniatura m={itens[1]} aoAbrir={() => aoAbrir(1)} style={{ flex: 1 }} />
          <Miniatura m={itens[2]} aoAbrir={() => aoAbrir(2)} style={{ flex: 1 }} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 4 }}>
      <View style={st.linha}>
        {itens.slice(0, 2).map((m, i) => <Miniatura key={m.id} m={m} aoAbrir={() => aoAbrir(i)} style={{ flex: 1, aspectRatio: 1.3 }} />)}
      </View>
      <View style={st.linha}>
        {itens.slice(2, 4).map((m, i) => <Miniatura key={m.id} m={m} aoAbrir={() => aoAbrir(i + 2)} style={{ flex: 1, aspectRatio: 1.3 }} />)}
      </View>
    </View>
  );
}

/* ---------- visor em tela cheia ---------- */
function FotoTela({ m }: { m: Midia }) {
  const uri = useUriMidia(m.id, m.url);
  return uri ? <Image source={{ uri }} style={{ flex: 1 }} resizeMode="contain" accessibilityLabel="Foto da publicação" /> : null;
}

function Reprodutor({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; p.play(); });
  return <VideoView player={player} style={{ flex: 1 }} nativeControls contentFit="contain" />;
}

function VideoTela({ m }: { m: Midia }) {
  const uri = useUriMidia(m.id, m.url);
  return uri ? <Reprodutor uri={uri} /> : null;
}

export function VisorMidia({ itens, inicio, aoFechar }: { itens: Midia[]; inicio: number | null; aoFechar: () => void }) {
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  useEffect(() => { if (inicio !== null) setI(inicio); }, [inicio]);
  if (inicio === null || itens.length === 0) return null;
  const pos = Math.min(i, itens.length - 1);
  const m = itens[pos];
  const varios = itens.length > 1;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.visor}>
        <View style={{ flex: 1, paddingVertical: insets.top + 56 }}>
          {m.tipo === 'video' ? <VideoTela key={m.id} m={m} /> : <FotoTela key={m.id} m={m} />}
        </View>
        <View style={[st.topo, { top: insets.top + 10 }]}>
          <T tam={13} mono cor="#ffffff">{varios ? `${pos + 1} / ${itens.length}` : ''}</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} hitSlop={10} style={st.fechar}>
            <Icone nome="fechar" tamanho={22} cor="#ffffff" />
          </Pressable>
        </View>
        {varios ? (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="Anterior" disabled={pos === 0} onPress={() => setI(pos - 1)} style={[st.seta, { left: 10, opacity: pos === 0 ? 0.3 : 1 }]}>
              <Icone nome="voltar" tamanho={22} cor="#ffffff" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Próxima" disabled={pos === itens.length - 1} onPress={() => setI(pos + 1)} style={[st.seta, { right: 10, opacity: pos === itens.length - 1 ? 0.3 : 1 }]}>
              <View style={{ transform: [{ scaleX: -1 }] }}>
                <Icone nome="voltar" tamanho={22} cor="#ffffff" />
              </View>
            </Pressable>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  tile: { borderRadius: 3, overflow: 'hidden', backgroundColor: cores.fundo2, borderWidth: 1, borderColor: cores.linha },
  linha: { flexDirection: 'row', gap: 4 },
  centro: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  play: { width: 48, height: 48, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: `rgba(${cores.tom},0.85)` },
  duracao: { position: 'absolute', right: 8, bottom: 8, paddingVertical: 3, paddingHorizontal: 7, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)' },
  extra: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,5,7,0.6)' },
  visor: { flex: 1, backgroundColor: 'rgba(3,2,8,0.97)' },
  topo: { position: 'absolute', left: 20, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fechar: { width: 44, height: 44, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  seta: { position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
}));
