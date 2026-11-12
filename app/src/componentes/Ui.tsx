/* Blocos básicos de interface: texto fino, cartão, botão, chip, passo (+/−), anel, barra, segmentos e campo. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, DEGRADE, FIM_DIAGONAL, FONTE, INICIO_DIAGONAL, PesoFonte, raio, estilos } from '../tema';
import { Faiscas } from './Faiscas';
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
   O principal segue a referência do dono (2026-11-12): pílula violeta elétrica, borda fina clara, halo de luz em volta, um
   brilho lilás que passeia devagar na parte de baixo e três estrelinhas piscando antes do texto (Faiscas), quando o botão
   não tem ícone próprio. Os outros tipos ficam discretos, mas com o mesmo formato de pílula. */

/* o brilho que passeia na parte de baixo do botão principal, de um lado para o outro */
function BrilhoAndante({ forte }: { forte: boolean }) {
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
              <RadialGradient id="brilhoAndante" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#e6c8ff" stopOpacity={forte ? 0.75 : 0.55} />
                <Stop offset="1" stopColor="#c58cff" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50" cy="25" rx="50" ry="25" fill="url(#brilhoAndante)" />
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
  const cor = tipo === 'primario' ? cores.branco : tipo === 'perigo' ? cores.erro : cores.texto;
  const inativo = !!desabilitado || !!carregando;
  const conteudo = (
    <View style={[st.botaoMiolo, pequeno && st.botaoMioloPequeno]}>
      {carregando ? <ActivityIndicator size="small" color={cor} /> : icone ? <Icone nome={icone} tamanho={pequeno ? 16 : 18} cor={cor} /> : tipo === 'primario' ? <Faiscas tamanho={pequeno ? 16 : 21} /> : null}
      <T tam={pequeno ? 13.5 : tipo === 'primario' ? 16 : 15} peso="500" cor={cor} style={{ letterSpacing: 0.2 }}>{titulo}</T>
    </View>
  );
  /* ao tocar, o botão afunda um pouco e volta com mola */
  const escala = useRef(new Animated.Value(1)).current;
  const nativo = Platform.OS !== 'web';
  const mola = (para: number) => Animated.spring(escala, { toValue: para, useNativeDriver: nativo, speed: 42, bounciness: 5 }).start();

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
      onPressIn={() => mola(0.97)}
      onPressOut={() => mola(1)}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        st.botao, comOrbita && { borderRadius: raio.pilula },
        tipo === 'primario' && st.botaoPrimario, tipo === 'fantasma' && st.botaoFantasma, tipo === 'perigo' && st.botaoPerigo, tipo === 'discreto' && st.botaoDiscreto,
        /* o cursor em cima: a borda acende e o fundo clareia um pouco */
        hovered && !inativo && (tipo === 'primario' ? st.sobrePrimario : tipo === 'fantasma' ? st.sobreFantasma : tipo === 'perigo' ? st.sobrePerigo : st.sobreDiscreto),
        { opacity: desabilitado ? 0.45 : 1 },
      ]}
    >
      {({ hovered }: { pressed: boolean; hovered?: boolean }) => (
        <>
          {tipo === 'primario' ? (
            <>
              <LinearGradient pointerEvents="none" colors={['#9168ff', '#7648ff', '#6639f4']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
              <BrilhoAndante forte={!!hovered && !inativo} />
              {/* a luz de cima: uma faixa clara na metade de cima, mais forte com o cursor em cima */}
              <LinearGradient pointerEvents="none" colors={[hovered && !inativo ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.55 }} style={StyleSheet.absoluteFill} />
              {/* e a sombra de baixo, que dá volume */}
              <LinearGradient pointerEvents="none" colors={['rgba(20,0,60,0)', 'rgba(20,0,60,0.1)']} start={{ x: 0, y: 0.55 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
            </>
          ) : null}
          {conteudo}
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
    <Animated.View style={[{ transform: [{ scale: escala }], borderRadius: raio.pilula }, tipo === 'primario' && !desabilitado && st.brilhoPrimario, style]}>
      {comOrbita ? (
        <View onLayout={(e) => setMedida({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={st.orbita}>
          {feixe}
          {miolo}
        </View>
      ) : (
        miolo
      )}
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
  botaoPrimario: { backgroundColor: '#6f3ff9', borderWidth: 1, borderColor: 'rgba(206,186,255,0.6)' },
  /* o halo: um anel de luz violeta em volta e o brilho embaixo */
  brilhoPrimario: Platform.OS === 'web'
    ? ({ boxShadow: '0 0 0 4px rgba(124,77,255,0.26), 0 10px 32px -8px rgba(118,72,255,0.9)' } as object)
    : { shadowColor: '#7c4dff', shadowOpacity: 0.65, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  botaoFantasma: { borderWidth: 1, borderColor: 'rgba(196,168,255,0.34)', backgroundColor: `rgba(${cores.tom},0.08)` },
  botaoPerigo: { borderWidth: 1, borderColor: 'rgba(255,107,129,0.5)', backgroundColor: 'rgba(255,107,129,0.08)' },
  botaoDiscreto: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'rgba(255,255,255,0.06)' },
  sobrePrimario: { borderColor: 'rgba(236,226,255,0.9)' },
  sobreFantasma: { borderColor: 'rgba(196,168,255,0.75)', backgroundColor: `rgba(${cores.tom},0.17)`, boxShadow: '0 0 20px -8px rgba(139,92,246,0.9)' },
  sobrePerigo: { borderColor: 'rgba(255,107,129,0.85)', backgroundColor: 'rgba(255,107,129,0.16)' },
  sobreDiscreto: { borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.1)' },
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
