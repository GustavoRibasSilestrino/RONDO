/* Blocos básicos de interface: texto fino, cartão, botão, chip, passo (+/−), anel, barra, segmentos e campo. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { useMovimentoReduzido } from '../lib/movimento';
import { CINZA_SOBRE, cores, escuro, SOMBRA, VERDE, VIDRO, DEGRADE, FIM_DIAGONAL, FONTE, FONTE_PIXEL, INICIO_DIAGONAL, PesoFonte, raio, estilos } from '../tema';
import { Icone, NomeIcone } from './Icone';
import { Vidro, VIDRO_NATIVO } from './Vidro';

/* ---------- telas escuras ----------
   As telas do RONDIN continuam escuras (tema.ts). Dentro de <EscuroContexto.Provider value>, o `T` sem cor usa o texto claro. */
export const EscuroContexto = createContext(false);

/* ---------- texto ---------- */
type TProps = {
  children?: React.ReactNode;
  tam?: number;
  peso?: PesoFonte;
  cor?: string;
  mono?: boolean;
  pixel?: boolean;   // a fonte de pixel art (tema.ts, FONTE_PIXEL): os pesos 400 e 500 viram o negrito dela
  centro?: boolean;
  linhas?: number;
  selecionavel?: boolean;   // dá para selecionar e copiar o texto (códigos, chaves)
  style?: StyleProp<TextStyle>;
};
export function T({ children, tam = 15, peso = '300', cor: corDada, mono, pixel, centro, linhas, selecionavel, style }: TProps) {
  const naTelaEscura = useContext(EscuroContexto);
  const cor = corDada ?? (naTelaEscura ? escuro.texto : cores.texto);
  return (
    <Text
      numberOfLines={linhas}
      selectable={selecionavel}
      style={[
        { fontSize: tam, fontFamily: pixel ? (peso === '400' || peso === '500' ? FONTE_PIXEL.forte : FONTE_PIXEL.normal) : FONTE[peso], fontWeight: 'normal', color: cor, letterSpacing: pixel ? 0.2 : tam >= 28 ? -tam * 0.03 : 0 },
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
/* vidro: branco translúcido com desfoque do fundo (no navegador), borda clara e um brilho de cima para baixo; no destaque, o
   brilho é lilás */
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
                <Stop offset="0" stopColor={perigo ? '#ffd0d8' : '#ffffff'} stopOpacity={forte ? 0.75 : 0.55} />
                <Stop offset="1" stopColor={perigo ? '#ff8fa1' : '#ffffff'} stopOpacity={0} />
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
  pixel?: boolean;        // o texto na fonte de pixel art (um ponto maior, porque ela é mais estreita)
  style?: StyleProp<ViewStyle>;
};
/* Nas telas claras (o app inteiro), o botão é o BotaoChapado: pequeno, roxo pastel, chapado (pedido do dono, 2026-11-18).
   Nas telas escuras do RONDIN continua o de antes. A escolha é pelo EscuroContexto, que não muda durante a vida do botão. */
export function Botao(props: BotaoProps) {
  return useContext(EscuroContexto) ? <BotaoEscuro {...props} /> : <BotaoChapado {...props} />;
}

/* ---------- o botão chapado (telas claras) ----------
   Uma pílula baixa (40 px; 34 no pequeno) do tamanho do texto, sem brilho, degradê, sombra nem borda. O principal é roxo pastel
   com texto roxo-escuro (contraste ≈ 11:1); o secundário (fantasma/discreto) é só um contorno fino; o de perigo, rosa pastel com
   texto vinho. Ao tocar, escurece um tom e afunda 3%; com o cursor em cima, escurece meio tom. A área de toque vai a 44 px com
   hitSlop, mesmo com o botão menor por fora. */
/* calculadas na primeira leitura e de novo a cada troca de tema (estilos, em tema.ts) */
const CHAPADO = estilos(() => ({
  primario: { fundo: cores.acao, sobre: VERDE.sobre, toque: VERDE.toque, borda: 'transparent', texto: '#ffffff' },   // o verde dos botões (pedido do dono, 2026-11-26)
  fantasma: { fundo: 'transparent', sobre: `rgba(${cores.tinta},0.08)`, toque: `rgba(${cores.tinta},0.14)`, borda: `rgba(${cores.tinta},0.24)`, texto: cores.texto },
  discreto: { fundo: 'transparent', sobre: `rgba(${cores.tinta},0.08)`, toque: `rgba(${cores.tinta},0.14)`, borda: `rgba(${cores.tinta},0.14)`, texto: cores.texto2 },
  perigo: { fundo: 'rgba(255,107,129,0.16)', sobre: 'rgba(255,107,129,0.22)', toque: 'rgba(255,107,129,0.3)', borda: 'transparent', texto: cores.tinta === '255,255,255' ? '#ff9aab' : '#b3203a' },
}));

function BotaoChapado({ titulo, aoPressionar, tipo = 'primario', desabilitado, carregando, icone, pequeno, pixel, style }: BotaoProps) {
  const c = CHAPADO[tipo];
  const inativo = !!desabilitado || !!carregando;
  const altura = pequeno ? 34 : 40;
  const escala = useRef(new Animated.Value(1)).current;
  const nativo = Platform.OS !== 'web';
  const mola = (para: number) => Animated.spring(escala, { toValue: para, useNativeDriver: nativo, speed: 40, bounciness: 4 }).start();
  return (
    <Animated.View style={[{ alignSelf: 'flex-start', transform: [{ scale: escala }] }, style]}>
      {/* vidro (componentes/Vidro.tsx): no iOS 26+ o botão é de Liquid Glass, tingido de violeta no principal; nos outros, o de antes */}
      <Vidro interativo tom={tipo === 'primario' ? cores.acao : undefined} style={st.chapadoVidro}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={titulo}
        accessibilityState={{ disabled: inativo, busy: !!carregando }}
        disabled={inativo}
        onPress={aoPressionar}
        onPressIn={() => mola(0.97)}
        onPressOut={() => mola(1)}
        hitSlop={{ top: (44 - altura) / 2, bottom: (44 - altura) / 2, left: 4, right: 4 }}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          st.chapado, { height: altura, paddingHorizontal: pequeno ? 14 : 18, backgroundColor: pressed ? c.toque : hovered ? c.sobre : VIDRO_NATIVO ? 'transparent' : c.fundo, borderColor: c.borda },
          { opacity: desabilitado ? 0.45 : 1 },
        ]}
      >
        {carregando ? <ActivityIndicator size="small" color={c.texto} /> : icone ? <Icone nome={icone} tamanho={pequeno ? 15 : 16} cor={c.texto} /> : null}
        <T tam={(pequeno ? 13 : 14) + (pixel ? 1.5 : 0)} peso="500" pixel={pixel} cor={c.texto} linhas={1}>{titulo}</T>
      </Pressable>
      </Vidro>
    </Animated.View>
  );
}

function BotaoEscuro({ titulo, aoPressionar, tipo = 'primario', desabilitado, carregando, orbita, icone, pequeno, style }: BotaoProps) {
  const inativo = !!desabilitado || !!carregando;
  /* vidro (desde 2026-11-17): nas telas claras do app o botão é de vidro (branco translúcido, borda clara, texto roxo quase
     preto) e, aceso, vira a pílula de vidro brilhante lilás com texto escuro (BrilhoVidro, desde 2026-11-18). Nas telas do RONDIN, que são escuras,
     continua o botão de antes (cinza escuro que acende; desde 2026-11-27 acende em BRANCO com texto escuro, não mais em verde:
     pedido do dono, nas telas do RONDIN só a esfera é verde). */
  const vidro = !useContext(EscuroContexto);
  /* o conteúdo em duas cores: a do botão apagado e o branco do aceso (um some enquanto o outro aparece) */
  const corApagado = tipo === 'perigo' ? (vidro ? cores.erro : escuro.erro) : vidro ? cores.texto : tipo === 'primario' ? 'rgba(255,255,255,0.62)' : 'rgba(242,242,242,0.82)';
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

  /* aceso ou apagado (só o principal): o foco do teclado, o toque ou o carregando acendem. O cursor em cima não acende mais:
     o botão só fica cinza (CINZA_SOBRE), na hora, sem zoom (pedido do dono, 2026-11-16) */
  const primario = tipo === 'primario';
  const perigo = tipo === 'perigo';
  const [cursor, setCursor] = useState(false);
  const [foco, setFoco] = useState(false);
  const [tocando, setTocando] = useState(false);
  const aceso = !desabilitado && !cursor && ((primario && SEM_CURSOR) || foco || tocando || !!carregando);
  const luz = useRef(new Animated.Value(aceso ? 1 : 0)).current;
  const realce = useRef(new Animated.Value(0)).current;   // o brilho a mais do toque
  useEffect(() => {
    luz.setValue(aceso ? 1 : 0);   // sem transição: acende e apaga na hora
  }, [aceso, luz]);
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
        vidro ? st.botaoVidro : st.botaoApagado, perigo && (vidro ? st.botaoVidroPerigo : st.botaoApagadoPerigo),
        /* o cursor em cima: só o cinza (no vidro, um cinza claro) */
        cursor && !desabilitado && (vidro ? st.botaoVidroSobre : CINZA_SOBRE),
        { opacity: desabilitado ? 0.45 : 1 },
      ]}
    >
      {() => (
        <>
          {/* aceso: a cor, o brilho que passeia, a luz de cima e a borda clara aparecem juntos, por cima do cinza apagado */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, st.acesoBorda, perigo && st.acesoBordaPerigo, vidro && st.acesoVidro, { opacity: luz }]}>
            {vidro && !perigo ? null : (
              <>
                <LinearGradient pointerEvents="none" colors={perigo ? (vidro ? ['#c42f4b', '#b3203a', '#9a1830'] : ['#ff7a8e', '#e5485f', '#c42f4b']) : ['#f6f6f6', '#e9e9e9', '#d8d8d8']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
                {vidro ? null : <BrilhoAndante forte={cursor || tocando} perigo={perigo} />}
                <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.26)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.55 }} style={StyleSheet.absoluteFill} />
              </>
            )}
          </Animated.View>
          <Animated.View style={{ opacity: luz.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>{miolo2(corApagado)}</Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: luz }]}>{miolo2(vidro && !perigo ? cores.texto : perigo ? cores.branco : '#0a0a0a')}</Animated.View>
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
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', left: lado / 2 - 44, top: 0, width: 88, height: lado / 2 }}
      />
    </Animated.View>
  ) : null;

  return (
    <Animated.View style={[{ transform: [{ scale: escala }], borderRadius: raio.pilula }, style]}>
      {!desabilitado && !vidro ? (
        /* a luz que se espalha em volta quando ele acende (no toque, um pouco mais); no vidro, não */
        <Animated.View pointerEvents="none" style={[st.aura, { opacity: Animated.add(Animated.multiply(luz, primario ? 0.85 : 0.6), Animated.multiply(realce, 0.15)) }]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <Defs>
              <RadialGradient id={perigo ? 'auraBotaoPerigo' : 'auraBotao'} cx="50%" cy="55%" r="50%">
                <Stop offset="0" stopColor={perigo ? '#ff4d6a' : '#ffffff'} stopOpacity={perigo ? 0.5 : 0.2} />
                <Stop offset="0.55" stopColor={perigo ? '#d6334f' : '#ffffff'} stopOpacity={perigo ? 0.16 : 0.05} />
                <Stop offset="1" stopColor={perigo ? '#7a1426' : '#ffffff'} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx="50" cy="50" rx="50" ry="50" fill={perigo ? 'url(#auraBotaoPerigo)' : 'url(#auraBotao)'} />
          </Svg>
        </Animated.View>
      ) : null}
      <View style={{ borderRadius: raio.pilula }}>
      {comOrbita ? (
        <View onLayout={(e) => setMedida({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} style={st.orbita}>
          {feixe}
          {miolo}
        </View>
      ) : (
        miolo
      )}
      </View>
    </Animated.View>
  );
}

/* ---------- chip ---------- */
export function Chip({ texto, tom = 'violeta', style }: { texto: string; tom?: 'violeta' | 'bom' | 'alerta' | 'neutro'; style?: StyleProp<ViewStyle> }) {
  const mapa = {
    violeta: { fundo: `rgba(${cores.tom},0.14)`, texto: cores.destaque2 },
    bom: { fundo: 'rgba(61,220,151,0.14)', texto: cores.bom },
    alerta: { fundo: 'rgba(255,154,92,0.14)', texto: cores.alerta },
    neutro: { fundo: `rgba(${cores.tinta},0.07)`, texto: cores.texto2 },
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
        <Circle cx={c} cy={c} r={r} stroke={`rgba(${cores.tinta},0.09)`} strokeWidth={espessura} fill="none" />
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
export function Segmentos<V extends string | number>({ opcoes, valor, aoMudar, pixel }: { opcoes: { valor: V; nome: string }[]; valor: V; aoMudar: (v: V) => void; pixel?: boolean }) {
  const normal = true;   // o segmento ativo é sempre desenhado com degradê
  return (
    <View style={st.segmentos}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable key={String(o.valor)} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => aoMudar(o.valor)} style={[st.segmento, ativo && (normal ? st.segmentoAtivoNormal : st.segmentoAtivo)]}>
            
            <T tam={pixel ? 14 : 12.5} pixel={pixel} peso={ativo ? '500' : '300'} cor={ativo ? (normal ? '#ffffff' : cores.fundo) : cores.texto2}>{o.nome}</T>
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
    boxShadow: SOMBRA.vidro, ...VIDRO,
    ...(Platform.OS === 'web' ? ({ contentVisibility: 'auto', containIntrinsicSize: 'auto 240px' } as object) : null),
  },
  cartaoDestaque: { borderColor: `rgba(${cores.tom},0.32)`, backgroundColor: `rgba(${cores.tom},0.12)`, boxShadow: `0 22px 46px -24px ${cores.sombra}` },
  fio: { position: 'absolute', top: 0, left: 24, right: 24, height: 1 },
  orbita: { borderRadius: raio.pilula, overflow: 'hidden', padding: 1.5, backgroundColor: 'rgba(255,255,255,0.2)' },
  campoFoco: { borderColor: cores.destaque, backgroundColor: `rgba(${cores.tom},0.06)` },
  /* botões: a mesma altura e o mesmo canto em todos; no navegador, as trocas de cor são suaves */
  botao: {
    borderRadius: raio.pilula, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ transitionProperty: 'background-color, border-color, box-shadow', transitionDuration: '180ms' } as object) : null),
  },
  /* apagado (todos os tipos): cinza escuro quase sem cor; o aceso (acesoBorda + degradê) aparece por cima */
  botaoApagado: { backgroundColor: '#1b1b1b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  botaoVidro: { backgroundColor: 'rgba(255,255,255,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', boxShadow: '0 10px 24px -16px rgba(35,35,35,0.5)', ...VIDRO },
  botaoVidroPerigo: { borderColor: 'rgba(179,32,58,0.45)' },
  botaoVidroSobre: { backgroundColor: 'rgba(213,213,213,0.92)', borderColor: 'rgba(194,194,194,1)' },   // o cursor em cima: cinza claro
  /* o principal aceso, no vidro: violeta translúcido com desfoque (antes era roxo quase preto; pedido do dono, 2026-11-18) */
  acesoVidro: { borderColor: 'rgba(255,255,255,0.95)', boxShadow: '0 10px 26px -10px rgba(113,113,113,0.75)' },
  botaoApagadoPerigo: { borderColor: 'rgba(255,107,129,0.28)' },
  acesoBorda: { borderRadius: raio.pilula, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', overflow: 'hidden', margin: -1 },
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
  chapadoVidro: { borderRadius: 999, overflow: 'hidden' },
  chapado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 999, borderWidth: 1 },
  segmentoAtivoNormal: { backgroundColor: cores.acao },   // a opção escolhida: o violeta de ação, como o botão principal
  campo: { flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo2, borderWidth: 1, borderColor: cores.linha2, borderRadius: raio.m },
  campoTexto: { flex: 1, minWidth: 0, color: cores.texto, fontSize: 16, fontFamily: FONTE['300'], paddingVertical: 14, paddingHorizontal: 14, outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  titulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 12 },
}));
