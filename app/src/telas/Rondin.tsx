/* O RONDIN: um agente que conversa com a pessoa para entrar ou criar a conta. Ele se apresenta, pergunta o sotaque,
   fala cada pergunta em voz alta (a legenda vai surgindo palavra por palavra embaixo do orbe) e mostra as opções ou o
   campo para responder. No cadastro, as respostas viram o perfil da conta (altura, peso, objetivo, rotina...) e são
   salvas no servidor junto com ela. O roteiro está em lib/rondinRoteiro.ts e a voz em lib/rondinVoz.ts. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { cadastrar, entrar } from '../api/conta';
import { CampoFlutuante, CampoRef } from '../componentes/CampoFlutuante';
import { Icone } from '../componentes/Icone';
import { Orbe } from '../componentes/Orbe';
import { Botao, T } from '../componentes/Ui';
import { useMovimentoReduzido } from '../lib/movimento';
import { EstadoOrbe } from '../lib/orbe';
import { Dita, FALAS, Opcao, Passo, Respostas, emailValido, lerData, mascararData, montarPerfil, passosCadastro, passosEntrar, primeiroNome, trechosDe } from '../lib/rondinRoteiro';
import { SOTAQUES, Sotaque, falar, parar, sotaquePadrao } from '../lib/rondinVoz';
import { cores, estilos } from '../tema';
import type { Estado, Usuario } from '../tipos';
import { SITE } from './Login';

export type Modo = 'entrar' | 'cadastro';
/* o que ele diz: um texto, ou um modelo com lugares para o nome e os números ("Prazer, {nome}!") */
type Fala = string | Dita;
type AoEntrar = (usuario: Usuario, extra?: Partial<Estado>) => void;

/* ---------- a legenda: as palavras surgem no ritmo da fala; a última fica em destaque ---------- */
function Legenda({ texto, chave, taxa, duracaoMs, indiceVoz, completa, aoCompletar }: { texto: string; chave: number; taxa: number; duracaoMs: number; indiceVoz: number; completa: boolean; aoCompletar: () => void }) {
  const palavras = useMemo(() => texto.split(/\s+/).filter(Boolean), [texto]);
  const inicios = useMemo(() => { let i = 0; return palavras.map((p) => { const o = texto.indexOf(p, i); i = o + p.length; return o; }); }, [palavras, texto]);
  const [n, setN] = useState(0);
  const reduzido = useMovimentoReduzido();
  const fim = useRef(aoCompletar);
  fim.current = aoCompletar;

  useEffect(() => {   // fala nova: recomeça
    setN(0);
  }, [chave]);

  useEffect(() => {   // o relógio: uma palavra por vez, mais devagar se a palavra for longa
    if (completa || reduzido) { setN(palavras.length); return undefined; }
    if (n >= palavras.length) return undefined;
    const total = palavras.reduce((a, p) => a + p.length + 1, 0);
    /* com o áudio pronto, o tempo de cada palavra vem da duração real; sem ele, uma estimativa */
    const espera = duracaoMs > 0
      ? (n === 0 ? 100 : (duracaoMs * 0.96 * (palavras[n - 1].length + 1)) / total)
      : (n === 0 ? 120 : 150 + 38 * palavras[n - 1].length) / Math.max(0.6, taxa);
    const id = setTimeout(() => setN((v) => v + 1), espera);
    return () => clearTimeout(id);
  }, [n, palavras, taxa, duracaoMs, completa, reduzido]);

  useEffect(() => {   // a voz avisou onde está: a legenda não fica atrás dela
    if (indiceVoz < 0) return;
    const alvo = inicios.filter((o) => o <= indiceVoz + 1).length;
    setN((v) => Math.max(v, Math.min(alvo, palavras.length)));
  }, [indiceVoz, inicios, palavras.length]);

  useEffect(() => {
    if (palavras.length && n >= palavras.length) { const id = setTimeout(() => fim.current(), 280); return () => clearTimeout(id); }
    return undefined;
  }, [n, palavras.length, chave]);

  return (
    <View accessible accessibilityLabel={texto} accessibilityLiveRegion="polite" style={st.legenda}>
      {palavras.map((p, i) => (
        <T key={`${chave}-${i}`} tam={22} peso="300" cor={i === n - 1 ? cores.destaque2 : cores.texto} style={{ opacity: i < n ? 1 : 0, lineHeight: 31 }}>
          {p}{i < palavras.length - 1 ? ' ' : ''}
        </T>
      ))}
    </View>
  );
}

