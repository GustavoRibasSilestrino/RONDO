/* Peças em pixel art para o mundo dos mascotes dentro do app (desde 2026-11-19, pedido do dono): o mesmo desenho da loja do
   site (vitrine/src/styles/loja.css): noite roxa, moldura de madeira em degraus, botão amarelo de lanterna e a fonte Pixelify
   Sans (tema.ts, FONTE_PIXEL). Nada de canto redondo: a moldura é feita de barras retas com os cantos em dente.
   - PopupPixel: uma janela no MEIO da tela (não sobe de baixo), com título, X e conteúdo que rola se for alto;
   - BotaoPixel: o botão da loja (amarelo, ou escuro para a ação secundária);
   - CampoPixel: campo de texto com a moldura;
   - LapisPixel: o lápis de dar nome aos mascotes (o mesmo desenho do site, components/LojaExtras.tsx);
   - TP: texto na fonte de pixel, já com a cor clara da noite. */
import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FONTE_PIXEL } from '../tema';
import { T } from './Ui';

export const PX = {
  noite: '#1a1035', noite2: '#120a26', tinta: '#fff4dc', tinta2: '#cbb8e8', contorno: '#1b0d06',
  madeira: '#8a4a1c', madeiraClara: '#c47a35', ouro: '#ffc83d', ouroClaro: '#ffd75a', ouroSombra: '#d2921a', ouroLuz: '#ffe9a0',
  roxo: '#33205e', roxoLuz: '#4d3489', roxoSombra: '#241446', verde: '#5fe08a', erro: '#ffc2bc', erroFundo: 'rgba(224,82,79,0.16)', erroBorda: '#e0524f',
} as const;

type TPProps = React.ComponentProps<typeof T>;
/* texto de pixel: claro por padrão (os popups são escuros) */
export const TP = ({ cor = PX.tinta, ...resto }: TPProps) => <T pixel cor={cor} {...resto} />;

/* ---------- a moldura: um retângulo com os cantos em dente (duas barras cruzadas da mesma cor) ---------- */
export function Moldura({ cor, b = 4, children, style }: { cor: string; b?: number; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ padding: b }, style]}>
      <View pointerEvents="none" style={{ position: 'absolute', left: b, right: b, top: 0, bottom: 0, backgroundColor: cor }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: b, bottom: b, backgroundColor: cor }} />
      {children}
    </View>
  );
}

/* um desenho de pixel a partir de um mapa de letras (cada letra, uma cor; ponto = vazio) */
export function Pixels({ mapa, cores, tamanho }: { mapa: string[]; cores: Record<string, string>; tamanho: number }) {
  const caminhos: Record<string, string> = {};
  mapa.forEach((linha, y) => [...linha].forEach((c, x) => { if (cores[c]) caminhos[c] = `${caminhos[c] ?? ''}M${x} ${y}h1v1h-1z`; }));
  return (
    <Svg width={tamanho} height={(tamanho * mapa.length) / mapa[0].length} viewBox={`0 0 ${mapa[0].length} ${mapa.length}`}>
      {Object.entries(caminhos).map(([c, d]) => <Path key={c} d={d} fill={cores[c]} />)}
    </Svg>
  );
}

const LAPIS_MAPA = [
  '............KK..', '...........KPPK.', '..........KPPPK.', '.........KMPPK..', '........KYMMK...', '.......KYYyK....', '......KYYyK.....', '.....KYYyK......',
  '....KYYyK.......', '...KYYyK........', '..KWYyK.........', '..KWWK..........', '.KGWK...........', '.KGK............', '.KK.............', '................',
];
const LAPIS_CORES = { K: '#1b0d06', Y: '#ffc83d', y: '#d2921a', P: '#ff8fa3', M: '#c9c4da', W: '#f6dfb8', G: '#4d3489' };
export const LapisPixel = ({ tamanho = 48 }: { tamanho?: number }) => <Pixels mapa={LAPIS_MAPA} cores={LAPIS_CORES} tamanho={tamanho} />;

const X_MAPA = ['X.....X', '.X...X.', '..X.X..', '...X...', '..X.X..', '.X...X.', 'X.....X'];
const ESTRELA_MAPA = ['....X....', '...XXX...', '...XXX...', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '.XXXXXXX.', '.XXX.XXX.', 'XX.....XX'];
export const EstrelasPixel = ({ n, cor, tamanho = 11 }: { n: number; cor: string; tamanho?: number }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {Array.from({ length: n }, (_, i) => <Pixels key={i} mapa={ESTRELA_MAPA} cores={{ X: cor }} tamanho={tamanho} />)}
  </View>
);

