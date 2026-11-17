/* Os treinos como uma pilha de pastas (desde 2026-11-17, a partir de uma referência do dono: pastas empilhadas em perspectiva).
   As pastas são de VIDRO, como o resto do app: brancas translúcidas, com borda clara e um reflexo em cima; as de trás aparecem
   de leve através das da frente. Cada pasta mostra só a aba e uma faixa de cima, com o nome do treino saindo para fora; a da frente
   fica embaixo, à esquerda, e as de trás sobem para a direita.
   Tocar numa pasta faz ela SUBIR (fica escolhida) e a lixeira aparece acima da barra de abas (componentes/Lixeira.tsx); tocar de
   novo nela ABRE o treino (`aoAbrir`). A pasta escolhida pode ser ARRASTADA: só começa depois de 8 px de movimento (o toque e a
   rolagem continuam funcionando); com o dedo sobre a lixeira, ela avisa e o celular vibra de leve; soltando ali, a pasta encolhe
   e cai dentro dela (`aoJogarNaLixeira`); soltando fora, CANCELA: volta ao lugar com mola e desce para a pilha (`aoCancelar`). Os treinos sugeridos levam o selo
   "SUGESTÃO". Parado para quem pede menos movimento (a pasta sobe e some sem animação). */
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { Rotina } from '../dados';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores } from '../tema';
import type { Retangulo } from './Lixeira';
import { T } from './Ui';

const TINTA = cores.texto;           // o texto: roxo quase preto
const ROXO = cores.destaqueForte;    // o selo da sugestão e o contorno da pasta escolhida

const ALTURA = 168;     // altura de cada pasta
const ABA = 28;         // altura da aba
const PASSO = 66;       // quanto de cada pasta aparece (a aba e uma faixa do corpo)
const DESLOCA = 10;     // cada pasta de trás anda isto para a direita
const SOBE = 52;        // quanto a pasta escolhida sobe
const LIMIAR = 8;       // px de movimento antes de o arrasto começar
const FOLGA = 28;       // a lixeira "pega" a pasta um pouco antes da borda dela

