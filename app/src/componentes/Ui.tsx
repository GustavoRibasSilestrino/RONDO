/* Blocos básicos de interface: texto fino, cartão, botão, chip, passo (+/−), anel, barra, segmentos e campo. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, degradeBotao, PesoFonte, raio } from '../tema';
import { Icone, NomeIcone } from './Icone';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' });

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
        { fontSize: tam, fontWeight: peso, color: cor, letterSpacing: tam >= 28 ? -tam * 0.03 : 0 },
        mono && { fontFamily: MONO, letterSpacing: 0.4 },
        centro && { textAlign: 'center' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ---------- cartão ---------- */
export function Cartao({ children, style, destaque }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; destaque?: boolean }) {
  return (
    <View style={[st.cartao, destaque && st.cartaoDestaque, style]}>
      <LinearGradient
        colors={destaque ? ['rgba(139,92,246,0.30)', 'rgba(109,40,217,0.03)'] : ['rgba(255,255,255,0.065)', 'rgba(255,255,255,0.012)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      {children}
    </View>
  );
}

/* ---------- botão ---------- */
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
    <View style={[st.botaoMiolo, pequeno && { paddingVertical: 13, paddingHorizontal: 16 }]}>
      {carregando ? <ActivityIndicator size="small" color={cor} /> : icone ? <Icone nome={icone} tamanho={pequeno ? 16 : 18} cor={cor} /> : null}
      <T tam={pequeno ? 13 : 15} peso="500" cor={cor}>{titulo}</T>
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
      style={[st.botao, comOrbita && { borderRadius: raio.m - 1.5 }, tipo === 'fantasma' && st.botaoFantasma, tipo === 'perigo' && st.botaoPerigo, tipo === 'discreto' && st.botaoDiscreto, { opacity: desabilitado ? 0.45 : 1 }]}
    >
      {tipo === 'primario' ? (
        <LinearGradient colors={degradeBotao} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      {conteudo}
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
    <Animated.View style={[tipo === 'primario' && !inativo && st.brilho, { transform: [{ scale: escala }], borderRadius: raio.m }, style]}>
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
    violeta: { fundo: 'rgba(139,92,246,0.14)', texto: cores.destaque2 },
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
      <View style={{ width: `${p * 100}%`, height: '100%', backgroundColor: cor, borderRadius: 99 }} />
    </View>
  );
}

/* ---------- segmentos (abas pequenas) ---------- */
export function Segmentos<V extends string | number>({ opcoes, valor, aoMudar }: { opcoes: { valor: V; nome: string }[]; valor: V; aoMudar: (v: V) => void }) {
  return (
    <View style={st.segmentos}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable key={String(o.valor)} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => aoMudar(o.valor)} style={[st.segmento, ativo && st.segmentoAtivo]}>
            <T tam={13} peso={ativo ? '500' : '300'} cor={ativo ? cores.fundo : cores.texto2}>{o.nome}</T>
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
          placeholderTextColor={cores.texto3}
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

const st = StyleSheet.create({
  cartao: { backgroundColor: 'rgba(255,255,255,0.015)', borderColor: cores.linha, borderWidth: 1, borderRadius: raio.g, padding: 18, overflow: 'hidden', boxShadow: '0 22px 40px -28px rgba(0,0,0,0.9)' },
  cartaoDestaque: { borderColor: 'rgba(139,92,246,0.55)', backgroundColor: 'rgba(109,40,217,0.1)', boxShadow: '0 26px 50px -30px rgba(109,40,217,0.7)' },
  brilho: { boxShadow: '0 14px 30px -14px rgba(139,92,246,0.85)' },
  orbita: { borderRadius: raio.m, overflow: 'hidden', padding: 1.5, backgroundColor: 'rgba(196,168,255,0.2)' },
  campoFoco: { borderColor: cores.destaque, backgroundColor: 'rgba(139,92,246,0.06)' },
  botao: { borderRadius: raio.m, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  botaoFantasma: { borderWidth: 1, borderColor: cores.linha2, backgroundColor: 'rgba(255,255,255,0.03)' },
  botaoPerigo: { borderWidth: 1, borderColor: 'rgba(255,107,129,0.5)', backgroundColor: 'rgba(255,107,129,0.08)' },
  botaoDiscreto: { backgroundColor: 'rgba(255,255,255,0.06)' },
  botaoMiolo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, paddingHorizontal: 22 },
  chip: { alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 11, borderRadius: raio.pilula },
  passo: { flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo2, borderRadius: raio.m, borderWidth: 1, borderColor: cores.linha },
  passoBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  passoValor: { minWidth: 46, alignItems: 'center', justifyContent: 'center' },
  barra: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' },
  segmentos: { flexDirection: 'row', backgroundColor: cores.cartao2, borderRadius: raio.pilula, padding: 4 },
  segmento: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: raio.pilula },
  segmentoAtivo: { backgroundColor: cores.texto },
  campo: { flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo2, borderWidth: 1, borderColor: cores.linha2, borderRadius: raio.m },
  campoTexto: { flex: 1, color: cores.texto, fontSize: 16, fontWeight: '300', paddingVertical: 14, paddingHorizontal: 14, outlineWidth: 0, outlineColor: 'transparent' },
  titulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
});
