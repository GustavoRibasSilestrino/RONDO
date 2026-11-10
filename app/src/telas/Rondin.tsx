/* O RONDIN: um agente que conversa com a pessoa para entrar ou criar a conta. Ele se apresenta, pergunta o sotaque,
   fala cada pergunta em voz alta (a legenda vai surgindo palavra por palavra embaixo do orbe) e mostra as opções ou o
   campo para responder. No cadastro, as respostas viram o perfil da conta (altura, peso, objetivo, rotina...) e são
   salvas no servidor junto com ela. O roteiro está em lib/rondinRoteiro.ts e a voz em lib/rondinVoz.ts.

   A tela tem cara de painel de assistente (um "Jarvis"): o orbe fica dentro de uma moldura de instrumento (componentes/Orbe),
   uma etiqueta diz o que ele está fazendo (falando, ouvindo, processando) e o progresso vira "ETAPA 03 · 14". E ela responde:
   o orbe acompanha o cursor e solta uma onda a cada tecla; tocar nele pula a fala ou repete a pergunta; no computador as
   opções têm atalho de teclado (1 a 9, e Enter para continuar).
   Tamanho: no navegador a coluna inteira escala com a janela (`k`), para caber sem rolar e nunca ficar gigante. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cadastrar, entrar, nomeEstaLivre } from '../api/conta';
import { LinearGradient } from 'expo-linear-gradient';
import { CampoFlutuante, CampoRef } from '../componentes/CampoFlutuante';
import { FundoCena } from '../componentes/FundoCena';
import { Icone } from '../componentes/Icone';
import { Orbe } from '../componentes/Orbe';
import { Botao, T } from '../componentes/Ui';
import { useLayoutLargo } from '../lib/largura';
import { useMovimentoReduzido } from '../lib/movimento';
import { EstadoOrbe, ROTULO_ESTADO } from '../lib/orbe';
import { Dita, FALAS, Opcao, Passo, Respostas, emailValido, lerData, mascararData, montarPerfil, passosCadastro, passosEntrar, primeiroNome, trechosDe } from '../lib/rondinRoteiro';
import { SOTAQUES, Sotaque, falar, parar, sotaquePadrao } from '../lib/rondinVoz';
import { cores, estilos } from '../tema';
import type { Estado, Usuario } from '../tipos';
import { RecuperarSenha } from './RecuperarSenha';
import { SITE } from './Login';

export type Modo = 'entrar' | 'cadastro';
/* o que ele diz: um texto, ou um modelo com lugares para o nome e os números ("Prazer, {nome}!") */
type Fala = string | Dita;
type AoEntrar = (usuario: Usuario, extra?: Partial<Estado>) => void;

/* ---------- uma palavra da legenda: aparece esmaecendo, sem pulo ----------
   No navegador a transição é de CSS (o próprio navegador anima, sem refazer o React a cada quadro); no aparelho, Animated com o driver nativo.
   Memorizada: só a palavra que mudou é redesenhada, não a frase inteira. */