/* ---------- o fundo: grade fina e um clarão roxo no alto ---------- */
function Fundo() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="grade" width={36} height={36} patternUnits="userSpaceOnUse">
            <Path d="M36 0H0V36" fill="none" stroke="rgba(167,139,250,0.07)" strokeWidth={1} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#grade)" />
      </Svg>
      <LinearGradient colors={['rgba(106,0,212,0.34)', 'rgba(106,0,212,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 420 }} />
    </View>
  );
}

/* ---------- o orbe com o anel em volta; o anel pulsa quando ele fala ---------- */
function OrbeRondin({ tamanho, estado }: { tamanho: number; estado: EstadoOrbe }) {
  const pulso = useRef(new Animated.Value(0)).current;
  const reduzido = useMovimentoReduzido();
  useEffect(() => {
    if (reduzido || estado !== 'falando') { pulso.setValue(0); return undefined; }
    const anim = Animated.loop(Animated.timing(pulso, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }));
    anim.start();
    return () => anim.stop();
  }, [estado, reduzido, pulso]);
  const anel = tamanho + 18;
  return (
    <View style={{ width: anel + 40, height: anel + 40, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[st.anel, { width: anel, height: anel, borderRadius: anel / 2, borderColor: 'rgba(196,168,255,0.5)', opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }]} />
      <View pointerEvents="none" style={[st.anel, { width: anel, height: anel, borderRadius: anel / 2 }]} />
      <View style={{ position: 'absolute' }}><Orbe tamanho={tamanho} estado={estado} /></View>
    </View>
  );
}

