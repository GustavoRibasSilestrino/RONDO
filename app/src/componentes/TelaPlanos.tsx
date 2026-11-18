/* A tela de planos (pedido do dono, 2026-11-18, inspirada numa referência): tela cheia escura com a luz roxa, o RONDO PRO no alto,
   um gráfico da constância subindo semana a semana (a promessa do app: vencer quem você foi ontem), o que o PRO inclui e os dois
   planos, mensal e anual, para escolher. AINDA SEM PAGAMENTO: o botão de assinar só avisa que a assinatura ainda não abriu; nada é
   cobrado. Os preços são os do site (vitrine/src/components/Sections.tsx). Fecha no X, no voltar do Android ou deslizando para a
   direita. */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as Degrade, Line, Path, Stop } from 'react-native-svg';
import { larguraMax, cores, estilos } from '../tema';
import { DeslizarParaVoltar } from './Deslizar';
import { useAviso } from './Estrutura';
import { FundoCena } from './FundoCena';
import { Icone, NomeIcone } from './Icone';
import { NomeMarca } from './Marca';
import { Botao, T } from './Ui';

type Plano = 'mensal' | 'anual';
const PRECOS = { mensal: 'R$ 49,90', anual: 'R$ 399,00', anualCheio: 'R$ 598,80', anualPorMes: 'R$ 33,25/mês' };

/* o que o PRO inclui (2026-11-18, pedido do dono: benefícios mais fortes). O que ainda não existe no app está marcado "em breve" */
const INCLUI: { icone: NomeIcone; texto: string }[] = [
  { icone: 'verificado', texto: 'Selo de verificado no seu perfil' },
  { icone: 'ia', texto: 'RONDO AI monta e ajusta o seu treino e a sua dieta (em breve)' },
  { icone: 'evolucao', texto: 'Estatísticas completas e o seu progresso semana a semana' },
  { icone: 'recado', texto: 'Recados para o futuro sem limite' },
  { icone: 'grupo', texto: 'Clubes VIP e o seu clube em destaque na busca' },
  { icone: 'trofeu', texto: 'Ranking com prêmios e medalhas exclusivas (em breve)' },
  { icone: 'camera', texto: 'Análise da execução com a câmera sem limite' },
];

/* a curva da constância: sobe aos poucos, com degraus, como a vida real (não uma reta perfeita) */
const PONTOS = [0.18, 0.22, 0.2, 0.31, 0.36, 0.34, 0.46, 0.52, 0.5, 0.63, 0.72, 0.86];

