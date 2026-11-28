/* A tela do mascote, em 3D (desde 2026-11-25, pedidos do dono: "quando a pessoa clicar no mascote, abra uma tela que dê
   para ela vê-lo, girá-lo" e depois "quero que essas opções fiquem no 3D, não quero a tela anterior, e o 3D ativo no
   momento em que a pessoa clicar, não carregando"). Tocar num mascote da Coleção abre direto esta tela, por cima de tudo.

   O desenho (desde 2026-11-27, a partir de uma referência do dono): a tela toda na COR DO MASCOTE (lib/mascotes.ts,
   corDoMascote), num degradê que vai para o branco no tema claro e para o preto no escuro. O mascote fica num cartão grande
   e arredondado, na cor cheia, com um brilho claro atrás dele e duas folhas de cartão empilhadas por baixo. Dentro do cartão:
   em cima, a fotinha do mascote e o nome dele (o que a conta deu com o lápis, ou o de fábrica), com a raridade e o número;
   embaixo, uma pílula de vidro com QUANTOS REPETIDOS a conta tem dele (só isso). Abaixo do cartão: o NÍVEL
   (lib/nivelMascote.ts) e as ações (usar como meu mascote, dar nome e, se houver repetido, propor troca).
   O texto por cima da cor é branco ou escuro, o que ler melhor, e a cor do cartão escurece nas bordas o necessário para o
   contraste chegar a 4,5:1 (paletaDoCartao).

   O 3D é a página public/visor3d.html (three.js), numa WebView no celular e num iframe no navegador
   (componentes/QuadroVisor). Ela recebe as folgas de cima e de baixo (o nome e a pílula), para o mascote ficar no meio do
   espaço livre. Para abrir na hora, a Coleção deixa o three.js, o decodificador e os modelos da conta pré-carregados
   (PreCarregar3D); e, enquanto o 3D monta, o retrato do mascote fica no mesmo lugar e some quando o 3D aparece, sem tela
   de carregando. Sem internet, o retrato fica. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import type { MascoteDaColecao } from '../../api/mascotes';
import { Icone, type NomeIcone } from '../../componentes/Icone';
import { Mascote } from '../../componentes/Mascote';
import { EstrelasPixel } from '../../componentes/Pixel';
import { QuadroVisor } from '../../componentes/QuadroVisor';
import { T } from '../../componentes/Ui';
import { useTema } from '../../estado/tema';
import { comContraste, contraste, misturar, rgba } from '../../lib/cor';
import { corDoMascote, TOTAL_MASCOTES, type MascoteInfo } from '../../lib/mascotes';
import { progressoMascote, XP_MASCOTE } from '../../lib/nivelMascote';
import { cores, VERDE, VIDRO } from '../../tema';

const BRANCO = '#ffffff';
const ESCURO = '#161616';
const NA_WEB = Platform.OS === 'web';

/* as medidas de dentro do cartão: a fotinha com o nome em cima e a pílula dos repetidos embaixo */
const MARGEM = 14;
const FOTO = 46;
const PILULA = 52;
const FOLGA_CIMA = MARGEM + FOTO + 10;     // até onde vai o nome; o mascote em 3D fica abaixo disso
const FOLGA_BAIXO = MARGEM + PILULA + 30;  // a pílula e, logo acima dela, a dica de girar do visor; o mascote fica acima

/* as cores do cartão: a do mascote no meio e, nas bordas de cima e de baixo (onde ficam o nome e a pílula), um tom mais fechado.
   Texto branco se, escurecendo a borda até 42%, ele chegar a 4,5:1 (contando o vidro claro da pílula por cima); senão, escuro. */
function paletaDoCartao(cor: string) {
  for (let t = 0.12; t <= 0.42; t += 0.02) {
    const borda = misturar(cor, '#000000', t);
    if (contraste(BRANCO, misturar(borda, BRANCO, 0.16)) >= 4.5) {
      return { borda, texto: BRANCO, texto2: 'rgba(255,255,255,0.86)', vidro: 'rgba(255,255,255,0.16)', traco: 'rgba(255,255,255,0.6)' };
    }
  }
  return { borda: misturar(cor, '#000000', 0.04), texto: ESCURO, texto2: 'rgba(22,22,22,0.78)', vidro: 'rgba(255,255,255,0.42)', traco: 'rgba(22,22,22,0.32)' };
}