/* ---------- o botão da loja ---------- */
type BotaoPixelProps = { titulo: string; aoPressionar: () => void; tipo?: 'ouro' | 'escuro'; desabilitado?: boolean; carregando?: boolean; style?: StyleProp<ViewStyle> };
export function BotaoPixel({ titulo, aoPressionar, tipo = 'ouro', desabilitado, carregando, style }: BotaoPixelProps) {
  const inativo = !!desabilitado || !!carregando;
  const c = desabilitado
    ? { face: '#5d5078', luz: '#75689a', sombra: '#43385a', texto: '#ddd3ef' }
    : tipo === 'ouro' ? { face: PX.ouro, luz: PX.ouroLuz, sombra: PX.ouroSombra, texto: '#2a1505' } : { face: PX.roxo, luz: PX.roxoLuz, sombra: PX.roxoSombra, texto: PX.tinta };
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={titulo} accessibilityState={{ disabled: inativo, busy: !!carregando }}
      disabled={inativo} onPress={aoPressionar}
      style={({ pressed }) => [{ alignSelf: 'stretch', transform: [{ translateY: pressed ? 3 : 0 }] }, style]}
    >
      {({ pressed }) => (
        <>
          <Moldura cor={PX.contorno}>
            <View style={{ backgroundColor: c.face, minHeight: 44, justifyContent: 'center' }}>
              {/* o fio de luz em cima e o de sombra embaixo trocam de lugar ao apertar */}
              <View style={{ height: 4, backgroundColor: pressed ? c.sombra : c.luz }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9 }}>
                {carregando ? <ActivityIndicator size="small" color={c.texto} /> : null}
                <T pixel peso="500" tam={15} cor={c.texto} centro style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>{titulo}</T>
              </View>
              <View style={{ height: 4, backgroundColor: pressed ? c.luz : c.sombra }} />
            </View>
          </Moldura>
          {/* a sombra dura embaixo, que some quando o botão afunda */}
          <View style={{ height: 5, marginHorizontal: 4, backgroundColor: pressed ? 'transparent' : 'rgba(0,0,0,0.42)' }} />
        </>
      )}
    </Pressable>
  );
}

/* ---------- campo de texto com moldura ---------- */
export function CampoPixel({ style, ...resto }: TextInputProps) {
  return (
    <Moldura cor={PX.roxoLuz}>
      <TextInput
        placeholderTextColor="#9d8fc0" selectionColor={PX.ouro}
        {...resto}
        style={[{ minHeight: 46, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#0d0719', color: PX.tinta, fontFamily: FONTE_PIXEL.normal, fontSize: 18 }, { outlineStyle: 'none' } as object, style]}
      />
    </Moldura>
  );
}

/* um aviso de erro dentro do popup */
export function ErroPixel({ texto }: { texto: string }) {
  if (!texto) return null;
  return (
    <Moldura cor={PX.erroBorda} b={3}>
      <View accessibilityRole="alert" style={{ backgroundColor: '#3a1420', paddingHorizontal: 10, paddingVertical: 8 }}>
        <TP tam={14.5} cor={PX.erro}>{texto}</TP>
      </View>
    </Moldura>
  );
}

/* ---------- a janela, no meio da tela ---------- */
export function PopupPixel({ aberto, aoFechar, titulo, children, largura = 380 }: { aberto: boolean; aoFechar: () => void; titulo?: string; children: React.ReactNode; largura?: number }) {
  const { width, height } = useWindowDimensions();
  return (
    <Modal visible={aberto} transparent animationType="fade" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.fundo}>
        {/* tocar fora fecha */}
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} style={StyleSheet.absoluteFill} />
        <View style={{ width: Math.min(largura, width - 28), maxHeight: height - 60 }}>
          <Moldura cor={PX.contorno} b={5} style={{ flexShrink: 1 }}>
            <Moldura cor={PX.madeiraClara} b={5} style={{ flexShrink: 1 }}>
              <View accessibilityViewIsModal style={st.janela}>
                <View style={st.topo}>
                  <TP tam={21} peso="500" cor={PX.ouroClaro} style={{ flex: 1 }} linhas={2}>{titulo ?? ''}</TP>
                  <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} hitSlop={10} style={({ pressed }) => [st.x, pressed && { opacity: 0.6 }]}>
                    <Pixels mapa={X_MAPA} cores={{ X: PX.tinta2 }} tamanho={16} />
                  </Pressable>
                </View>
                <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  {children}
                </ScrollView>
              </View>
            </Moldura>
          </Moldura>
          {/* a sombra dura da loja, embaixo da janela */}
          <View style={{ height: 8, marginHorizontal: 10, backgroundColor: 'rgba(0,0,0,0.45)' }} />
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  fundo: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,5,24,0.78)' },
  janela: { backgroundColor: PX.noite, flexShrink: 1 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 6, paddingTop: 10, paddingBottom: 8 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
