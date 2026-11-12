/* Blocos básicos de interface: texto fino, cartão, botão, chip, passo (+/−), anel, barra, segmentos e campo. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, DEGRADE, FIM_DIAGONAL, FONTE, INICIO_DIAGONAL, PesoFonte, raio, estilos } from '../tema';
import { Icone, NomeIcone } from './Icone';

/* ---------- texto ---------- */
type TProps = {
  children?: React.ReactNode;
  tam?: number;
  peso?: PesoFonte;
  cor?: string;
  mono?: boolean;
  centro?: boolean;
  linhas?: number;
  style?: StyleProp<TextStyle>;
};
export function T({ children, tam = 15, peso = '300', cor = cores.texto, mono, centro, linhas, style }: TProps) {
  return (
    <Text
      numberOfLines={linhas}
      style={[
        { fontSize: tam, fontFamily: FONTE[peso], fontWeight: 'normal', color: cor, letterSpacing: tam >= 28 ? -tam * 0.03 : 0 },
        mono && { letterSpacing: 0.4 },
        centro && { textAlign: 'center' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ---------- cartão ---------- */
/* um brilho leve de cima para baixo e um fio de luz no alto da borda; no destaque, o brilho é roxo. */
export function Cartao({ children, style, destaque }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; destaque?: boolean }) {
  return (
    <View style={[st.cartao, destaque && st.cartaoDestaque, style]}>
      {true ? (
        <>
          <LinearGradient pointerEvents="none" colors={destaque ? DEGRADE.brilhoDestaque : DEGRADE.brilhoCartao} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient pointerEvents="none" colors={DEGRADE.fio} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[st.fio, !destaque && { opacity: 0.45 }]} />
        </>
      ) : null}
      {children}
    </View>
  );
}

/* ---------- botão ----------
   O principal segue a referência em vídeo do dono (2026-11-12): parado, ele fica APAGADO (pílula cinza escura, texto
   acinzentado); quando o cursor chega nele, no momento antes do clique, ele ACENDE: vira violeta vivo, cresce um pouco, o
   texto fica branco, um brilho lilás passeia na parte de baixo e uma luz roxa se espalha em volta. O cursor saiu, ele apaga
   devagar. Sem estrelinhas nem brilhos "de IA". Onde não existe cursor (celular, tela de toque) ele fica aceso, para não
   parecer desativado, e brilha mais ao ser tocado. Os outros tipos fazem o mesmo (pedido do dono): apagados parados e
   acesos com o cursor; o de perigo acende em vermelho. Sem cursor, os outros ficam apagados e acendem ao toque, para o
   principal continuar se destacando. */

/* tela sem cursor (celular, tablet): o botão principal fica aceso */
const SEM_CURSOR = Platform.OS !== 'web' || (typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: none)').matches);

/* o brilho que passeia na parte de baixo do botão principal, de um lado para o outro */
function BrilhoAndante({ forte, perigo }: { forte: boolean; perigo?: boolean }) {
  const reduzido = useMovimentoReduzido();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduzido || !w) return undefined;
    const nativo = Platform.OS !== 'web';
    const laco = Animated.loop(Animated.sequence([
      Animated.timing(x, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
      Animated.timing(x, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: nativo }),
    ]));
    laco.start();
    return () => laco.stop();
  }, [reduzido, w, x]);
  const larg = Math.max(60, w * 0.62);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w ? (
        <Animated.View style={{ position: 'absolute', bottom: '-55%', height: '120%', width: larg, left: (w - larg) / 2, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.24, w * 0.24] }) }] }}>
          <Svg width="100%" height="100%" viewBox="0 0 100 50" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id={perigo ? 'brilhoAndantePerigo' : 'brilhoAndante'} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={perigo ? '#ffd0d8' : '#e6c8ff'} stopOpacity={forte ? 0.75 : 0.55} />
                <Stop offset="1" stopColor={perigo ? '#ff8fa1' : '#c58cff'} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50" cy="25" rx="50" ry="25" fill={perigo ? 'url(#brilhoAndantePerigo)' : 'url(#brilhoAndante)'} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}