const DURACAO_FADE = 180;   // curto: a palavra surge rápido, sem ficar meio apagada esperando
const Palavra = React.memo(function Palavra({ texto, visivel, destaque, reduzido }: { texto: string; visivel: boolean; destaque: boolean; reduzido: boolean }) {
  const op = useRef(new Animated.Value(visivel ? 1 : 0)).current;
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (reduzido) { op.setValue(visivel ? 1 : 0); return; }
    Animated.timing(op, { toValue: visivel ? 1 : 0, duration: DURACAO_FADE, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [visivel, reduzido, op]);
  const cor = destaque ? cores.destaque2 : cores.texto;
  if (Platform.OS === 'web') {
    const transicao = reduzido ? null : ({ transition: `opacity ${DURACAO_FADE}ms ease-out, color ${DURACAO_FADE}ms ease-out`, willChange: 'opacity' } as object);
    return <T tam={20} peso="300" cor={cor} style={[{ opacity: visivel ? 1 : 0, lineHeight: 29 }, transicao]}>{texto}</T>;
  }
  return <Animated.View style={{ opacity: op }}><T tam={20} peso="300" cor={cor} style={{ lineHeight: 29 }}>{texto}</T></Animated.View>;
});

/* ---------- a legenda: as palavras surgem no ritmo da fala; a última fica em destaque ---------- */
function Legenda({ largo, texto, chave, taxa, duracaoMs, indiceVoz, completa, aoCompletar }: { largo: boolean; texto: string; chave: number; taxa: number; duracaoMs: number; indiceVoz: number; completa: boolean; aoCompletar: () => void }) {
  const palavras = useMemo(() => texto.split(/\s+/).filter(Boolean), [texto]);
  const inicios = useMemo(() => { let i = 0; return palavras.map((p) => { const o = texto.indexOf(p, i); i = o + p.length; return o; }); }, [palavras, texto]);
  const [n, setN] = useState(0);
  const [alvo, setAlvo] = useState(0);   // até onde a voz já chegou, em palavras: a legenda alcança de pouco em pouco, nunca de uma vez
  const reduzido = useMovimentoReduzido();
  const fim = useRef(aoCompletar);
  fim.current = aoCompletar;

  useEffect(() => {   // fala nova: recomeça
    setN(0);
    setAlvo(0);
  }, [chave]);

  useEffect(() => {   // o relógio: uma palavra por vez, mais devagar se a palavra for longa
    if (completa || reduzido) { setN(palavras.length); return undefined; }
    if (n >= palavras.length) return undefined;
    const total = palavras.reduce((a, p) => a + p.length + 1, 0);
    /* com o áudio pronto, o tempo de cada palavra vem da duração real; sem ele, uma estimativa */
    const normal = duracaoMs > 0
      ? (n === 0 ? 60 : (duracaoMs * 0.96 * (palavras[n - 1].length + 1)) / total)
      : (n === 0 ? 60 : 95 + 30 * palavras[n - 1].length) / Math.max(0.6, taxa);
    /* a voz já passou desta palavra: ela surge logo em seguida, mas uma de cada vez (antes entravam várias juntas, de uma vez) */
    const espera = n < alvo ? Math.min(normal, 55) : normal;
    const id = setTimeout(() => setN((v) => v + 1), espera);
    return () => clearTimeout(id);
  }, [n, alvo, palavras, taxa, duracaoMs, completa, reduzido]);

  useEffect(() => {   // a voz avisou onde está: a legenda não fica atrás dela
    if (indiceVoz < 0) return;
    const ate = inicios.filter((o) => o <= indiceVoz + 1).length;
    setAlvo((v) => Math.max(v, Math.min(ate, palavras.length)));
  }, [indiceVoz, inicios, palavras.length]);

  useEffect(() => {
    if (palavras.length && n >= palavras.length) { const id = setTimeout(() => fim.current(), 280); return () => clearTimeout(id); }
    return undefined;
  }, [n, palavras.length, chave]);

  return (
    <View accessible accessibilityLabel={texto} accessibilityLiveRegion="polite" style={[st.legenda, largo && { minHeight: 62 }]}>
      {palavras.map((p, i) => (
        <Palavra key={`${chave}-${i}`} texto={`${p}${i < palavras.length - 1 ? ' ' : ''}`} visivel={i < n} destaque={i === n - 1} reduzido={reduzido} />
      ))}
    </View>
  );
}

/* ---------- uma opção para tocar ---------- */
function Pilula({ opcao, marcada, aoPressionar, tecla }: { opcao: Opcao; marcada?: boolean; aoPressionar: () => void; tecla?: number }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ selected: !!marcada }} accessibilityLabel={opcao.nota ? `${opcao.rotulo}, ${opcao.nota}` : opcao.rotulo}
      onPress={aoPressionar}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.pilula, hovered && !marcada && st.pilulaSobre, marcada && st.pilulaMarcada, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
    >
      {tecla ? <View style={[st.tecla, marcada && { borderColor: 'rgba(255,255,255,0.5)' }]}><T tam={10.5} peso="500" cor={marcada ? cores.branco : cores.destaque2}>{tecla}</T></View> : null}
      <View style={{ flexShrink: 1 }}>
        <T tam={14} peso="500" cor={marcada ? cores.branco : cores.texto}>{opcao.rotulo}</T>
        {opcao.nota ? <T tam={11.5} cor={marcada ? 'rgba(255,255,255,0.85)' : cores.texto3} style={{ marginTop: 1 }}>{opcao.nota}</T> : null}
      </View>
    </Pressable>
  );
}

/* ---------- os quatro cantos da moldura do painel, só no computador ---------- */
function Cantos() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[st.canto, { top: 0, left: 0, borderTopWidth: 1, borderLeftWidth: 1 }]} />
      <View style={[st.canto, { top: 0, right: 0, borderTopWidth: 1, borderRightWidth: 1 }]} />
      <View style={[st.canto, { bottom: 0, left: 0, borderBottomWidth: 1, borderLeftWidth: 1 }]} />
      <View style={[st.canto, { bottom: 0, right: 0, borderBottomWidth: 1, borderRightWidth: 1 }]} />
    </View>
  );
}