const endereco = (m: MascoteInfo, texto: string) =>
  `/visor3d.html?m=${m.chave}&c=${m.raridade.cor.slice(1)}&t=${texto.slice(1)}&pt=${FOLGA_CIMA}&pb=${FOLGA_BAIXO}&b=0`;

/* escondido, na Coleção: carrega o three.js, o decodificador e os modelos da conta, para a tela do mascote abrir na hora */
export function PreCarregar3D({ chaves }: { chaves: string[] }) {
  const ignorar = useCallback(() => undefined, []);
  if (!chaves.length) return null;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={st.escondido}>
      <QuadroVisor endereco={`/visor3d.html?pre=${chaves.join(',')}`} aoAviso={ignorar} />
    </View>
  );
}

type Props = {
  mascote: MascoteInfo | null; item?: MascoteDaColecao; ehMeu: boolean; salvando: boolean; lapis: number;
  xp?: number;   // o XP deste mascote (só o mascote escolhido ganha XP, a cada treino e a cada missão cumprida)
  aoFechar: () => void; aoUsar: (chave: string | null) => void; aoDarNome: (m: MascoteInfo) => void; aoTrocar: (m: MascoteInfo) => void;
};

export function TelaMascote({ mascote, item, ehMeu, salvando, lapis, xp = 0, aoFechar, aoUsar, aoDarNome, aoTrocar }: Props) {
  const [visto, setVisto] = useState<MascoteInfo | null>(mascote);   // o último aberto fica na tela enquanto ela some
  const [pronto, setPronto] = useState(false);
  const ins = useSafeAreaInsets();
  const { tema } = useTema();
  const claro = tema === 'claro';
  useEffect(() => { if (mascote) { setVisto(mascote); setPronto(false); } }, [mascote]);
  const aoAviso = useCallback((msg: string) => { if (msg === 'pronto') setPronto(true); }, []);
  const m = mascote ?? visto;
  const cor = m ? corDoMascote(m) : '#888888';
  const p = useMemo(() => paletaDoCartao(cor), [cor]);
  if (!m) return null;

  const proprio = item?.nome ?? null;
  const quantos = item?.quantidade ?? 1;
  const repetidos = Math.max(0, quantos - 1);
  const pm = progressoMascote(xp);
  /* o fundo da tela: a cor do mascote, clara (tema claro) ou fechada (escuro), indo para o branco ou o preto */
  const fundo: [string, string, string] = claro
    ? [misturar(cor, BRANCO, 0.6), misturar(cor, BRANCO, 0.9), BRANCO]
    : [misturar(cor, '#000000', 0.48), misturar(cor, '#000000', 0.86), '#050505'];
  const barra = comContraste(cor, claro ? BRANCO : '#050505', 3);   // o preenchimento do nível: 3:1 com o fundo de baixo
  const textoRepetidos = repetidos === 0 ? 'Sem repetidos' : `${repetidos} ${repetidos === 1 ? 'repetido' : 'repetidos'}`;

  return (
    <Modal visible={mascote !== null} animationType="fade" onRequestClose={aoFechar} statusBarTranslucent transparent>
      <View style={st.raiz} accessibilityViewIsModal>
        <LinearGradient colors={fundo} locations={[0, 0.42, 0.82]} style={StyleSheet.absoluteFill} />
        <View style={[st.coluna, { paddingTop: ins.top + 10, paddingBottom: ins.bottom + 16 }]}>

          {/* o cartão do mascote, com as duas folhas empilhadas por baixo */}
          <View style={st.pilha}>
            <View style={[st.folha, { left: 30, right: 30, bottom: -16, backgroundColor: rgba(p.borda, claro ? 0.22 : 0.32) }]} />
            <View style={[st.folha, { left: 15, right: 15, bottom: -8, backgroundColor: rgba(p.borda, claro ? 0.42 : 0.55) }]} />
            <View style={[st.cartao, { backgroundColor: cor, shadowColor: p.borda, shadowOpacity: claro ? 0.35 : 0.5 }]}>
              <LinearGradient colors={[p.borda, p.borda, cor, p.borda, p.borda]} locations={[0, 0.14, 0.5, 0.86, 1]} style={StyleSheet.absoluteFill} />
              {/* o brilho claro atrás do mascote */}
              <View pointerEvents="none" style={[st.livre, { opacity: claro ? 0.62 : 0.48 }]}>
                <Svg width="100%" height="100%">
                  <Defs>
                    <RadialGradient id="brilho-mascote" cx="50%" cy="50%" r="50%">
                      <Stop offset="0" stopColor={BRANCO} stopOpacity={0.75} />
                      <Stop offset="0.55" stopColor={BRANCO} stopOpacity={0.18} />
                      <Stop offset="1" stopColor={BRANCO} stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Ellipse cx="50%" cy="50%" rx="50%" ry="46%" fill="url(#brilho-mascote)" />
                </Svg>
              </View>

              {/* o mascote em 3D; o retrato fica no lugar até o 3D aparecer */}
              {!pronto ? (
                <View pointerEvents="none" style={[st.livre, st.centro]}>
                  <Mascote chave={m.chave} tamanho={220} />
                </View>
              ) : null}
              {mascote !== null ? (
                <View style={[StyleSheet.absoluteFill, !pronto && { opacity: 0 }]}>
                  <QuadroVisor key={m.chave} endereco={endereco(m, p.texto)} aoAviso={aoAviso} />
                </View>
              ) : null}

              {/* em cima: a fotinha e o nome */}
              <View pointerEvents="box-none" style={st.topo}>
                <View style={[st.foto, { backgroundColor: misturar(cor, BRANCO, 0.78) }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <View style={st.fotoRecorte}>
                    <Mascote chave={m.chave} tamanho={74} style={st.fotoMascote} />
                  </View>
                  {ehMeu ? (
                    <View style={st.selo}>
                      <Icone nome="ok" tamanho={11} cor={BRANCO} espessura={2.6} />
                    </View>
                  ) : null}
                </View>
                <View style={{ flex: 1, minWidth: 0 }} accessible accessibilityLabel={`${proprio ?? m.nome}${proprio ? `, um ${m.nome}` : ''}. ${m.raridade.nome}, número ${m.numero} de ${TOTAL_MASCOTES}.${ehMeu ? ' É o seu mascote.' : ''}`}>
                  <T tam={17} peso="500" cor={p.texto} linhas={1}>{proprio ?? m.nome}</T>
                  <View style={st.linhaRaridade}>
                    <EstrelasPixel n={m.raridade.estrelas} cor={p.texto} tamanho={9} />
                    <T tam={12.5} cor={p.texto2} linhas={1} style={{ flexShrink: 1 }}>
                      {proprio ? `${m.nome} · ${m.raridade.nome}` : `${m.raridade.nome} · Nº ${m.numero} de ${TOTAL_MASCOTES}`}
                    </T>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} hitSlop={6}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.redondo, { backgroundColor: p.vidro }, NA_WEB && VIDRO, (pressed || hovered) && { opacity: 0.78 }]}
                >
                  <Icone nome="fechar" tamanho={18} cor={p.texto} espessura={2} />
                </Pressable>
              </View>

              {/* embaixo: quantos repetidos a conta tem dele */}
              <View
                accessible accessibilityRole="text"
                accessibilityLabel={repetidos === 0 ? 'Você não tem repetidos deste mascote' : `Você tem ${textoRepetidos} deste mascote`}
                style={[st.pilula, { backgroundColor: p.vidro, borderColor: p.traco }, NA_WEB && VIDRO]}
              >
                <Icone nome="copias" tamanho={19} cor={p.texto} espessura={1.9} />
                <T tam={15} peso="500" cor={p.texto}>{textoRepetidos}</T>
              </View>
            </View>
          </View>

          {/* o nível e as ações */}
          <View style={st.painel}>
            <View style={{ gap: 8 }}>
              <View style={st.linhaNivel}>
                <T tam={18} peso="500" cor={cores.texto}>Nível {pm.nivel}</T>
                <T tam={13.5} cor={cores.texto3}>{pm.noNivel}/{pm.tamanho} XP</T>
              </View>
              <View
                accessible accessibilityRole="progressbar" accessibilityLabel={`Nível ${pm.nivel}: ${pm.noNivel} de ${pm.tamanho} XP para o próximo`}
                accessibilityValue={{ min: 0, max: pm.tamanho, now: pm.noNivel }}
                style={[st.trilho, { backgroundColor: `rgba(${cores.tinta},0.1)` }]}
              >
                <View style={[st.trilhoCheio, { width: `${Math.max(pm.p > 0 ? 4 : 0, Math.round(pm.p * 100))}%`, backgroundColor: barra }]} />
              </View>
              <T tam={13} cor={cores.texto3} style={{ lineHeight: 18 }}>
                {ehMeu
                  ? `É o seu mascote: ganha +${XP_MASCOTE.treino} XP a cada treino e +${XP_MASCOTE.missao} XP a cada missão cumprida.`
                  : `Só o seu mascote ganha XP. Use este para ele ganhar +${XP_MASCOTE.treino} a cada treino e +${XP_MASCOTE.missao} a cada missão.`}
              </T>
            </View>
            <View style={{ gap: 10 }}>
              {ehMeu
                ? <BotaoTela tipo="claro" claro={claro} titulo="Não mostrar mascote" icone="olho" aoPressionar={() => aoUsar(null)} carregando={salvando} />
                : <BotaoTela tipo="cor" claro={claro} fundo={p.borda} texto={p.texto} titulo="Usar como meu mascote" aoPressionar={() => aoUsar(m.chave)} carregando={salvando} />}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <BotaoTela tipo="claro" claro={claro} titulo={proprio ? `Renomear (${lapis})` : `Dar nome (${lapis})`} icone="lapis" aoPressionar={() => aoDarNome(m)} style={{ flex: 1 }} />
                {repetidos > 0 ? <BotaoTela tipo="claro" claro={claro} titulo="Propor troca" icone="troca" aoPressionar={() => aoTrocar(m)} style={{ flex: 1 }} /> : null}
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* os botões desta tela: a pílula cheia na cor do mascote (a ação principal) e a pílula clara (branca no tema claro, de vidro no escuro) */
function BotaoTela({ titulo, aoPressionar, tipo, claro, fundo, texto, icone, carregando, style }: {
  titulo: string; aoPressionar: () => void; tipo: 'cor' | 'claro'; claro: boolean; fundo?: string; texto?: string;
  icone?: NomeIcone; carregando?: boolean; style?: object;
}) {
  const corTexto = tipo === 'cor' ? texto ?? BRANCO : cores.texto;
  const visual = tipo === 'cor'
    ? { backgroundColor: fundo, borderColor: 'transparent', height: 52 }
    : claro
      ? { backgroundColor: BRANCO, borderColor: 'rgba(22,22,22,0.08)', height: 48, shadowColor: '#1a1a1a', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }
      : { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.14)', height: 48 };
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={titulo} accessibilityState={{ disabled: !!carregando, busy: !!carregando }}
      disabled={!!carregando} onPress={aoPressionar}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        st.botao, visual, style,
        hovered && !pressed && { opacity: 0.9 },
        pressed && { opacity: 0.82, transform: [{ scale: 0.98 }] },
      ]}
    >
      {carregando ? <ActivityIndicator size="small" color={corTexto} /> : icone ? <Icone nome={icone} tamanho={17} cor={corTexto} espessura={1.9} /> : null}
      <T tam={tipo === 'cor' ? 15.5 : 14.5} peso="500" cor={corTexto} linhas={1}>{titulo}</T>
    </Pressable>
  );
}

