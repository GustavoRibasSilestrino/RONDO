/* Os treinos como uma pilha de pastas (desde 2026-11-17, a partir de uma referência do dono: pastas empilhadas em perspectiva).
   As pastas são de VIDRO, como o resto do app: brancas translúcidas, com borda clara e um reflexo em cima; as de trás aparecem
   de leve através das da frente. Cada pasta mostra só a aba e uma faixa de cima, com o nome do treino saindo para fora; a da frente
   fica embaixo, à esquerda, e as de trás sobem para a direita.
   Tocar numa pasta faz ela SUBIR (fica escolhida); tocar de novo nela ABRE o treino (`aoAbrir`). Os treinos sugeridos levam o
   selo "SUGESTÃO". Parado para quem pede menos movimento (a pasta sobe sem animação). */
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { Rotina } from '../dados';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores } from '../tema';
import { T } from './Ui';

const TINTA = cores.texto;           // o texto: roxo quase preto
const ROXO = cores.destaqueForte;    // o selo da sugestão e o contorno da pasta escolhida

const ALTURA = 168;     // altura de cada pasta
const ABA = 28;         // altura da aba
const PASSO = 66;       // quanto de cada pasta aparece (a aba e uma faixa do corpo)
const DESLOCA = 10;     // cada pasta de trás anda isto para a direita
const SOBE = 52;        // quanto a pasta escolhida sobe

/* o contorno da pasta: aba à esquerda (com a borda direita inclinada) e o corpo com cantos arredondados */
const contorno = (w: number, h: number, aba: number): string =>
  `M10 1.5 H${aba - 8} Q${aba - 2} 1.5 ${aba + 2} 6 L${aba + 20} ${ABA} H${w - 12} Q${w - 1.5} ${ABA} ${w - 1.5} ${ABA + 10} V${h - 12} Q${w - 1.5} ${h - 1.5} ${w - 12} ${h - 1.5} H12 Q1.5 ${h - 1.5} 1.5 ${h - 12} V12 Q1.5 1.5 10 1.5 Z`;

function Pasta({ rotina, largura, topo, esquerda, escolhida, reduzido, aoTocar }: {
  rotina: Rotina; largura: number; topo: number; esquerda: number; escolhida: boolean; reduzido: boolean; aoTocar: () => void;
}) {
  const sobe = useRef(new Animated.Value(escolhida ? 1 : 0)).current;
  useEffect(() => {
    if (reduzido) { sobe.setValue(escolhida ? 1 : 0); return; }
    Animated.spring(sobe, { toValue: escolhida ? 1 : 0, useNativeDriver: Platform.OS !== 'web', speed: 16, bounciness: 7 }).start();
  }, [escolhida, reduzido, sobe]);
  const aba = Math.min(largura * 0.5, 190);
  const titulo = (rotina.capa ?? rotina.nome).toUpperCase();
  return (
    <Animated.View
      style={{ position: 'absolute', top: topo, left: esquerda, width: largura, height: ALTURA, ...(Platform.OS === 'web' ? ({ filter: 'drop-shadow(0 10px 18px rgba(42,22,80,0.22))' } as object) : null), transform: [{ translateY: sobe.interpolate({ inputRange: [0, 1], outputRange: [0, -SOBE] }) }, { skewY: '-3deg' }] }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: escolhida }}
        accessibilityLabel={`${rotina.nome}${rotina.sugerida ? ', sugestão' : ''}. ${escolhida ? 'Toque de novo para abrir o treino.' : 'Toque para escolher.'}`}
        onPress={aoTocar}
        style={{ width: largura, height: ALTURA }}
      >
        <Svg width={largura} height={ALTURA} style={{ position: 'absolute' }}>
          <Defs>
            {/* o vidro: mais claro em cima (o reflexo), mais transparente embaixo */}
            <LinearGradient id={`vidro-${rotina.id}`} x1="0" y1="0" x2="0.35" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={escolhida ? 0.94 : 0.8} />
              <Stop offset="0.55" stopColor="#ffffff" stopOpacity={escolhida ? 0.86 : 0.66} />
              <Stop offset="1" stopColor="#ede6f7" stopOpacity={escolhida ? 0.82 : 0.6} />
            </LinearGradient>
          </Defs>
          <Path d={contorno(largura, ALTURA, aba)} fill={`url(#vidro-${rotina.id})`} stroke={escolhida ? ROXO : 'rgba(255,255,255,0.95)'} strokeWidth={escolhida ? 2 : 1.5} strokeLinejoin="round" />
        </Svg>
        {/* o nome, na aba (saindo para fora da pilha) */}
        <View style={{ position: 'absolute', left: 14, top: 5, right: largura - aba - 14 }}>
          <T tam={titulo.length > 9 ? 13 : 15} peso="500" cor={TINTA} linhas={1} style={{ letterSpacing: 0.6 }}>{titulo}</T>
        </View>
        {/* na faixa de cima do corpo: quantos exercícios, quanto tempo e o selo da sugestão */}
        <View style={{ position: 'absolute', left: 14, right: 12, top: ABA + 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {escolhida
            ? <T tam={12.5} peso="500" cor={TINTA} style={{ flex: 1 }} linhas={1}>Toque de novo para abrir →</T>
            : <T tam={12.5} cor={TINTA} style={{ flex: 1, opacity: 0.85 }} linhas={1}>{rotina.exercicios.length} exercícios · {rotina.minutos} min</T>}
          {rotina.sugerida ? <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: ROXO }}><T tam={9.5} peso="500" cor="#ffffff" style={{ letterSpacing: 0.8 }}>SUGESTÃO</T></View> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function PilhaPastas({ rotinas, largura, escolhida, aoEscolher, aoAbrir }: {
  rotinas: Rotina[]; largura: number; escolhida: string | null; aoEscolher: (id: string) => void; aoAbrir: (id: string) => void;
}) {
  const reduzido = useMovimentoReduzido();
  const n = rotinas.length;
  const larguraPasta = largura - DESLOCA * Math.max(0, n - 1);
  /* espaço em cima para a pasta subir; a altura total deixa à mostra a pasta da frente inteira */
  const altura = SOBE + PASSO * Math.max(0, n - 1) + ALTURA;
  return (
    <View style={{ width: largura, height: altura, marginTop: 6 }}>
      {rotinas.map((r, i) => (
        <Pasta
          key={r.id}
          rotina={r}
          largura={larguraPasta}
          topo={SOBE + PASSO * i}
          esquerda={DESLOCA * (n - 1 - i)}
          escolhida={r.id === escolhida}
          reduzido={reduzido}
          aoTocar={() => (r.id === escolhida ? aoAbrir(r.id) : aoEscolher(r.id))}
        />
      ))}
    </View>
  );
}