/* ---------- uma opção para tocar ---------- */
function Pilula({ opcao, marcada, aoPressionar, grande }: { opcao: Opcao; marcada?: boolean; aoPressionar: () => void; grande?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityState={{ selected: !!marcada }} accessibilityLabel={opcao.nota ? `${opcao.rotulo}, ${opcao.nota}` : opcao.rotulo}
      onPress={aoPressionar}
      style={({ pressed }) => [st.pilula, grande && st.pilulaGrande, marcada && st.pilulaMarcada, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
    >
      <T tam={14.5} peso="500" cor={marcada ? cores.branco : cores.texto}>{opcao.rotulo}</T>
      {opcao.nota ? <T tam={12} cor={marcada ? 'rgba(255,255,255,0.85)' : cores.texto3} style={{ marginTop: 2 }}>{opcao.nota}</T> : null}
    </Pressable>
  );
}

export function Rondin({ modo, aoEntrar, aoVoltar }: { modo: Modo; aoEntrar: AoEntrar; aoVoltar: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

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
  const campoRef = useRef<CampoRef>(null), senhaRef = useRef<CampoRef>(null);

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

  /* o orbe: ouve enquanto espera a resposta, fala enquanto fala */
  const estadoOrbe: EstadoOrbe = fase === 'falando' ? 'falando' : fase === 'pergunta' ? 'ouvindo' : 'quieto';

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

  const enviarCampo = (p: Extract<Passo, { tipo: 'campo' }>) => {
    const valor = p.campo === 'senha' ? texto : texto.trim();
    const problema = p.validar(valor, respRef.current);
    if (problema) { setErro(problema); setFase('trabalhando'); dizer([problema], () => { setFase('pergunta'); setTimeout(() => campoRef.current?.focus(), 50); }, sotaqueRef.current, 500); return; }
    responder(valor, p.comentario?.(valor, respRef.current));
  };

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
      if (/e-mail já tem conta/i.test(msg)) {
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

  /* ---------- tamanhos ---------- */
  const campoAberto = fase === 'pergunta' && (passo.tipo === 'campo' || passo.tipo === 'entrar');
  const orbe = Math.round(Math.min(campoAberto ? 150 : 250, width * (campoAberto ? 0.4 : 0.62), height * 0.3));

  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <Fundo />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }}
        >
          <View style={st.coluna}>
            {/* topo: voltar e o progresso */}
            <View style={st.topo}>
              <Pressable accessibilityRole="button" accessibilityLabel={indice <= 0 ? 'Voltar para o início' : 'Voltar uma pergunta'} onPress={voltar} hitSlop={8} style={st.botaoTopo}>
                <Icone nome="voltar" tamanho={22} cor="#ffffff" />
              </Pressable>
              <View style={{ flex: 1 }} />
              <View style={st.botaoTopo} />
            </View>
            {modo === 'cadastro' ? (
              <View style={st.trilho} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progresso * 100) }}>
                <View style={[st.trilhoCheio, { width: `${Math.max(3, progresso * 100)}%` }]} />
              </View>
            ) : null}

            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <OrbeRondin tamanho={orbe} estado={estadoOrbe} />
              <T tam={13} peso="500" cor={cores.destaque2} style={{ letterSpacing: 3, marginTop: -6 }}>RONDIN</T>
            </View>

            <Legenda texto={fala} chave={chave} taxa={sotaque.taxa} duracaoMs={duracaoMs} indiceVoz={indiceVoz} completa={completa} aoCompletar={aoCompletarLegenda} />
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
                    {SOTAQUES.map((s) => (
                      <Pressable
                        key={s.id} accessibilityRole="button" accessibilityLabel={`${s.nome}, ${s.nota}`} onPress={() => escolherSotaque(s)}
                        style={({ pressed }) => [st.cartaoSotaque, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                      >
                        <Icone nome={s.mudo ? 'comentario' : 'tocar'} tamanho={16} cor={cores.destaque2} />
                        <View style={{ flex: 1 }}>
                          <T tam={14.5} peso="500">{s.nome}</T>
                          <T tam={12} cor={cores.texto3} style={{ marginTop: 1 }}>{s.nota}</T>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {passo.tipo === 'opcoes' ? (
                  <View style={st.opcoes}>
                    {passo.opcoes.map((o) => <Pilula key={o.id} opcao={o} aoPressionar={() => escolher(passo, o)} />)}
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
                      {passo.opcoes.map((o) => (
                        <Pilula
                          key={o.id} opcao={o} marcada={marcadas.includes(o.id)}
                          aoPressionar={() => setMarcadas((m) => {
                            if (o.id === passo.exclusiva) return m.includes(o.id) ? [] : [o.id];
                            const sem = m.filter((x) => x !== passo.exclusiva);
                            return sem.includes(o.id) ? sem.filter((x) => x !== o.id) : [...sem, o.id];
                          })}
                        />
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
                      onChangeText={(v) => { setErro(''); setTexto(passo.campo === 'data' ? mascararData(v) : v); }}
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
                      ref={campoRef} rotulo="E-mail" icone="email" value={email} onChangeText={(v) => { setEmail(v); setErro(''); }} autoFocus={Platform.OS === 'web'}
                      valido={emailValido(email)} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" textContentType="emailAddress"
                      returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => senhaRef.current?.focus()}
                    />
                    <CampoFlutuante
                      ref={senhaRef} rotulo="Senha" icone="cadeado" value={senha} onChangeText={(v) => { setSenha(v); setErro(''); }} secureTextEntry={!verSenha}
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
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  coluna: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  botaoTopo: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  trilho: { height: 3, borderRadius: 2, backgroundColor: cores.linha, overflow: 'hidden', marginTop: 4 },
  trilhoCheio: { height: 3, borderRadius: 2, backgroundColor: cores.destaque },
  anel: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(196,168,255,0.28)' },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 18, minHeight: 96, paddingHorizontal: 4 },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  pilula: {
    minHeight: 46, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1, borderColor: cores.linha2,
    backgroundColor: cores.cartao, alignItems: 'center', justifyContent: 'center',
  },
  pilulaGrande: { width: '100%' },
  pilulaMarcada: { backgroundColor: cores.destaqueForte, borderColor: cores.destaque },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cartaoSotaque: {
    flexGrow: 1, flexBasis: '47%', minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 16, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao,
  },
  olho: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,107,129,0.35)', backgroundColor: 'rgba(255,107,129,0.08)',
  },
}));