const st = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: '#050505' },
  coluna: { flex: 1, width: '100%', maxWidth: 500, alignSelf: 'center', paddingHorizontal: 14 },
  pilha: { flex: 1, marginBottom: 16 },
  folha: { position: 'absolute', height: 80, borderRadius: 30 },
  cartao: {
    flex: 1, borderRadius: 32, overflow: 'hidden',
    shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 10,
  },
  livre: { position: 'absolute', left: 0, right: 0, top: FOLGA_CIMA, bottom: FOLGA_BAIXO },
  centro: { alignItems: 'center', justifyContent: 'center' },
  topo: { position: 'absolute', top: MARGEM, left: MARGEM, right: MARGEM, flexDirection: 'row', alignItems: 'center', gap: 10 },
  foto: { width: FOTO, height: FOTO, borderRadius: FOTO / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  fotoRecorte: { flex: 1, borderRadius: FOTO / 2, overflow: 'hidden' },
  fotoMascote: { position: 'absolute', left: -12, top: -3 },
  selo: {
    position: 'absolute', right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, backgroundColor: VERDE.botao,
    borderWidth: 2, borderColor: BRANCO, alignItems: 'center', justifyContent: 'center',
  },
  linhaRaridade: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  redondo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pilula: {
    position: 'absolute', left: MARGEM, right: MARGEM, bottom: MARGEM, height: PILULA, borderRadius: PILULA / 2,
    borderWidth: 1.5, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  painel: { gap: 16, paddingHorizontal: 4 },
  linhaNivel: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  trilho: { height: 10, borderRadius: 5, overflow: 'hidden' },
  trilhoCheio: { height: '100%', borderRadius: 5 },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14 },
  escondido: { position: 'absolute', width: 2, height: 2, left: 0, top: 0, opacity: 0, overflow: 'hidden' },
});
