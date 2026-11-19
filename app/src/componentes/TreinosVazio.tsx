/* O Treino sem nenhum treino salvo (pedido do dono, 2026-11-18): no lugar dos treinos sugeridos, um celular de vidro mostra a pilha
   de pastas de treino igual à do app, em miniatura (pedido do dono, 2026-11-18), com "Meus treinos" em cima e as pastas sumindo para baixo (o celular se dissolve no fundo), e embaixo o
   convite: "Nenhum treino salvo", "Crie treinos para utilizá-los quando quiser." e o botão Novo treino.
   O celular é só ilustração: o leitor de tela pula ele e lê o texto e o botão. */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { cores, estilos, VIDRO } from '../tema';
import { LinearGradient as FundoTela } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { ABA, ALTURA, contorno, DESLOCA, PASSO } from './PilhaPastas';
import { Botao, T } from './Ui';

/* as pastas de exemplo, de trás para a frente, como a pilha da aba (componentes/PilhaPastas.tsx), em miniatura */
const EXEMPLOS = [
  { nome: 'OMBROS', info: '5 exercícios · 40 min' },
  { nome: 'PERNAS', info: '7 exercícios · 55 min' },
  { nome: 'COSTAS', info: '6 exercícios · 45 min' },
  { nome: 'PEITO', info: '6 exercícios · 50 min' },
];
const VIRTUAL = 300;   // a pilha é desenhada nesta largura e reduzida para caber na tela do celular
const MINI = 158;      // a largura útil da tela do celular
const K = MINI / VIRTUAL;

function PastasMini() {
  const n = EXEMPLOS.length;
  const w = VIRTUAL - DESLOCA * (n - 1);
  const aba = Math.min(w * 0.5, 190);
  return (
    <View style={{ width: MINI, height: (PASSO * (n - 1) + ALTURA) * K, marginTop: 12 }}>
      {EXEMPLOS.map((x, i) => (
        <View key={x.nome} style={{ position: 'absolute', top: PASSO * i * K, left: DESLOCA * (n - 1 - i) * K, width: w * K, height: ALTURA * K, transform: [{ skewY: '-3deg' }] }}>
          <Svg width={w * K} height={ALTURA * K} viewBox={`0 0 ${w} ${ALTURA}`} style={{ position: 'absolute' }}>
            <Defs>
              <LinearGradient id={`mini-${i}`} x1="0" y1="0" x2="0.35" y2="1">
                <Stop offset="0" stopColor="#ffffff" stopOpacity={0.14} />
                <Stop offset="0.55" stopColor="#ffffff" stopOpacity={0.09} />
                <Stop offset="1" stopColor="#8b5cf6" stopOpacity={0.1} />
              </LinearGradient>
            </Defs>
            <Path d={contorno(w, ALTURA, aba)} fill={`url(#mini-${i})`} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeLinejoin="round" />
          </Svg>
          <View style={{ position: 'absolute', left: 14 * K, top: 5 * K }}>
            <T tam={8.5} peso="500" style={{ letterSpacing: 0.4 }} linhas={1}>{x.nome}</T>
          </View>
          <View style={{ position: 'absolute', left: 14 * K, top: (ABA + 9) * K }}>
            <T tam={7} cor={cores.texto2} linhas={1}>{x.info}</T>
          </View>
        </View>
      ))}
    </View>
  );
}

/* no navegador, uma máscara apaga o pé do celular; no aparelho, as linhas vão ficando mais claras */
const dissolver = Platform.OS === 'web' ? ({ maskImage: 'linear-gradient(to bottom, #000 45%, transparent 96%)', WebkitMaskImage: 'linear-gradient(to bottom, #000 45%, transparent 96%)' } as object) : null;

export function TreinosVazio({ aoNovo }: { aoNovo: () => void }) {
  return (
    <View style={st.raiz}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[st.janela, dissolver]}>
        <View style={st.celular}>
          {/* a tela do celular com o fundo do app (o mesmo degradê de componentes/FundoCena.tsx) */}
          <FundoTela colors={['#1b1430', '#100c1b', '#08070d']} locations={[0, 0.5, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={st.ilha} />
          <View style={st.topoCelular}>
            <T tam={9} peso="500">9:41</T>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              <View style={[st.ponto, { width: 12 }]} /><View style={st.ponto} />
            </View>
          </View>
          <T tam={17} peso="500" style={{ marginTop: 14, letterSpacing: -0.3 }}>Meus treinos</T>
          <PastasMini />
        </View>
      </View>

      {/* em fonte de pixel art, para conversar com os mascotes e a loja (pedido do dono, 2026-11-19) */}
      <T pixel tam={21} peso="500" centro style={{ marginTop: 6 }}>Nenhum treino salvo</T>
      <T pixel tam={15.5} cor={cores.texto2} centro style={{ marginTop: 6, lineHeight: 21, maxWidth: 290 }}>Crie treinos para utilizá-los quando quiser.</T>
      <Botao icone="mais" titulo="Novo treino" aoPressionar={aoNovo} style={{ marginTop: 18, alignSelf: 'center' }} />
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  raiz: { alignItems: 'center', marginTop: 18, paddingHorizontal: 8 },
  janela: { height: 268, width: 210, overflow: 'hidden', alignItems: 'center' },
  celular: {
    width: 196, height: 360, marginTop: 6, borderRadius: 34, padding: 14, paddingTop: 10, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 5, borderColor: 'rgba(255,255,255,0.16)', ...VIDRO,
    shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
  },
  ilha: { position: 'absolute', top: 8, alignSelf: 'center', left: 63, width: 60, height: 16, borderRadius: 8, backgroundColor: '#000000' },
  topoCelular: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, height: 18 },
  ponto: { width: 7, height: 7, borderRadius: 2, backgroundColor: cores.texto },
}));
