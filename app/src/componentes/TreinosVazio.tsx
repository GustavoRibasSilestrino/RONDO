/* O Treino sem nenhum treino salvo (pedido do dono, 2026-11-18): no lugar dos treinos sugeridos, um celular de vidro mostra como
   a lista "Meus treinos" vai ficar, com as linhas de exemplo sumindo para baixo (o celular se dissolve no fundo), e embaixo o
   convite: "Nenhum treino salvo", "Crie treinos para utilizá-los quando quiser." e o botão Novo treino.
   O celular é só ilustração: o leitor de tela pula ele e lê o texto e o botão. */
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { cores, estilos, VIDRO } from '../tema';
import { Icone } from './Icone';
import { Botao, T } from './Ui';

const EXEMPLOS = [
  { nome: 'Peito e tríceps', info: '6 exercícios · 50 min' },
  { nome: 'Costas e bíceps', info: '6 exercícios · 45 min' },
  { nome: 'Pernas', info: '7 exercícios · 55 min' },
  { nome: 'Ombros e abdômen', info: '5 exercícios · 40 min' },
];

/* no navegador, uma máscara apaga o pé do celular; no aparelho, as linhas vão ficando mais claras */
const dissolver = Platform.OS === 'web' ? ({ maskImage: 'linear-gradient(to bottom, #000 45%, transparent 96%)', WebkitMaskImage: 'linear-gradient(to bottom, #000 45%, transparent 96%)' } as object) : null;

export function TreinosVazio({ aoNovo }: { aoNovo: () => void }) {
  return (
    <View style={st.raiz}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[st.janela, dissolver]}>
        <View style={st.celular}>
          <View style={st.ilha} />
          <View style={st.topoCelular}>
            <T tam={9} peso="500">9:41</T>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              <View style={[st.ponto, { width: 12 }]} /><View style={st.ponto} />
            </View>
          </View>
          <T tam={17} peso="500" style={{ marginTop: 14, letterSpacing: -0.3 }}>Meus treinos</T>
          <View style={{ gap: 7, marginTop: 10 }}>
            {EXEMPLOS.map((x, i) => (
              <View key={x.nome} style={[st.exemplo, Platform.OS !== 'web' && { opacity: 1 - i * 0.24 }]}>
                <View style={st.exemploIcone}><Icone nome="halter" tamanho={14} cor="#ffffff" /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T tam={11.5} peso="500" linhas={1}>{x.nome}</T>
                  <T tam={9.5} cor={cores.texto2} linhas={1}>{x.info}</T>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      <T tam={19} peso="500" centro style={{ marginTop: 6, letterSpacing: -0.2 }}>Nenhum treino salvo</T>
      <T tam={14} cor={cores.texto2} centro style={{ marginTop: 6, lineHeight: 20, maxWidth: 280 }}>Crie treinos para utilizá-los quando quiser.</T>
      <Botao icone="mais" titulo="Novo treino" aoPressionar={aoNovo} style={{ marginTop: 18, alignSelf: 'stretch' }} />
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  raiz: { alignItems: 'center', marginTop: 18, paddingHorizontal: 8 },
  janela: { height: 268, width: 210, overflow: 'hidden', alignItems: 'center' },
  celular: {
    width: 196, height: 360, marginTop: 6, borderRadius: 34, padding: 14, paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 5, borderColor: 'rgba(255,255,255,0.9)', ...VIDRO,
    shadowColor: '#2a1650', shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 10 },
  },
  ilha: { position: 'absolute', top: 8, alignSelf: 'center', left: 63, width: 60, height: 16, borderRadius: 8, backgroundColor: '#1e1430' },
  topoCelular: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6, height: 18 },
  ponto: { width: 7, height: 7, borderRadius: 2, backgroundColor: cores.texto },
  exemplo: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 14, backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.linha2 },
  exemploIcone: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
}));