type BotaoProps = {
  titulo: string;
  aoPressionar: () => void;
  tipo?: 'primario' | 'fantasma' | 'discreto' | 'perigo';
  desabilitado?: boolean;
  carregando?: boolean;   // mostra o indicador e não aceita outro toque enquanto espera
  orbita?: boolean;       // um feixe de luz percorre o contorno, como nos botões do site
  icone?: NomeIcone;
  pequeno?: boolean;
  style?: StyleProp<ViewStyle>;
};
export function Botao({ titulo, aoPressionar, tipo = 'primario', desabilitado, carregando, orbita, icone, pequeno, style }: BotaoProps) {
  const inativo = !!desabilitado || !!carregando;
  /* o conteúdo em duas cores: a do botão apagado e o branco do aceso (um some enquanto o outro aparece) */
  const corApagado = tipo === 'perigo' ? cores.erro : tipo === 'primario' ? 'rgba(255,255,255,0.62)' : 'rgba(244,241,251,0.82)';
  const miolo2 = (cor: string) => (
    <View style={[st.botaoMiolo, pequeno && st.botaoMioloPequeno]}>
      {carregando ? <ActivityIndicator size="small" color={cor} /> : icone ? <Icone nome={icone} tamanho={pequeno ? 16 : 18} cor={cor} /> : null}
      <T tam={pequeno ? 13.5 : tipo === 'primario' ? 16 : 15} peso="500" cor={cor} style={{ letterSpacing: 0.2 }}>{titulo}</T>
    </View>
  );
  /* ao tocar, o botão afunda um pouco e volta com mola */
  const escala = useRef(new Animated.Value(1)).current;
  const nativo = Platform.OS !== 'web';
  const mola = (para: number) => Animated.spring(escala, { toValue: para, useNativeDriver: nativo, speed: 42, bounciness: 5 }).start();

  /* aceso ou apagado (só o principal): o cursor em cima, o foco do teclado, o toque ou o carregando acendem */
  const primario = tipo === 'primario';
  const perigo = tipo === 'perigo';
  const [cursor, setCursor] = useState(false);
  const [foco, setFoco] = useState(false);
  const [tocando, setTocando] = useState(false);
  const aceso = !desabilitado && ((primario && SEM_CURSOR) || cursor || foco || tocando || !!carregando);
  const luz = useRef(new Animated.Value(aceso ? 1 : 0)).current;
  const realce = useRef(new Animated.Value(0)).current;   // o brilho a mais do toque
  useEffect(() => {
    Animated.timing(luz, { toValue: aceso ? 1 : 0, duration: aceso ? 280 : 650, easing: aceso ? Easing.out(Easing.cubic) : Easing.inOut(Easing.quad), useNativeDriver: nativo }).start();
  }, [aceso, luz, nativo]);
  useEffect(() => {
    Animated.timing(realce, { toValue: tocando ? 1 : 0, duration: tocando ? 140 : 420, easing: Easing.out(Easing.quad), useNativeDriver: nativo }).start();
  }, [tocando, realce, nativo]);

  /* contorno com luz: o feixe gira por trás do botão e só aparece na faixa fina da borda */
  const reduzido = useMovimentoReduzido();
  const comOrbita = !!orbita && !desabilitado;
  const giro = useRef(new Animated.Value(0)).current;
  const [medida, setMedida] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!comOrbita || reduzido) return undefined;
    giro.setValue(0);
    const laco = Animated.loop(Animated.timing(giro, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: nativo }));
    laco.start();
    return () => laco.stop();
  }, [comOrbita, reduzido, giro, nativo]);

  const miolo = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: !!carregando }}
      disabled={inativo}
      onPress={aoPressionar}
      onPressIn={() => { mola(0.97); setTocando(true); }}
      onPressOut={() => { mola(1); setTocando(false); }}
      onHoverIn={() => setCursor(true)}
      onHoverOut={() => setCursor(false)}
      onFocus={() => setFoco(true)}
      onBlur={() => setFoco(false)}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        st.botao, comOrbita && { borderRadius: raio.pilula },
        st.botaoApagado, perigo && st.botaoApagadoPerigo,
        /* o cursor em cima: a borda acende e o fundo clareia um pouco */
        { opacity: desabilitado ? 0.45 : 1 },
      ]}
    >
      {() => (
        <>
          {/* aceso: a cor, o brilho que passeia, a luz de cima e a borda clara aparecem juntos, por cima do cinza apagado */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st.acesoBorda, perigo && st.acesoBordaPerigo, { opacity: luz }]}>
            <LinearGradient pointerEvents="none" colors={perigo ? ['#ff7a8e', '#e5485f', '#c42f4b'] : ['#9168ff', '#7648ff', '#6639f4']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
            <BrilhoAndante forte={cursor || tocando} perigo={perigo} />
            <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.26)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.55 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <Animated.View style={{ opacity: luz.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>{miolo2(corApagado)}</Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: luz }]}>{miolo2(cores.branco)}</Animated.View>
        </>
      )}
    </Pressable>
  );

  const lado = Math.hypot(medida.w, medida.h);   // o quadrado que gira cobre o botão em qualquer ângulo
  const feixe = comOrbita && !reduzido && medida.w > 0 ? (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: (medida.w - lado) / 2, top: (medida.h - lado) / 2, width: lado, height: lado,
        transform: [{ rotate: giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(205,184,255,0.95)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', left: lado / 2 - 44, top: 0, width: 88, height: lado / 2 }}
      />
    </Animated.View>
  ) : null;

  return (
    <Animated.View style={[{ transform: [{ scale: escala }], borderRadius: raio.pilula }, style]}>
      {!desabilitado ? (
        /* a luz que se espalha em volta quando ele acende (no toque, um pouco mais) */
        <Animated.View pointerEvents="none" style={[st.aura, { opacity: Animated.add(Animated.multiply(luz, primario ? 0.85 : 0.6), Animated.multiply(realce, 0.15)) }]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id={perigo ? 'auraBotaoPerigo' : 'auraBotao'} cx="50%" cy="55%" r="50%">
                <Stop offset="0" stopColor={perigo ? '#ff4d6a' : '#7c4dff'} stopOpacity={0.5} />
                <Stop offset="0.55" stopColor={perigo ? '#d6334f' : '#6a3cf0'} stopOpacity={0.16} />
                <Stop offset="1" stopColor={perigo ? '#7a1426' : '#4c1d95'} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50" cy="50" rx="50" ry="50" fill={perigo ? 'url(#auraBotaoPerigo)' : 'url(#auraBotao)'} />
          </Svg>
        </Animated.View>
      ) : null}
      <Animated.View style={[{ borderRadius: raio.pilula }, !desabilitado && { transform: [{ scale: luz.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.02] }) }] }]}>
      {comOrbita ? (
        <View onLayout={(e) => setMedida({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={st.orbita}>
          {feixe}
          {miolo}
        </View>
      ) : (
        miolo
      )}
      </Animated.View>
    </Animated.View>
  );
}

/* ---------- chip ---------- */
export function Chip({ texto, tom = 'violeta', style }: { texto: string; tom?: 'violeta' | 'bom' | 'alerta' | 'neutro'; style?: StyleProp<ViewStyle> }) {
  const mapa = {
    violeta: { fundo: `rgba(${cores.tom},0.14)`, texto: cores.destaque2 },
    bom: { fundo: 'rgba(61,220,151,0.14)', texto: cores.bom },
    alerta: { fundo: 'rgba(255,154,92,0.14)', texto: cores.alerta },
    neutro: { fundo: 'rgba(255,255,255,0.07)', texto: cores.texto2 },
  }[tom];
  return (
    <View style={[st.chip, { backgroundColor: mapa.fundo }, style]}>
      <T tam={11} mono peso="400" cor={mapa.texto}>{texto}</T>
    </View>
  );
}

/* ---------- passo: valor com − e + ---------- */
type PassoProps = {
  valor: number;
  aoMudar: (v: number) => void;
  passo?: number;
  min?: number;
  max?: number;
  formato?: (v: number) => string;
  unidade?: string;
  rotulo: string;
};
export function Passo({ valor, aoMudar, passo = 1, min = 0, max = 9999, formato, unidade, rotulo }: PassoProps) {
  const mudar = (d: number) => {
    const novo = Math.round((valor + d) * 100) / 100;
    aoMudar(Math.min(max, Math.max(min, novo)));
  };
  return (
    <View style={st.passo}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Diminuir ${rotulo}`} onPress={() => mudar(-passo)} style={st.passoBtn}>
        <Icone nome="menos" tamanho={14} cor={cores.texto2} />
      </Pressable>
      <View style={st.passoValor}>
        <T tam={16} peso="400">{formato ? formato(valor) : String(valor)}</T>
        {unidade ? <T tam={10} mono cor={cores.texto3}>{unidade}</T> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Aumentar ${rotulo}`} onPress={() => mudar(passo)} style={st.passoBtn}>
        <Icone nome="mais" tamanho={14} cor={cores.texto2} />
      </Pressable>
    </View>
  );
}

/* ---------- anel de progresso ---------- */
export function Anel({ progresso, tamanho = 120, espessura = 9, cor = cores.destaque, children }: { progresso: number; tamanho?: number; espessura?: number; cor?: string; children?: React.ReactNode }) {
  const r = (tamanho - espessura) / 2;
  const c = tamanho / 2;
  const volta = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progresso));
  return (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={tamanho} height={tamanho} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke="rgba(255,255,255,0.09)" strokeWidth={espessura} fill="none" />
        <Circle
          cx={c} cy={c} r={r} stroke={cor} strokeWidth={espessura} fill="none" strokeLinecap="round"
          strokeDasharray={`${volta} ${volta}`} strokeDashoffset={volta * (1 - p)} rotation={-90} origin={`${c}, ${c}`}
        />
      </Svg>
      {children}
    </View>
  );
}

