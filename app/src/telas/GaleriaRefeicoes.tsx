/* "Ver refeições" (o + da Dieta; pedido do dono, 2026-11-18): um painel grande de vidro desfocado que quase ocupa a tela toda, com
   uma margem fina em volta. Em cima, o calendário do mês com a foto do prato embaixo de cada dia (a mais recente do dia); tocando num
   dia, aparecem as refeições dele, com as calorias e as fotos. Embaixo, os pratos em destaque: as últimas fotos tiradas, em grade
   (tocar leva ao dia). Fecha no X, tocando na margem, no voltar do Android ou deslizando para a direita. No computador, fica na
   coluna do conteúdo. Abre crescendo de leve; fecha mais rápido do que abre; parado para quem pede menos movimento. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeslizarParaVoltar } from '../componentes/Deslizar';
import { Icone } from '../componentes/Icone';
import { GradeMes } from '../componentes/SeletorData';
import { T } from '../componentes/Ui';
import { REFEICOES } from '../dados';
import { useLoja } from '../estado/loja';
import { useColuna } from '../lib/coluna';
import { dataCurta, doIso, fmt, iso } from '../lib/datas';
import { useLayoutLargo } from '../lib/largura';
import { useUriMidia } from '../lib/midia';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, estilos, VIDRO } from '../tema';
import type { TipoRefeicao } from '../tipos';

const nativo = Platform.OS !== 'web';
const MARGEM = 8;   // a margem fina em volta do painel

type Foto = { dia: string; refeicao: TipoRefeicao; id: string; quando: number };

export function GaleriaRefeicoes({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { estado } = useLoja();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { largo } = useLayoutLargo();
  const coluna = useColuna();
  const reduzido = useMovimentoReduzido();
  const hoje = iso();
  const [dia, setDia] = useState(hoje);
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const rolagem = useRef<React.ElementRef<typeof ScrollView>>(null);

  const [visivel, setVisivel] = useState(aberto);
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (aberto) { setVisivel(true); setDia(hoje); const d = new Date(); setMes(new Date(d.getFullYear(), d.getMonth(), 1)); }
    if (reduzido) { v.setValue(aberto ? 1 : 0); if (!aberto) setVisivel(false); return; }
    const anim = aberto
      ? Animated.timing(v, { toValue: 1, duration: 240, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: nativo })
      : Animated.timing(v, { toValue: 0, duration: 150, easing: Easing.in(Easing.cubic), useNativeDriver: nativo });
    anim.start(({ finished }) => { if (finished && !aberto) setVisivel(false); });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, reduzido, v]);

  /* todas as fotos de refeição, da mais nova para a mais antiga */
  const fotos: Foto[] = Object.entries(estado.fotosRefeicao ?? {})
    .flatMap(([d, porRefeicao]) => Object.entries(porRefeicao ?? {}).filter(([, f]) => !!f).map(([r, f]) => ({ dia: d, refeicao: r as TipoRefeicao, id: f!.id, quando: f!.quando })))
    .sort((a, b) => b.quando - a.quando);
  const fotoDoDia = (d: string) => fotos.find((f) => f.dia === d)?.id;
  const destaques = fotos.slice(0, 12);

  /* as refeições do dia escolhido */
  const itens = estado.refeicoes[dia] ?? [];
  const doDia = REFEICOES.map((r) => {
    const lista = itens.filter((x) => x.refeicao === r.id);
    return { ...r, kcal: lista.reduce((t, x) => t + x.kcal, 0), alimentos: lista.map((x) => x.alimento), foto: estado.fotosRefeicao?.[dia]?.[r.id]?.id };
  }).filter((r) => r.alimentos.length || r.foto);
  const totalDia = doDia.reduce((t, r) => t + r.kcal, 0);
  const rotuloDia = dia === hoje ? 'Hoje' : dataCurta(dia);

  /* o tamanho: quase a tela toda; no computador, só a coluna do conteúdo */
  const caixa = largo && coluna ? { left: coluna.x + MARGEM, width: coluna.w - MARGEM * 2 } : { left: MARGEM, right: MARGEM };
  const colunas = (largo && coluna ? coluna.w : width) >= 700 ? 4 : 3;

  return (
    <Modal visible={visivel} transparent animationType="none" onRequestClose={aoFechar} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, st.veu, { opacity: v }]}>
        <Pressable accessibilityLabel="Fechar as refeições" onPress={aoFechar} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          st.painel, caixa,
          { top: insets.top + MARGEM, bottom: insets.bottom + MARGEM, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] },
        ]}
      >
        <DeslizarParaVoltar aoVoltar={aoFechar}>
          <View style={st.topo}>
            <T tam={18} peso="500" style={{ flex: 1 }}>Refeições</T>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} hitSlop={4}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.fechar, (pressed || hovered) && { backgroundColor: cores.cartao2 }]}>
              <Icone nome="fechar" tamanho={18} cor={cores.texto} />
            </Pressable>
          </View>

          <ScrollView ref={rolagem} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 28, gap: 18 }}>
            <View style={st.bloco}>
              <GradeMes mes={mes} aoMudarMes={setMes} valor={dia} aoEscolher={setDia} fotoDoDia={fotoDoDia} />
            </View>

            {/* o dia escolhido */}
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <T tam={15} peso="500">{rotuloDia}</T>
                {totalDia ? <T tam={13} cor={cores.texto2}>{fmt(totalDia)} kcal</T> : null}
              </View>
              {doDia.length ? doDia.map((r) => (
                <View key={r.id} style={st.refeicao}>
                  <MiniFoto id={r.foto} tamanho={52} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T tam={14.5} peso="500">{r.nome}</T>
                    <T tam={12.5} cor={cores.texto2} linhas={2}>{r.alimentos.length ? r.alimentos.join(', ') : 'Só a foto'}</T>
                  </View>
                  {r.kcal ? <T tam={13} cor={cores.texto2}>{fmt(r.kcal)} kcal</T> : null}
                </View>
              )) : (
                <T tam={13} cor={cores.texto3}>Nada registrado neste dia.</T>
              )}
            </View>

            {/* os pratos em destaque: as últimas fotos */}
            <View style={{ gap: 10 }}>
              <T tam={15} peso="500">Pratos em destaque</T>
              {destaques.length ? (
                <View style={st.grade}>
                  {destaques.map((f) => (
                    <Pressable
                      key={`${f.dia}-${f.refeicao}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${REFEICOES.find((r) => r.id === f.refeicao)?.nome ?? ''} de ${dataCurta(f.dia)}: ver o dia`}
                      onPress={() => { setDia(f.dia); const d = doIso(f.dia); setMes(new Date(d.getFullYear(), d.getMonth(), 1)); rolagem.current?.scrollTo({ y: 0, animated: !reduzido }); }}
                      style={({ pressed }) => [{ width: `${100 / colunas}%` as const, padding: 4 }, pressed && { opacity: 0.8 }]}
                    >
                      <View style={st.destaque}>
                        <MiniFoto id={f.id} preencher />
                        <View style={st.legenda}>
                          <T tam={11.5} peso="500" cor="#ffffff" linhas={1}>{REFEICOES.find((r) => r.id === f.refeicao)?.nome}</T>
                          <T tam={10.5} cor="rgba(255,255,255,0.8)">{dataCurta(f.dia)}</T>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={st.vazio}>
                  <Icone nome="camera" tamanho={20} cor={cores.texto2} />
                  <T tam={13} cor={cores.texto2} style={{ flex: 1, lineHeight: 19 }}>Tire a foto do prato em cada refeição, no ícone da câmera. Elas aparecem aqui e no calendário.</T>
                </View>
              )}
            </View>
          </ScrollView>
        </DeslizarParaVoltar>
      </Animated.View>
    </Modal>
  );
}

function MiniFoto({ id, tamanho, preencher }: { id?: string; tamanho?: number; preencher?: boolean }) {
  const uri = useUriMidia(id ?? '');
  const caixa = preencher ? { width: '100%' as const, aspectRatio: 1 } : { width: tamanho, height: tamanho };
  return (
    <View style={[st.foto, caixa]}>
      {id && uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors /> : <Icone nome="salada" tamanho={preencher ? 26 : 22} cor={cores.texto3} />}
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  veu: { backgroundColor: 'rgba(0,0,0,0.5)' },
  painel: {
    position: 'absolute', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: cores.linha2,
    backgroundColor: 'rgba(22,17,33,0.72)', ...VIDRO, boxShadow: '0 40px 90px -30px rgba(0,0,0,0.95)',
  },
  topo: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 10, height: 60 },
  fechar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bloco: { padding: 12, borderRadius: 22, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.cartao },
  refeicao: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.cartao },
  foto: { borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  destaque: { borderRadius: 16, overflow: 'hidden' },
  legenda: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: 'rgba(0,0,0,0.45)' },
  vazio: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: cores.linha2 },
}));
