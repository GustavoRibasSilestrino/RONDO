/* Escolher uma data num calendário (pedido do dono, 2026-11-18): uma janelinha de vidro no MEIO da tela, com o mês, as setas para
   o mês anterior e o seguinte, e os dias. O dia escolhido fica no violeta de ação; hoje tem um contorno; os dias depois de hoje
   ficam apagados (não dá para registrar o futuro). Tocar fora ou no voltar do Android fecha. No computador, centralizada na coluna
   do conteúdo. Abre crescendo de leve (180 ms); parado para quem pede menos movimento. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useUriMidia } from '../lib/midia';
import { useColuna } from '../lib/coluna';
import { diaDaSemana, doIso, iso, mesAno } from '../lib/datas';
import { useLayoutLargo } from '../lib/largura';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, estilos, VIDRO } from '../tema';
import { Icone } from './Icone';
import { T } from './Ui';

const SEMANA = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const nativo = Platform.OS !== 'web';

/* `fotoDoDia`: se houver, a foto daquele dia (o id da mídia) aparece pequenininha embaixo do número (a Dieta usa a foto da refeição) */
export function SeletorData({ aberto, valor, aoEscolher, aoFechar, fotoDoDia }: { aberto: boolean; valor: string; aoEscolher: (dia: string) => void; aoFechar: () => void; fotoDoDia?: (dia: string) => string | undefined }) {
  const hoje = iso();
  const [mes, setMes] = useState(() => { const d = doIso(valor); return new Date(d.getFullYear(), d.getMonth(), 1); });
  useEffect(() => { if (aberto) { const d = doIso(valor); setMes(new Date(d.getFullYear(), d.getMonth(), 1)); } }, [aberto, valor]);
  const reduzido = useMovimentoReduzido();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!aberto) { v.setValue(0); return; }
    if (reduzido) { v.setValue(1); return; }
    Animated.timing(v, { toValue: 1, duration: 180, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: nativo }).start();
  }, [aberto, reduzido, v]);
  const { largo } = useLayoutLargo();
  const coluna = useColuna();

  return (
    <Modal visible={aberto} transparent animationType="none" onRequestClose={aoFechar} statusBarTranslucent>
      <Pressable accessibilityLabel="Fechar o calendário" onPress={aoFechar} style={[StyleSheet.absoluteFill, st.veu]} />
      <View pointerEvents="box-none" style={[st.centro, largo && coluna ? { left: coluna.x, width: coluna.w, right: undefined } : null]}>
        <Animated.View accessibilityRole="none" style={[st.cartao, { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
          <GradeMes mes={mes} aoMudarMes={setMes} valor={valor} aoEscolher={(d) => { aoEscolher(d); aoFechar(); }} fotoDoDia={fotoDoDia} />
          <Pressable accessibilityRole="button" onPress={() => { aoEscolher(hoje); aoFechar(); }} style={st.irHoje} hitSlop={6}>
            <T tam={13.5} peso="500" cor={cores.destaque2}>Ir para hoje</T>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* a grade de um mês: as setas do mês, os dias da semana e os dias (começa na segunda; os futuros apagados; o escolhido no violeta;
   hoje com contorno; e, se houver, a fotinho de cada dia embaixo do número). Usada no calendário acima e em "Ver refeições". */
export function GradeMes({ mes, aoMudarMes, valor, aoEscolher, fotoDoDia }: { mes: Date; aoMudarMes: (m: Date) => void; valor: string; aoEscolher: (dia: string) => void; fotoDoDia?: (dia: string) => string | undefined }) {
  const hoje = iso();
  const vazios = diaDaSemana(mes);
  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celulas: (string | null)[] = [...Array(vazios).fill(null), ...Array.from({ length: diasNoMes }, (_, k) => iso(new Date(mes.getFullYear(), mes.getMonth(), k + 1)))];
  while (celulas.length % 7) celulas.push(null);
  const proximoBloqueado = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 1)) > hoje;
  return (
    <View>
      <View style={st.topo}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" hitSlop={6} onPress={() => aoMudarMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} style={st.seta}>
          <Icone nome="voltar" tamanho={18} cor={cores.texto} />
        </Pressable>
        <T tam={15.5} peso="500">{mesAno(mes).replace(/^./, (c) => c.toUpperCase())}</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" accessibilityState={{ disabled: proximoBloqueado }} disabled={proximoBloqueado} hitSlop={6} onPress={() => aoMudarMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} style={[st.seta, proximoBloqueado && { opacity: 0.3 }]}>
          <Icone nome="setaDireita" tamanho={18} cor={cores.texto} />
        </Pressable>
      </View>
      <View style={st.linha}>
        {SEMANA.map((l, i) => <View key={i} style={[st.celula, { height: 26 }]}><T tam={11.5} cor={cores.texto3}>{l}</T></View>)}
      </View>
      {Array.from({ length: celulas.length / 7 }, (_, sem) => (
        <View key={sem} style={st.linha}>
          {celulas.slice(sem * 7, sem * 7 + 7).map((d, i) => {
            if (!d) return <View key={i} style={st.celula} />;
            const futuro = d > hoje;
            const escolhido = d === valor;
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={d === hoje ? `Hoje, dia ${Number(d.slice(8))}` : `Dia ${Number(d.slice(8))}`}
                accessibilityState={{ selected: escolhido, disabled: futuro }}
                disabled={futuro}
                onPress={() => aoEscolher(d)}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.celula, st.dia, d === hoje && st.hoje, escolhido && st.escolhido, (pressed || hovered) && !escolhido && st.diaSobre, futuro && { opacity: 0.3 }]}
              >
                <T tam={14} peso={escolhido ? '500' : '400'} cor={escolhido ? '#ffffff' : cores.texto}>{Number(d.slice(8))}</T>
                {fotoDoDia ? <MiniFoto id={fotoDoDia(d)} /> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/* a fotinho do dia, embaixo do número (vazia, ocupa o mesmo lugar: os números ficam alinhados) */
function MiniFoto({ id }: { id?: string }) {
  const uri = useUriMidia(id ?? '');
  return (
    <View style={st.mini}>
      {id && uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  veu: { backgroundColor: 'rgba(0,0,0,0.45)' },
  centro: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  cartao: {
    width: '100%', maxWidth: 360, padding: 16, borderRadius: 26, borderWidth: 1, borderColor: cores.linha2,
    backgroundColor: cores.painel, ...VIDRO, boxShadow: '0 30px 70px -24px rgba(0,0,0,0.9)',
  },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  seta: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao },
  linha: { flexDirection: 'row' },
  celula: { flex: 1, height: 54, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dia: { borderRadius: 14, margin: 2 },
  mini: { width: 18, height: 18, borderRadius: 6, overflow: 'hidden' },
  diaSobre: { backgroundColor: cores.cartao2 },
  hoje: { borderWidth: 1, borderColor: cores.destaque2 },
  escolhido: { backgroundColor: cores.acao, borderColor: cores.acao },
  irHoje: { alignSelf: 'center', marginTop: 8, paddingVertical: 8, paddingHorizontal: 12 },
}));