/* ---------- barra de progresso ---------- */
export function Barra({ valor, max, cor = cores.destaque }: { valor: number; max: number; cor?: string }) {
  const p = max > 0 ? Math.min(1, valor / max) : 0;
  return (
    <View style={st.barra}>
      {cor === cores.destaque || cor === cores.destaque2 ? (
        <LinearGradient colors={DEGRADE.barra} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${p * 100}%`, height: '100%', borderRadius: 99 }} />
      ) : (
        <View style={{ width: `${p * 100}%`, height: '100%', backgroundColor: cor, borderRadius: 99 }} />
      )}
    </View>
  );
}

/* ---------- segmentos (abas pequenas) ---------- */
export function Segmentos<V extends string | number>({ opcoes, valor, aoMudar }: { opcoes: { valor: V; nome: string }[]; valor: V; aoMudar: (v: V) => void }) {
  const normal = true;   // o segmento ativo é sempre desenhado com degradê
  return (
    <View style={st.segmentos}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable key={String(o.valor)} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => aoMudar(o.valor)} style={[st.segmento, ativo && (normal ? st.segmentoAtivoNormal : st.segmentoAtivo)]}>
            {ativo && normal ? <LinearGradient pointerEvents="none" colors={DEGRADE.roxo} start={INICIO_DIAGONAL} end={FIM_DIAGONAL} style={[StyleSheet.absoluteFill, { borderRadius: raio.pilula }]} /> : null}
            <T tam={12.5} peso={ativo ? '500' : '300'} cor={ativo ? (normal ? '#ffffff' : cores.fundo) : cores.texto2}>{o.nome}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- campo de texto ---------- */
type CampoProps = TextInputProps & { rotulo: string; direita?: React.ReactNode };
export function Campo({ rotulo, direita, style, onFocus, onBlur, ...resto }: CampoProps) {
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T tam={11} mono cor={foco ? cores.destaque2 : cores.texto2}>{rotulo.toUpperCase()}</T>
      <View style={[st.campo, foco && st.campoFoco]}>
        <TextInput
          placeholderTextColor={cores.placeholder}
          selectionColor={cores.destaque}
          style={[st.campoTexto, style]}
          onFocus={(e) => { setFoco(true); onFocus?.(e); }}
          onBlur={(e) => { setFoco(false); onBlur?.(e); }}
          {...resto}
        />
        {direita}
      </View>
    </View>
  );
}

/* ---------- título de seção ---------- */
export function Titulo({ children, direita }: { children: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <View style={st.titulo}>
      <T tam={20} peso="300" style={{ letterSpacing: -0.4 }}>{children}</T>
      {direita}
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  cartao: {
    backgroundColor: cores.cartao, borderColor: cores.linha, borderWidth: 1, borderRadius: raio.g, padding: 18, overflow: 'hidden',
    boxShadow: '0 24px 44px -30px rgba(0,0,0,0.95)',
    ...(Platform.OS === 'web' ? ({ contentVisibility: 'auto', containIntrinsicSize: 'auto 240px' } as object) : null),
  },
  cartaoDestaque: { borderColor: 'rgba(139,92,246,0.55)', backgroundColor: cores.cartao, boxShadow: '0 24px 50px -30px rgba(106,0,212,0.55)' },
  fio: { position: 'absolute', top: 0, left: 24, right: 24, height: 1 },
  orbita: { borderRadius: raio.pilula, overflow: 'hidden', padding: 1.5, backgroundColor: 'rgba(196,168,255,0.2)' },
  campoFoco: { borderColor: cores.destaque, backgroundColor: `rgba(${cores.tom},0.06)` },
  /* botões: a mesma altura e o mesmo canto em todos; no navegador, as trocas de cor são suaves */
  botao: {
    borderRadius: raio.pilula, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ transitionProperty: 'background-color, border-color, box-shadow', transitionDuration: '180ms' } as object) : null),
  },
  /* apagado (todos os tipos): cinza escuro quase sem cor; o aceso (acesoBorda + degradê) aparece por cima */
  botaoApagado: { backgroundColor: '#1b1a21', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  botaoApagadoPerigo: { borderColor: 'rgba(255,107,129,0.28)' },
  acesoBorda: { borderRadius: raio.pilula, borderWidth: 1, borderColor: 'rgba(206,186,255,0.65)', overflow: 'hidden', margin: -1 },
  acesoBordaPerigo: { borderColor: 'rgba(255,190,200,0.7)' },
  /* a luz em volta: maior que o botão, atrás dele */
  aura: { position: 'absolute', left: '-14%', right: '-14%', top: '-70%', bottom: '-90%' },
  botaoMiolo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, paddingVertical: 13, paddingHorizontal: 22 },
  botaoMioloPequeno: { minHeight: 42, paddingVertical: 10, paddingHorizontal: 16 },
  chip: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 11, borderRadius: raio.pilula },
  passo: { flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo2, borderRadius: raio.m, borderWidth: 1, borderColor: cores.linha },
  passoBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  passoValor: { minWidth: 46, alignItems: 'center', justifyContent: 'center' },
  barra: { height: 6, backgroundColor: `rgba(${cores.tom},0.14)`, borderRadius: 99, overflow: 'hidden' },
  segmentos: { flexDirection: 'row', backgroundColor: cores.cartao2, borderRadius: raio.pilula, padding: 4, borderWidth: 1, borderColor: cores.linha },
  segmento: { flexGrow: 1, flexBasis: 'auto', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: raio.pilula },
  segmentoAtivo: { backgroundColor: cores.texto },
  segmentoAtivoNormal: { overflow: 'hidden', boxShadow: '0 6px 16px -8px rgba(106,0,212,0.9)' },
  campo: { flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo2, borderWidth: 1, borderColor: cores.linha2, borderRadius: raio.m },
  campoTexto: { flex: 1, color: cores.texto, fontSize: 16, fontFamily: FONTE['300'], paddingVertical: 14, paddingHorizontal: 14, outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  titulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
}));