function Grafico({ largura }: { largura: number }) {
  const alt = 170, px = 14, topo = 28, base = alt - 26;
  const x = (i: number) => px + (i * (largura - px * 2)) / (PONTOS.length - 1);
  const y = (v: number) => base - v * (base - topo);
  /* uma curva suave passando pelos pontos (Catmull-Rom para Bézier) */
  const P = PONTOS.map((v, i) => [x(i), y(v)] as const);
  const n = P.length;
  let d = `M${P[0][0]} ${P[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(n - 1, i + 2)];
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
  }
  const fim = PONTOS.length - 1;
  return (
    <View accessible accessibilityLabel="Gráfico: a sua constância subindo ao longo de 12 semanas">
      <Svg width={largura} height={alt}>
        <Defs>
          <Degrade id="linhaPro" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8b5cf6" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#c4a8ff" />
          </Degrade>
        </Defs>
        {[0.33, 0.66].map((f) => <Line key={f} x1={px} x2={largura - px} y1={topo + f * (base - topo)} y2={topo + f * (base - topo)} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />)}
        <Path d={d} stroke="url(#linhaPro)" strokeWidth={4} fill="none" strokeLinecap="round" />
        <Circle cx={x(0)} cy={y(PONTOS[0])} r={6} fill="#8b5cf6" />
        <Circle cx={x(fim)} cy={y(PONTOS[fim])} r={14} fill="rgba(196,168,255,0.18)" />
        <Circle cx={x(fim)} cy={y(PONTOS[fim])} r={7} fill="#c4a8ff" />
      </Svg>
      <View style={[st.rotuloGrafico, { left: px, top: y(PONTOS[0]) - 34 }]}><T tam={12.5} peso="500">Você hoje</T></View>
      <View style={[st.rotuloGrafico, { right: px, top: y(PONTOS[fim]) - 40 }]}><T tam={12.5} peso="500" cor={cores.destaque2}>Você em 12 semanas</T></View>
      <View style={st.eixo}>
        <T tam={11.5} cor={cores.texto3}>Semana 1</T>
        <T tam={11.5} cor={cores.texto3}>Semana 6</T>
        <T tam={11.5} cor={cores.texto3}>Semana 12</T>
      </View>
    </View>
  );
}

export function TelaPlanos({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const avisar = useAviso();
  const [plano, setPlano] = useState<Plano>('anual');
  const coluna = Math.min(width, larguraMax) - 40;

  const Cartao = ({ id, titulo, preco, sub, riscado, selo }: { id: Plano; titulo: string; preco: string; sub?: string; riscado?: string; selo?: string }) => {
    const ativo = plano === id;
    return (
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: ativo }} accessibilityLabel={`${titulo}: ${preco}${sub ? `, ${sub}` : ''}`} onPress={() => setPlano(id)}
        style={[st.plano, ativo && st.planoAtivo]}>
        {selo ? <View style={st.selo}><T tam={10.5} peso="500" cor="#ffffff" style={{ letterSpacing: 0.8 }}>{selo}</T></View> : null}
        <T tam={12} peso="500" cor={ativo ? cores.destaque2 : cores.texto3} style={{ letterSpacing: 1.6 }}>{titulo}</T>
        {riscado ? <T tam={12.5} cor={cores.texto3} style={{ textDecorationLine: 'line-through', marginTop: 4 }}>{riscado}</T> : <View style={{ height: 22 }} />}
        <T tam={24} peso="500" style={{ marginTop: 2 }}>{preco}</T>
        <T tam={12.5} cor={ativo ? cores.destaque2 : cores.texto3} style={{ minHeight: 18 }}>{sub ?? 'por mês'}</T>
        <View style={[st.marca, ativo && st.marcaAtiva]}>{ativo ? <Icone nome="ok" tamanho={13} cor="#ffffff" espessura={2.6} /> : null}</View>
      </Pressable>
    );
  };

  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.tela}>
        <FundoCena cena="picos" />
        <DeslizarParaVoltar aoVoltar={aoFechar}>
          <View style={[st.coluna, { paddingTop: insets.top + 8 }]}>
            <View style={st.topo}>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} hitSlop={4} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.fechar, (pressed || hovered) && { backgroundColor: cores.cartao2 }]}>
                <Icone nome="fechar" tamanho={20} cor={cores.texto} />
              </Pressable>
              <View style={st.titulo} pointerEvents="none">
                <NomeMarca altura={20} cor="#ffffff" />
                <T tam={20} peso="500" cor={cores.destaque2} style={{ letterSpacing: 1 }}>PRO</T>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
              <T tam={15} style={{ fontStyle: 'italic', marginTop: 6 }} cor={cores.texto2}>Cada semana um pouco melhor que a outra</T>
              <View style={{ marginTop: 8 }}><Grafico largura={coluna} /></View>

              <T tam={26} peso="500" centro style={{ marginTop: 18, letterSpacing: -0.4 }}>Vença quem você foi ontem</T>
              <T tam={14.5} centro cor={cores.texto2} style={{ marginTop: 6, lineHeight: 21 }}>Treino, dieta e recados conectados, para você evoluir no seu ritmo.</T>

              <View style={{ gap: 10, marginTop: 20 }}>
                {INCLUI.map((i) => (
                  <View key={i.texto} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={st.inclui}><Icone nome={i.icone} tamanho={16} cor={cores.destaque2} /></View>
                    <T tam={14} style={{ flex: 1 }}>{i.texto}</T>
                  </View>
                ))}
              </View>

              <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 12, marginTop: 26 }}>
                <Cartao id="mensal" titulo="MENSAL" preco={PRECOS.mensal} />
                <Cartao id="anual" titulo="ANUAL" preco={PRECOS.anual} riscado={PRECOS.anualCheio} sub={PRECOS.anualPorMes} selo="ECONOMIZE 33%" />
              </View>

              <Botao
                titulo={plano === 'anual' ? 'Assinar o anual' : 'Assinar o mensal'}
                icone="estrela"
                aoPressionar={() => avisar('A assinatura do PRO ainda não abriu. Nada foi cobrado: avisamos quando estiver disponível.')}
                style={{ alignSelf: 'stretch', marginTop: 22 }}
              />
              <T tam={12.5} centro cor={cores.texto3} style={{ marginTop: 10 }}>Cancele quando quiser. Ainda não há cobrança: os planos abrem em breve.</T>
            </ScrollView>
          </View>
        </DeslizarParaVoltar>
      </View>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax, alignSelf: 'center' },
  topo: { height: 52, justifyContent: 'center', paddingHorizontal: 10 },
  fechar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao, zIndex: 1 },
  titulo: { position: 'absolute', left: 60, right: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  rotuloGrafico: { position: 'absolute', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(14,11,22,0.7)', borderWidth: 1, borderColor: cores.linha },
  eixo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, marginTop: -16 },
  inclui: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,92,246,0.16)' },
  plano: { flex: 1, alignItems: 'center', paddingTop: 22, paddingBottom: 16, paddingHorizontal: 10, borderRadius: 22, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  planoAtivo: { borderColor: cores.acao, borderWidth: 1.5, backgroundColor: 'rgba(124,58,237,0.14)' },
  selo: { position: 'absolute', top: -12, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: cores.acao },
  marca: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: cores.linha2, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  marcaAtiva: { backgroundColor: cores.acao, borderColor: cores.acao },
}));