const nativo = Platform.OS !== 'web';
const vibrar = (forte: boolean) => {
  if (!nativo) return;
  Haptics.impactAsync(forte ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/* o contorno da pasta: aba à esquerda (com a borda direita inclinada) e o corpo com cantos arredondados */
const contorno = (w: number, h: number, aba: number): string =>
  `M10 1.5 H${aba - 8} Q${aba - 2} 1.5 ${aba + 2} 6 L${aba + 20} ${ABA} H${w - 12} Q${w - 1.5} ${ABA} ${w - 1.5} ${ABA + 10} V${h - 12} Q${w - 1.5} ${h - 1.5} ${w - 12} ${h - 1.5} H12 Q1.5 ${h - 1.5} 1.5 ${h - 12} V12 Q1.5 1.5 10 1.5 Z`;

type Arrasto = {
  lixeira: React.MutableRefObject<Retangulo | null>;
  podeExcluir: (id: string) => boolean;
  aoSobreLixeira: (sobre: boolean) => void;
  aoJogarNaLixeira: (id: string) => void;
  aoCancelar: () => void;   // soltou fora da lixeira: a pasta volta para a pilha e a lixeira sai
};

function Pasta({ rotina, largura, topo, esquerda, escolhida, reduzido, aoTocar, arrasto }: {
  rotina: Rotina; largura: number; topo: number; esquerda: number; escolhida: boolean; reduzido: boolean; aoTocar: () => void; arrasto: Arrasto;
}) {
  const sobe = useRef(new Animated.Value(escolhida ? 1 : 0)).current;
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;   // o deslocamento do arrasto
  const some = useRef(new Animated.Value(1)).current;                 // 1 = inteira; 0 = dentro da lixeira
  const [arrastando, setArrastando] = useState(false);
  const sobreRef = useRef(false);
  const ultimo = useRef({ dx: 0, dy: 0, x: 0, y: 0 });   // o último ponto do arrasto (a soltura usa este, não o do evento)
  const escolhidaRef = useRef(escolhida);
  escolhidaRef.current = escolhida;
  const arrastoRef = useRef(arrasto);
  arrastoRef.current = arrasto;

  useEffect(() => {
    if (reduzido) { sobe.setValue(escolhida ? 1 : 0); return; }
    Animated.spring(sobe, { toValue: escolhida ? 1 : 0, useNativeDriver: nativo, speed: 16, bounciness: 7 }).start();
  }, [escolhida, reduzido, sobe]);

  const resp = useMemo(() => {
    const pode = (g: { dx: number; dy: number }) => escolhidaRef.current && arrastoRef.current.podeExcluir(rotina.id) && Math.hypot(g.dx, g.dy) > LIMIAR;
    const dentro = (x: number, y: number) => {
      const r = arrastoRef.current.lixeira.current;
      return !!r && x >= r.x - FOLGA && x <= r.x + r.w + FOLGA && y >= r.y - FOLGA && y <= r.y + r.h + FOLGA;
    };
    const marcar = (s: boolean) => {
      if (s === sobreRef.current) return;
      sobreRef.current = s;
      arrastoRef.current.aoSobreLixeira(s);
      if (s) vibrar(false);
    };
    const voltar = () => {
      marcar(false);
      if (reduzido) { pos.setValue({ x: 0, y: 0 }); setArrastando(false); return; }
      Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: nativo, speed: 14, bounciness: 9 }).start(() => setArrastando(false));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => pode(g),
      onMoveShouldSetPanResponderCapture: (_e, g) => pode(g),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { setArrastando(true); vibrar(false); },
      onPanResponderMove: (_e, g) => { ultimo.current = { dx: g.dx, dy: g.dy, x: g.moveX, y: g.moveY }; pos.setValue({ x: g.dx, y: g.dy }); marcar(dentro(g.moveX, g.moveY)); },
      onPanResponderRelease: () => {
        /* decide pelo último movimento: na soltura, o navegador às vezes não traz a posição do dedo */
        if (!sobreRef.current || !arrastoRef.current.lixeira.current) { voltar(); arrastoRef.current.aoCancelar(); return; }
        /* caiu na lixeira: a pasta vai até o centro dela, encolhe e some */
        const r = arrastoRef.current.lixeira.current;
        const u = ultimo.current;
        const alvo = { x: u.dx + (r.x + r.w / 2 - u.x), y: u.dy + (r.y + r.h / 2 - u.y) };
        vibrar(true);
        const fim = () => { marcar(false); arrastoRef.current.aoJogarNaLixeira(rotina.id); };
        if (reduzido) { fim(); return; }
        Animated.parallel([
          Animated.timing(pos, { toValue: alvo, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: nativo }),
          Animated.timing(some, { toValue: 0, duration: 260, easing: Easing.in(Easing.cubic), useNativeDriver: nativo }),
        ]).start(fim);
      },
      onPanResponderTerminate: voltar,
    });
  }, [rotina.id, pos, some, reduzido]);

  const aba = Math.min(largura * 0.5, 190);
  const titulo = (rotina.capa ?? rotina.nome).toUpperCase();
  const podeArrastar = escolhida && arrasto.podeExcluir(rotina.id);
  return (
    <Animated.View
      {...resp.panHandlers}
      style={{
        position: 'absolute', top: topo, left: esquerda, width: largura, height: ALTURA, zIndex: arrastando ? 50 : undefined,
        opacity: some,
        ...(Platform.OS === 'web' ? ({ filter: arrastando ? 'drop-shadow(0 22px 30px rgba(42,22,80,0.35))' : 'drop-shadow(0 10px 18px rgba(42,22,80,0.22))', touchAction: podeArrastar ? 'none' : 'auto', cursor: podeArrastar ? 'grab' : 'pointer', userSelect: 'none' } as object) : null),
        transform: [
          { translateX: pos.x },
          { translateY: Animated.add(pos.y, sobe.interpolate({ inputRange: [0, 1], outputRange: [0, -SOBE] })) },
          { scale: some.interpolate({ inputRange: [0, 1], outputRange: [0.12, arrastando ? 0.94 : 1] }) },
          { skewY: '-3deg' },
        ],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: escolhida }}
        accessibilityLabel={`${rotina.nome}${rotina.sugerida ? ', sugestão' : ''}. ${escolhida ? 'Toque de novo para abrir o treino. Para excluir, arraste até a lixeira ou toque nela.' : 'Toque para escolher.'}`}
        onPress={aoTocar}
        disabled={arrastando}
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
        <View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 5, right: largura - aba - 14 }}>
          <T tam={titulo.length > 9 ? 13 : 15} peso="500" cor={TINTA} linhas={1} style={{ letterSpacing: 0.6 }}>{titulo}</T>
        </View>
        {/* na faixa de cima do corpo: quantos exercícios, quanto tempo e o selo da sugestão */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 14, right: 12, top: ABA + 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {escolhida
            ? <T tam={12.5} peso="500" cor={TINTA} style={{ flex: 1 }} linhas={1}>{arrastando ? 'Leve até a lixeira' : 'Toque de novo para abrir →'}</T>
            : <T tam={12.5} cor={TINTA} style={{ flex: 1, opacity: 0.85 }} linhas={1}>{rotina.exercicios.length} exercícios · {rotina.minutos} min</T>}
          {rotina.sugerida ? <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: ROXO }}><T tam={9.5} peso="500" cor="#ffffff" style={{ letterSpacing: 0.8 }}>SUGESTÃO</T></View> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function PilhaPastas({ rotinas, largura, escolhida, aoEscolher, aoAbrir, arrasto }: {
  rotinas: Rotina[]; largura: number; escolhida: string | null; aoEscolher: (id: string) => void; aoAbrir: (id: string) => void; arrasto: Arrasto;
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
          arrasto={arrasto}
        />
      ))}
    </View>
  );
}