export function Rondin({ modo, aoEntrar, aoVoltar }: { modo: Modo; aoEntrar: AoEntrar; aoVoltar: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  /* no navegador, a coluna inteira (letras, orbe, opções, campos) escala com a janela: 1 = um celular de 390 px. Encolhe em
     tela estreita ou baixa, para caber, e cresce só um pouco em tela grande (antes ia até 1,8 e as opções ficavam enormes). */
  const { largo } = useLayoutLargo();
  const k = Platform.OS === 'web' ? Math.min(1.12, Math.max(0.78, Math.min(width / 390, height / 720))) : 1;

  const [resp, setResp] = useState<Respostas>({});
  const respRef = useRef<Respostas>({});
  const [sotaque, setSotaque] = useState<Sotaque>(sotaquePadrao());
  const sotaqueRef = useRef<Sotaque>(sotaque);
  const passos = useMemo<Passo[]>(() => (modo === 'cadastro' ? passosCadastro(resp) : passosEntrar()), [modo, resp]);
  const [idAtual, setIdAtual] = useState('apresentacao');
  const [fase, setFase] = useState<'falando' | 'pergunta' | 'trabalhando'>('falando');
  const [fala, setFala] = useState('');
  const [chave, setChave] = useState(0);
  const [indiceVoz, setIndiceVoz] = useState(-1);
  const [duracaoMs, setDuracaoMs] = useState(0);
  const [completa, setCompleta] = useState(false);
  const [erro, setErro] = useState('');
  const [falhou, setFalhou] = useState(false);
  const prefixo = useRef<Fala | null>(null);
  const ctrl = useRef<{ id: number; voz: boolean; leg: boolean; depois: (() => void) | null; graca: number }>({ id: 0, voz: false, leg: false, depois: null, graca: 3500 });

  /* campos da pergunta atual */
  const [texto, setTexto] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [recuperando, setRecuperando] = useState(false);   // a tela de esqueci a senha, no lugar da conversa
  const campoRef = useRef<CampoRef>(null), senhaRef = useRef<CampoRef>(null);
  const [teclas, setTeclas] = useState(0);            // cada tecla digitada solta uma onda no orbe
  const trechosRef = useRef<Parameters<typeof falar>[0]>([]);   // o áudio da última fala, para repetir ao tocar no orbe

  const passo = passos.find((p) => p.id === idAtual) ?? passos[0];
  const indice = passos.findIndex((p) => p.id === passo.id);
  const progresso = modo === 'cadastro' ? Math.min(1, indice / (passos.length - 1)) : 0;

  /* ---------- falar: legenda e voz andam juntas; o que vem depois só roda quando as duas terminam ---------- */
  const checar = useCallback((id: number) => {
    const c = ctrl.current;
    if (c.id !== id || !c.voz || !c.leg || !c.depois) return;
    const d = c.depois;
    c.depois = null;
    d();
  }, []);
  /* `graca`: quanto esperar pela voz depois que a legenda termina. Nas perguntas é pouco: as respostas já aparecem e a voz
     termina falando; nas outras falas (apresentação, amostra do sotaque) espera a voz acabar para não cortar. */
  const dizer = useCallback((partes: Fala[], depois: () => void, com: Sotaque = sotaqueRef.current, graca = 3500) => {
    /* a legenda mostra o texto inteiro; o áudio vai em trechos (as partes fixas são mp3 pronto, o nome e os números vêm do servidor) */
    const nome = primeiroNome(respRef.current);
    const itens = partes.map((p) => (typeof p === 'string' ? trechosDe(p, { nome }) : trechosDe(p.modelo, { nome, ...p.valores })));
    const t = itens.map((i) => i.exibir).join(' ');
    const trechos = itens.flatMap((i) => i.audio);
    trechosRef.current = trechos;
    const id = ctrl.current.id + 1;
    ctrl.current = { id, voz: false, leg: false, depois, graca };
    setFala(t); setChave(id); setIndiceVoz(-1); setDuracaoMs(0); setCompleta(false); setFase('falando');
    falar(trechos, com, () => { if (ctrl.current.id === id) { ctrl.current.voz = true; checar(id); } }, (i) => { if (ctrl.current.id === id) setIndiceVoz(i); }, (ms) => { if (ctrl.current.id === id) setDuracaoMs(ms); });
  }, [checar]);
  const aoCompletarLegenda = useCallback(() => {
    const id = ctrl.current.id;
    ctrl.current.leg = true;
    checar(id);
    /* a voz pode demorar mais que a legenda, mas não espera para sempre (ex.: a síntese travou) */
    setTimeout(() => { if (ctrl.current.id === id) { ctrl.current.voz = true; checar(id); } }, ctrl.current.graca);
  }, [checar]);
  const pular = () => { parar(); ctrl.current.voz = true; setCompleta(true); };
  /* tocar no orbe: enquanto ele fala, pula a fala; esperando a resposta, ele repete a pergunta em voz alta */
  const tocarNoOrbe = () => {
    if (fase === 'falando' && !completa) pular();
    else if (fase === 'pergunta' && trechosRef.current.length) falar(trechosRef.current, sotaqueRef.current, () => undefined);
  };

  const irPara = useCallback((id: string) => {
    setErro(''); setTexto(''); setMarcadas([]); setFalhou(false);
    setIdAtual(id);
  }, []);
  const avancar = useCallback(() => {
    const lista = modo === 'cadastro' ? passosCadastro(respRef.current) : passosEntrar();
    const i = lista.findIndex((p) => p.id === idAtualRef.current);
    if (i >= 0 && i + 1 < lista.length) irPara(lista[i + 1].id);
  }, [modo, irPara]);
  const idAtualRef = useRef(idAtual);
  idAtualRef.current = idAtual;

  /* ---------- ao chegar numa etapa: ele fala a pergunta (com o comentário da resposta anterior na frente) ---------- */
  useEffect(() => {
    const p = (modo === 'cadastro' ? passosCadastro(respRef.current) : passosEntrar()).find((x) => x.id === idAtual);
    if (!p) return;
    const partes: Fala[] = [...(prefixo.current ? [prefixo.current] : []), p.fala(respRef.current)];
    prefixo.current = null;
    dizer(partes, () => {
      if (p.tipo === 'fala') avancar();
      else if (p.tipo === 'criar') void criarConta();
      else setFase('pergunta');
    }, sotaqueRef.current, p.tipo === 'fala' || p.tipo === 'criar' ? 3500 : 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idAtual]);
  useEffect(() => () => parar(), []);

  /* o orbe: ouve enquanto espera a resposta, fala enquanto fala, pensa enquanto o servidor responde */
  const estadoOrbe: EstadoOrbe = fase === 'falando' ? 'falando' : fase === 'pergunta' ? (enviando ? 'pensando' : 'ouvindo') : 'pensando';

  /* ---------- guardar uma resposta e seguir ---------- */
  const guardar = (id: string, valor: string | string[]) => {
    respRef.current = { ...respRef.current, [id]: valor };
    setResp(respRef.current);
  };
  const responder = (valor: string | string[], comentario?: Fala) => {
    guardar(passo.id, valor);
    if (comentario) prefixo.current = comentario;
    avancar();
  };

  const escolherSotaque = (s: Sotaque) => {
    sotaqueRef.current = s;
    setSotaque(s);
    guardar('sotaque', s.id);
    setFase('trabalhando');
    dizer([s.amostra], avancar, s);   // a amostra já sai no sotaque escolhido
  };

  const escolher = (p: Extract<Passo, { tipo: 'opcoes' }>, o: Opcao) => {
    const barrado = p.barra?.(o.id);
    if (barrado) {   // ele explica e a pessoa escolhe de novo
      setFase('trabalhando');
      dizer([barrado], () => setFase('pergunta'), sotaqueRef.current, 500);
      return;
    }
    responder(o.id, o.comentario);
  };

  const enviarCampo = async (p: Extract<Passo, { tipo: 'campo' }>) => {
    const valor = p.campo === 'senha' ? texto : texto.trim();
    const problema = p.validar(valor, respRef.current);
    if (problema) { setErro(problema); setFase('trabalhando'); dizer([problema], () => { setFase('pergunta'); setTimeout(() => campoRef.current?.focus(), 50); }, sotaqueRef.current, 500); return; }
    /* o nome precisa ser único: pergunta ao servidor já aqui, antes de a pessoa responder todo o resto */
    if (modo === 'cadastro' && p.id === 'nome') {
      setEnviando(true);
      const livre = await nomeEstaLivre(valor);
      setEnviando(false);
      if (!livre) { setErro(FALAS.nomeJaTem); setFase('trabalhando'); dizer([FALAS.nomeJaTem], () => { setFase('pergunta'); setTimeout(() => campoRef.current?.focus(), 50); }, sotaqueRef.current, 500); return; }
    }
    responder(valor, p.comentario?.(valor, respRef.current));
  };

  /* marcar ou desmarcar uma opção numa pergunta de várias respostas */
  const alternar = (p: Extract<Passo, { tipo: 'multi' }>, o: Opcao) => setMarcadas((m) => {
    if (o.id === p.exclusiva) return m.includes(o.id) ? [] : [o.id];
    const sem = m.filter((x) => x !== p.exclusiva);
    return sem.includes(o.id) ? sem.filter((x) => x !== o.id) : [...sem, o.id];
  });

  /* ---------- criar a conta com tudo o que foi respondido ---------- */
  const criarConta = async () => {
    const r = respRef.current;
    setFase('trabalhando'); setFalhou(false);
    try {
      const menor = typeof r.respNome === 'string';
      const usuario = await cadastrar({
        nome: String(r.nome), email: String(r.email), senha: String(r.senha), nascimento: lerData(String(r.nascimento))!,
        aceita: true, marketing: r.marketing === 'sim',
        responsavel: menor ? { nome: String(r.respNome), email: String(r.respEmail), autoriza: true } : null,
      });
      const perfil = montarPerfil(r, sotaqueRef.current.id);
      dizer([FALAS.contaCriada], () => aoEntrar(usuario, perfil));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível criar a conta agora.';
      if (/já existe uma conta com esse nome/i.test(msg)) {   // por garantia: outra pessoa pegou o nome enquanto a conversa seguia
        prefixo.current = FALAS.nomeJaTem;
        irPara('nome');
      } else if (/e-mail já tem conta/i.test(msg)) {
        prefixo.current = FALAS.emailJaTem;
        irPara('email');
      } else {
        setErro(msg); setFalhou(true);
        dizer([FALAS.falhaCriar, msg], () => setFase('pergunta'));
      }
    }
  };

  /* ---------- entrar numa conta que já existe ---------- */
  const fazerLogin = async () => {
    if (enviando) return;
    if (!emailValido(email)) { setErro('Digite um e-mail válido.'); return; }
    if (senha.length < 6) { setErro('A senha tem pelo menos 6 caracteres.'); return; }
    setErro(''); setEnviando(true);
    try {
      const usuario = await entrar(email.trim(), senha);
      setFase('trabalhando');
      dizer([{ modelo: FALAS.deVolta, valores: { nome: usuario.nome.trim().split(/\s+/)[0] || 'campeão' } }], () => aoEntrar(usuario));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível entrar. Tente de novo.';
      setErro(msg); setEnviando(false);
      falar([msg], sotaqueRef.current, () => undefined);   // ele avisa em voz alta, sem esconder os campos
    }
  };

  /* ---------- voltar uma pergunta ---------- */
  const voltar = () => {
    parar();
    const anteriores = passos.slice(0, indice).filter((p) => p.tipo !== 'fala' && p.tipo !== 'criar');
    if (!anteriores.length) { aoVoltar(); return; }
    irPara(anteriores[anteriores.length - 1].id);
  };

  /* ---------- atalhos de teclado (navegador): 1 a 9 escolhem a opção; Enter continua nas perguntas de várias respostas ---------- */
  useEffect(() => {
    if (Platform.OS !== 'web' || fase !== 'pergunta') return undefined;
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if ((alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = /^[1-9]$/.test(e.key) ? Number(e.key) : 0;
      if (passo.tipo === 'sotaque' && n && n <= SOTAQUES.length) escolherSotaque(SOTAQUES[n - 1]);
      else if (passo.tipo === 'opcoes' && n && n <= passo.opcoes.length) escolher(passo, passo.opcoes[n - 1]);
      else if (passo.tipo === 'multi' && n && n <= passo.opcoes.length) alternar(passo, passo.opcoes[n - 1]);
      else if (passo.tipo === 'multi' && e.key === 'Enter' && marcadas.length) responder(marcadas);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  });

  /* ---------- tamanhos ---------- */
  const campoAberto = fase === 'pergunta' && (passo.tipo === 'campo' || passo.tipo === 'entrar');
  const opcoesAbertas = fase === 'pergunta' && (passo.tipo === 'sotaque' || passo.tipo === 'opcoes' || passo.tipo === 'multi');   // sobra pouca altura: o orbe encolhe para as opções caberem
  /* com o zoom, a janela "cabe" menos unidades: as contas usam a janela já dividida por k. O tamanho já inclui a moldura do orbe. */
  const orbe = Math.round(Math.min(campoAberto ? 176 : opcoesAbertas ? 196 : 276, (width / k) * (campoAberto ? 0.5 : 0.72), (height / k) * 0.34));
  /* a etapa em que a conversa está, contando só as perguntas */
  const perguntas = passos.filter((p) => p.tipo !== 'fala' && p.tipo !== 'criar');
  const etapa = Math.max(1, passos.slice(0, indice + 1).filter((p) => p.tipo !== 'fala' && p.tipo !== 'criar').length);
  const doisDigitos = (n: number) => String(n).padStart(2, '0');

  if (recuperando) {
    return <RecuperarSenha emailInicial={email} aoVoltar={() => setRecuperando(false)} aoConcluir={(e) => { setEmail(e); setSenha(''); setErro(''); setRecuperando(false); }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      {/* a mesma pista vermelha da tela inicial, um pouco mais apagada: aqui quem manda é a conversa */}
      <FundoCena cena="pista" forca={1} veu={false} />
      <LinearGradient pointerEvents="none" colors={['rgba(8,4,20,0.56)', 'rgba(8,4,20,0.5)', 'rgba(8,4,20,0.6)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: largo ? 'center' : 'flex-start', paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }}
        >
          <View style={[st.coluna, largo ? st.colunaLarga : null, k !== 1 ? ({ zoom: k } as object) : null]}>
            {largo ? <Cantos /> : null}
            {/* topo: voltar e o progresso */}
            <View style={st.topo}>
              {largo ? <View style={st.botaoTopo} /> : (
                <Pressable accessibilityRole="button" accessibilityLabel={indice <= 0 ? 'Voltar para o início' : 'Voltar uma pergunta'} onPress={voltar} hitSlop={8} style={st.botaoTopo}>
                  <Icone nome="voltar" tamanho={22} cor="#ffffff" />
                </Pressable>
              )}
              <View style={{ flex: 1 }} />
              <View style={st.botaoTopo} />
            </View>
            {modo === 'cadastro' ? (
              <View>
                <View style={st.etapa}>
                  <T tam={10.5} mono cor={cores.texto3} style={{ letterSpacing: 2 }}>CRIAR CONTA</T>
                  <T tam={10.5} mono cor={cores.destaque2} style={{ letterSpacing: 2 }}>ETAPA {doisDigitos(etapa)} · {doisDigitos(perguntas.length)}</T>
                </View>
                <View style={st.trilho} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progresso * 100) }}>
                  <View style={[st.trilhoCheio, { width: `${Math.max(3, progresso * 100)}%` }]} />
                </View>
              </View>
            ) : null}

            <View style={{ alignItems: 'center', marginTop: 6 }}>
              <Orbe
                hud tamanho={orbe} estado={estadoOrbe} pulso={teclas} aoPressionar={tocarNoOrbe}
                rotulo={fase === 'falando' && !completa ? 'RONDIN. Tocar para pular a fala' : 'RONDIN. Tocar para ouvir a pergunta de novo'}
              />
              <View style={st.estado}>
                <T tam={12.5} peso="500" cor={cores.destaque2} style={{ letterSpacing: 3 }}>RONDIN</T>
                <View style={st.estadoFio} />
                <View style={[st.estadoPonto, { backgroundColor: estadoOrbe === 'falando' ? cores.destaque2 : estadoOrbe === 'ouvindo' ? cores.bom : cores.alerta }]} />
                <T tam={10.5} mono cor={cores.texto2} style={{ letterSpacing: 2 }}>{ROTULO_ESTADO[estadoOrbe]}</T>
              </View>
            </View>

            <Legenda largo={largo} texto={fala} chave={chave} taxa={sotaque.taxa} duracaoMs={duracaoMs} indiceVoz={indiceVoz} completa={completa} aoCompletar={aoCompletarLegenda} />
            {fase === 'falando' && !completa ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Pular a fala" onPress={pular} style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 }}>
                <T tam={12.5} cor={cores.texto3}>Pular fala</T>
              </Pressable>
            ) : null}

            {/* as respostas */}
            {fase === 'pergunta' ? (
              <View style={{ marginTop: 14, width: '100%' }}>
                {passo.tipo === 'sotaque' ? (
                  <View style={st.grade}>
                    {SOTAQUES.map((s, i) => (
                      <Pressable
                        key={s.id} accessibilityRole="button" accessibilityLabel={`${s.nome}, ${s.nota}`} onPress={() => escolherSotaque(s)}
                        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.cartaoSotaque, largo && st.cartaoSotaqueLargo, hovered && st.pilulaSobre, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                      >
                        {largo && i < 9 ? <View style={st.tecla}><T tam={10.5} peso="500" cor={cores.destaque2}>{i + 1}</T></View> : <Icone nome={s.mudo ? 'comentario' : 'tocar'} tamanho={15} cor={cores.destaque2} />}
                        <View style={{ flex: 1 }}>
                          <T tam={13.5} peso="500">{s.nome}</T>
                          <T tam={11.5} cor={cores.texto3} style={{ marginTop: 1 }}>{s.nota}</T>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {passo.tipo === 'opcoes' ? (
                  <View style={st.opcoes}>
                    {passo.opcoes.map((o, i) => <Pilula key={o.id} opcao={o} tecla={largo && i < 9 ? i + 1 : undefined} aoPressionar={() => escolher(passo, o)} />)}
                    {passo.links ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, width: '100%', justifyContent: 'center', marginTop: 4 }}>
                        {[['Termos de Uso', '/termos'], ['Política de Privacidade', '/privacidade']].map(([t, c]) => (
                          <Pressable key={c} accessibilityRole="link" accessibilityLabel={`${t}, abre no navegador`} onPress={() => Linking.openURL(`${SITE}${c}`)} style={{ paddingVertical: 8 }}>
                            <T tam={13} cor={cores.destaque2} style={{ textDecorationLine: 'underline' }}>{t}</T>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {passo.tipo === 'multi' ? (
                  <View>
                    <View style={st.opcoes}>
                      {passo.opcoes.map((o, i) => (
                        <Pilula key={o.id} opcao={o} marcada={marcadas.includes(o.id)} tecla={largo && i < 9 ? i + 1 : undefined} aoPressionar={() => alternar(passo, o)} />
                      ))}
                    </View>
                    <View style={{ marginTop: 18 }}>
                      <Botao orbita titulo="Continuar" desabilitado={marcadas.length === 0} aoPressionar={() => responder(marcadas)} />
                    </View>
                  </View>
                ) : null}

                {passo.tipo === 'campo' ? (
                  <View style={{ gap: 14 }}>
                    <CampoFlutuante
                      key={passo.id} ref={campoRef} rotulo={passo.rotulo} accessibilityLabel={passo.rotulo} value={texto} autoFocus={Platform.OS === 'web'}
                      onChangeText={(v) => { setErro(''); setTeclas((n) => n + 1); setTexto(passo.campo === 'data' ? mascararData(v) : v); }}
                      erro={erro}
                      icone={passo.campo === 'email' ? 'email' : passo.campo === 'senha' ? 'cadeado' : passo.campo === 'data' ? 'calendario' : passo.campo === 'texto' ? 'perfil' : 'evolucao'}
                      secureTextEntry={passo.campo === 'senha' && !verSenha}
                      keyboardType={passo.campo === 'email' ? 'email-address' : passo.campo === 'numero' ? 'decimal-pad' : passo.campo === 'data' ? 'number-pad' : 'default'}
                      autoCapitalize={passo.campo === 'texto' ? 'words' : 'none'} autoCorrect={false}
                      autoComplete={passo.campo === 'email' ? 'email' : passo.campo === 'senha' ? 'new-password' : passo.campo === 'data' ? 'birthdate-full' : passo.id === 'nome' ? 'name' : 'off'}
                      maxLength={passo.campo === 'data' ? 10 : passo.campo === 'numero' ? 6 : 128}
                      returnKeyType="go" onSubmitEditing={() => enviarCampo(passo)}
                      direita={passo.campo === 'senha' ? (
                        <Pressable accessibilityRole="button" accessibilityLabel={verSenha ? 'Esconder senha' : 'Mostrar senha'} hitSlop={6} onPress={() => setVerSenha((v) => !v)} style={st.olho}>
                          <Icone nome={verSenha ? 'olhoFechado' : 'olho'} tamanho={20} cor={verSenha ? cores.destaque2 : cores.texto3} />
                        </Pressable>
                      ) : passo.sufixo ? <T tam={14} cor={cores.texto2} style={{ paddingRight: 16 }}>{passo.sufixo}</T> : undefined}
                    />
                    <Botao orbita titulo="Continuar" icone="setaDireita" aoPressionar={() => enviarCampo(passo)} />
                  </View>
                ) : null}

                {passo.tipo === 'entrar' ? (
                  <View style={{ gap: 14 }}>
                    <CampoFlutuante
                      ref={campoRef} rotulo="E-mail" icone="email" value={email} onChangeText={(v) => { setEmail(v); setErro(''); setTeclas((n) => n + 1); }} autoFocus={Platform.OS === 'web'}
                      valido={emailValido(email)} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" textContentType="emailAddress"
                      returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => senhaRef.current?.focus()}
                    />
                    <CampoFlutuante
                      ref={senhaRef} rotulo="Senha" icone="cadeado" value={senha} onChangeText={(v) => { setSenha(v); setErro(''); setTeclas((n) => n + 1); }} secureTextEntry={!verSenha}
                      autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={fazerLogin}
                      direita={
                        <Pressable accessibilityRole="button" accessibilityLabel={verSenha ? 'Esconder senha' : 'Mostrar senha'} hitSlop={6} onPress={() => setVerSenha((v) => !v)} style={st.olho}>
                          <Icone nome={verSenha ? 'olhoFechado' : 'olho'} tamanho={20} cor={verSenha ? cores.destaque2 : cores.texto3} />
                        </Pressable>
                      }
                    />
                    {erro ? (
                      <View style={st.banner} accessibilityLiveRegion="polite" accessibilityRole="alert">
                        <Icone nome="alerta" tamanho={18} cor={cores.erro} />
                        <T tam={13.5} cor={cores.erro} style={{ flex: 1, lineHeight: 19 }}>{erro}</T>
                      </View>
                    ) : null}
                    <Botao orbita carregando={enviando} titulo={enviando ? 'Entrando…' : 'Entrar'} aoPressionar={fazerLogin} />
                    <Pressable accessibilityRole="button" onPress={() => { parar(); setRecuperando(true); }} style={{ alignSelf: 'center', paddingVertical: 10 }}>
                      <T tam={13.5} cor={cores.destaque2} style={{ textDecorationLine: 'underline' }}>Esqueci a minha senha</T>
                    </Pressable>
                  </View>
                ) : null}

                {passo.tipo === 'criar' && falhou ? (
                  <View style={{ gap: 12 }}>
                    {erro ? <T tam={13.5} cor={cores.erro} centro style={{ lineHeight: 19 }}>{erro}</T> : null}
                    <Botao orbita titulo="Tentar de novo" aoPressionar={() => void criarConta()} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* computador: a seta fica no canto esquerdo da tela, grande */}
      {largo ? (
        <Pressable
          accessibilityRole="button" accessibilityLabel={indice <= 0 ? 'Voltar para o início' : 'Voltar uma pergunta'} onPress={voltar} hitSlop={8}
          style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [st.setaCanto, { top: insets.top + 24 }, (hovered || pressed) && { backgroundColor: cores.cartao2 }]}
        >
          <Icone nome="voltar" tamanho={24} cor="#ffffff" />
        </Pressable>
      ) : null}
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  coluna: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  colunaLarga: { maxWidth: 520, paddingHorizontal: 26, paddingBottom: 24, backgroundColor: 'rgba(8,5,18,0.72)', borderRadius: 4 },
  canto: { position: 'absolute', width: 18, height: 18, borderColor: 'rgba(196,168,255,0.45)' },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  setaCanto: { position: 'absolute', left: 24, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  botaoTopo: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  etapa: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  trilho: { height: 2, borderRadius: 1, backgroundColor: cores.linha },
  trilhoCheio: { height: 2, borderRadius: 1, backgroundColor: cores.destaque2, boxShadow: '0 0 8px rgba(196,168,255,0.9)' },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  estadoFio: { width: 18, height: 1, backgroundColor: cores.linha2, marginHorizontal: 2 },
  estadoPonto: { width: 6, height: 6, borderRadius: 3 },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, minHeight: 88, paddingHorizontal: 4 },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  pilula: {
    minHeight: 44, paddingVertical: 9, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: cores.linha2,
    backgroundColor: `rgba(${cores.tom},0.07)`, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, maxWidth: '100%',
  },
  pilulaSobre: { borderColor: 'rgba(196,168,255,0.7)', backgroundColor: `rgba(${cores.tom},0.16)`, boxShadow: '0 0 18px -6px rgba(139,92,246,0.9)' },
  pilulaMarcada: { backgroundColor: cores.destaqueForte, borderColor: cores.destaque2, boxShadow: '0 0 18px -6px rgba(139,92,246,0.95)' },
  tecla: { width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(196,168,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cartaoSotaque: {
    flexGrow: 1, flexBasis: '47%', minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1, borderColor: cores.linha2, backgroundColor: `rgba(${cores.tom},0.07)`,
  },
  cartaoSotaqueLargo: { flexBasis: '30%', minWidth: 140 },   // computador: as duas vozes lado a lado
  olho: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,107,129,0.35)', backgroundColor: 'rgba(255,107,129,0.08)',
  },
}));
