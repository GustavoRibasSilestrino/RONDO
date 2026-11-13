/* O recado do dia, com o RONDIN. Em vez de uma tela de gravação, uma conversa: ele faz a pergunta do dia (uma pergunta de
   filosofia, lib/perguntas.ts), a pessoa responde em voz alta, ele reage e faz a segunda pergunta, a pessoa responde de novo
   e ele encerra. A pessoa pode não responder ("Agora não") e, no fim, escolhe: guardar as respostas no diário de recados
   (telas/Diario.tsx) ou descartá-las. O que ele diz está em lib/rondinConversa.ts; a voz, em lib/rondinVoz.ts.

   A tela é a mesma da conversa do cadastro: o orbe, a legenda palavra por palavra e as respostas embaixo. Ela abre em dois
   lugares: como tela do app (pelo Feed, pelo Perfil ou por "Olá Rondin") e como a chegada (componentes/Chegada.tsx), por cima
   de tudo, quando a pessoa abre o app no dia. Plano grátis: uma conversa guardada por dia; PRO, sem limite. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BotaoCanto, CenaRondin } from '../componentes/CenaRondin';
import { Folha, useAviso } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { OndaRecado } from '../componentes/OndaRecado';
import { OuvirRecado } from '../componentes/OuvirRecado';
import { Botao, T } from '../componentes/Ui';
import { useLoja } from '../estado/loja';
import { apagarAudio, guardarAudio } from '../lib/audioGuardado';
import { iso, mmss } from '../lib/datas';
import { iniciarTranscricao, usePausarEscuta, type Transcricao } from '../lib/escuta';
import { useGravador, type Gravacao } from '../lib/gravador';
import { definirInterceptadorVoltar } from '../lib/interceptarVoltar';
import type { EstadoOrbe } from '../lib/orbe';
import { PERGUNTAS_DO_DIA, indiceDaPergunta } from '../lib/perguntas';
import { CONVERSA, encerrarConversa, escolher, reagir } from '../lib/rondinConversa';
import { achaSotaque, sotaquePadrao } from '../lib/rondinVoz';
import { useFalaRondin } from '../lib/useFalaRondin';
import { cores, estilos } from '../tema';

type Fase = 'pergunta' | 'gravando' | 'reagindo' | 'fim' | 'salvando' | 'pronto';
type Final = 'guardado' | 'descartado' | 'pulou' | 'bloqueado';

type Props = {
  aoSair: () => void;       // voltar (ou entrar no app, na chegada)
  aoDiario: () => void;     // abrir o diário de recados
  chegada?: boolean;        // aberta pela chegada: o botão de sair diz "Entrar"
  atraso?: number;          // ms antes de ele começar a falar (a abertura preta ainda está na tela)
};

export function Recado({ aoSair, aoDiario, chegada, atraso = 0 }: Props) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();

  /* a língua da conversa é a que a pessoa escolheu no cadastro; sem ela, a do aparelho */
  const sotaque = useMemo(() => (estado.perfilFit ? achaSotaque(estado.perfilFit.sotaque) : sotaquePadrao()), [estado.perfilFit]);
  const idioma = sotaque.idioma;
  const ui = CONVERSA[idioma].ui;
  const falas = CONVERSA[idioma].falas;
  const hoje = iso();

  /* quantas conversas já foram guardadas hoje: o plano grátis tem uma; no PRO, a pergunta seguinte vem depois das de hoje */
  const gruposHoje = useMemo(
    () => new Set(estado.recados.filter((r) => iso(new Date(r.criado)) === hoje).map((r) => r.grupo ?? r.id)).size,
    [estado.recados, hoje],
  );
  const inicial = useRef(gruposHoje).current;   // fixo enquanto a tela está aberta: guardar não troca a pergunta embaixo da pessoa
  const bloqueado = !estado.pro && inicial >= 1;
  const [extra, setExtra] = useState(0);
  const deslocamento = inicial + extra;
  const pergunta = PERGUNTAS_DO_DIA[indiceDaPergunta(new Date(), deslocamento)];
  const semente = indiceDaPergunta(new Date(), deslocamento);

  const [fase, setFase] = useState<Fase>(bloqueado ? 'pronto' : 'pergunta');
  const [final, setFinal] = useState<Final | null>(bloqueado ? 'bloqueado' : null);
  const [turno, setTurno] = useState<1 | 2>(1);
  const [rascunhos, setRascunhos] = useState<Gravacao[]>([]);
  const [erro, setErro] = useState('');
  const [saindo, setSaindo] = useState(false);
  const textos = useRef<string[]>([]);
  const transcricao = useRef<Transcricao | null>(null);
  const ocupado = useRef(false);
  const saiu = useRef(false);

  usePausarEscuta(true);   // enquanto o RONDIN fala ou a pessoa grava, "Olá Rondin" não escuta (ele ouviria a si mesmo)
  const fala = useFalaRondin(sotaque);
  const gravador = useGravador(() => { void terminarGravacao(true); });

  const sairDeVez = useCallback(() => {
    if (saiu.current) return;
    saiu.current = true;
    aoSair();
  }, [aoSair]);

  /* a primeira fala: a pergunta (ou, no plano grátis que já conversou hoje, o aviso) */
  useEffect(() => {
    const id = setTimeout(() => { fala.dizer([bloqueado ? falas.jaHoje : pergunta[idioma]]); }, atraso);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => { void transcricao.current?.terminar(); }, []);

  /* ---------- responder: grava a resposta ---------- */
  const responder = async () => {
    if (ocupado.current || fase === 'gravando') return;
    ocupado.current = true;
    fala.calar(); setErro('');
    const r = await gravador.iniciar();
    ocupado.current = false;
    if (r === 'sem-permissao') { setErro(ui.semMicrofone); return; }
    if (r === 'erro') { setErro(ui.erroGravar); return; }
    transcricao.current = iniciarTranscricao(idioma);   // só com o sim da pessoa (lib/escuta.ts); sem ele, null
    setFase('gravando');
  };

  const terminarGravacao = async (auto = false) => {
    if (ocupado.current) return;
    ocupado.current = true;
    const t = transcricao.current;
    transcricao.current = null;
    const [g, texto] = await Promise.all([gravador.terminar(), t ? t.terminar() : Promise.resolve('')]);
    ocupado.current = false;
    if (!g) { setErro(ui.erroGravar); setFase(turno === 1 ? 'pergunta' : 'reagindo'); return; }
    if (auto) avisar(ui.limite);
    textos.current[turno - 1] = texto;
    setRascunhos((v) => [...v, g]);
    if (turno === 1) {
      /* a reação e a segunda pergunta, ditas juntas */
      setTurno(2); setFase('reagindo');
      fala.dizer([reagir(idioma, texto, semente), pergunta.seguir[idioma]]);
    } else {
      setFase('fim');
      fala.dizer(encerrarConversa(idioma, texto, semente + 1, false));
    }
  };

  const terminarCedo = () => {
    setFase('fim');
    fala.dizer([escolher(CONVERSA[idioma].encerrar, semente)]);
  };

  const outraPergunta = () => {
    const proxima = PERGUNTAS_DO_DIA[indiceDaPergunta(new Date(), deslocamento + 1)];
    setExtra((x) => x + 1); setErro('');
    fala.dizer([proxima[idioma]]);
  };

  /* "Agora não": ele aceita, e a tela fecha sozinha quando ele termina de falar */
  const naoResponder = () => {
    setFinal('pulou'); setFase('pronto');
    fala.dizer([falas.naoResponder], () => setTimeout(sairDeVez, 600));
  };

  /* ---------- guardar no diário ou descartar ---------- */
  const guardar = async () => {
    if (fase === 'salvando') return;
    setFase('salvando'); fala.calar();
    const base = Date.now();
    const grupo = `g${base}`;
    const itens = await Promise.all(rascunhos.map(async (g, i) => {
      const id = `r${base}-${i + 1}`;
      return {
        id, criado: base + i, entrega: hoje, pergunta: i === 0 ? pergunta[idioma] : pergunta.seguir[idioma],
        segundos: g.segundos, uri: await guardarAudio(id, g.uri), onda: g.onda, grupo, turno: i + 1,
      };
    }));
    commit((e) => { e.recados.unshift(...itens.slice().reverse()); });   // o mais novo (a segunda resposta) fica na frente
    setRascunhos([]); setFinal('guardado'); setFase('pronto');
    fala.dizer([falas.guardado]);
  };

  const descartarRascunhos = () => { rascunhos.forEach((g) => { void apagarAudio({ id: '-', uri: g.uri }); }); };
  const descartar = () => {
    fala.calar(); descartarRascunhos();
    setRascunhos([]); setFinal('descartado'); setFase('pronto');
    fala.dizer([falas.descartado]);
  };

  const abrirDiario = () => { fala.calar(); aoDiario(); };

  /* a seta: com respostas ainda não guardadas, confirma antes de perdê-las */
  const sair = () => {
    if (rascunhos.length && fase !== 'pronto' && fase !== 'salvando') { setSaindo(true); return; }
    fala.calar();
    sairDeVez();
  };
  const sairDescartando = () => { setSaindo(false); fala.calar(); descartarRascunhos(); sairDeVez(); };

  /* o botão voltar do Android passa pela mesma seta (e pela mesma pergunta, se houver respostas por guardar) */
  const sairRef = useRef(sair);
  sairRef.current = sair;
  useEffect(() => {
    definirInterceptadorVoltar(() => { sairRef.current(); return true; });
    return () => definirInterceptadorVoltar(null);
  }, []);

  const estadoOrbe: EstadoOrbe = fase === 'gravando' ? 'ouvindo'
    : fase === 'salvando' ? 'pensando'
      : fala.falando && !fala.completa ? 'falando'
        : fase === 'pronto' ? 'quieto' : 'ouvindo';

  const guardou = final === 'guardado' || final === 'bloqueado';

  return (
    <CenaRondin
      sotaque={sotaque} fala={fala} estadoOrbe={estadoOrbe}
      rotuloOrbe={fala.falando && !fala.completa ? ui.pularFala : ui.repetirFala}
      rotuloVoltar={chegada ? ui.entrar : ui.voltar} aoVoltar={sair} iconeVoltar={chegada ? 'fechar' : 'voltar'}
      direita={<BotaoCanto icone="calendario" rotulo={ui.diario} aoPressionar={abrirDiario} />}
    >
      {erro ? <T tam={13.5} cor={cores.erro} centro style={{ lineHeight: 19, marginTop: 8 }}>{erro}</T> : null}

      <View style={st.acoes}>
        {fase === 'pergunta' ? (
          <>
            <Botao orbita icone="recado" titulo={ui.responder} aoPressionar={() => void responder()} />
            <Botao tipo="discreto" titulo={ui.agoraNao} aoPressionar={naoResponder} />
            <Pressable accessibilityRole="button" onPress={outraPergunta} style={{ alignSelf: 'center', paddingVertical: 8 }}>
              <T tam={13.5} cor={cores.texto2} style={{ textDecorationLine: 'underline' }}>{ui.outraPergunta}</T>
            </Pressable>
          </>
        ) : null}

        {fase === 'gravando' ? (
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={{ width: '100%' }}><OndaRecado niveis={gravador.niveis} ativa cor={cores.erro} /></View>
            <T tam={40} peso="200">{mmss(gravador.segundos)}</T>
            <Pressable
              accessibilityRole="button" accessibilityLabel={ui.parar} onPress={() => void terminarGravacao()}
              style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.erro, borderWidth: 6, borderColor: 'rgba(255,107,129,0.3)' }}
            >
              <Icone nome="parar" tamanho={30} cor="#ffffff" />
            </Pressable>
            <T tam={12} centro cor={cores.texto3}>{ui.gravando}</T>
          </View>
        ) : null}

        {fase === 'reagindo' ? (
          <>
            <Botao orbita icone="recado" titulo={ui.responder} aoPressionar={() => void responder()} />
            <Botao tipo="discreto" titulo={ui.terminar} aoPressionar={terminarCedo} />
          </>
        ) : null}

        {fase === 'fim' ? (
          <>
            {rascunhos.map((g, i) => (
              <View key={i} style={st.linhaAudio}>
                <OuvirRecado uri={g.uri} rotulo={ui.ouvir} />
                <View style={{ flex: 1 }}>
                  <T tam={13.5} linhas={2} style={{ lineHeight: 18 }}>{i === 0 ? pergunta[idioma] : pergunta.seguir[idioma]}</T>
                  <T tam={12} cor={cores.texto3} style={{ marginTop: 2 }}>{mmss(g.segundos)}</T>
                </View>
              </View>
            ))}
            <Botao orbita icone="ok" titulo={ui.guardar} aoPressionar={() => void guardar()} />
            <Botao tipo="discreto" icone="lixo" titulo={ui.descartar} aoPressionar={descartar} />
          </>
        ) : null}

        {fase === 'pronto' ? (
          <>
            {guardou ? <Botao orbita icone="calendario" titulo={ui.abrirDiario} aoPressionar={abrirDiario} /> : null}
            <Botao tipo={guardou ? 'discreto' : 'primario'} orbita={!guardou} titulo={chegada ? ui.entrar : ui.voltar} aoPressionar={sairDeVez} />
          </>
        ) : null}
      </View>

      <Folha aberta={saindo} aoFechar={() => setSaindo(false)} titulo={ui.sairTitulo}>
        <T tam={14} style={{ lineHeight: 21 }}>{ui.sairTexto}</T>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Botao tipo="perigo" titulo={ui.sairDescartar} aoPressionar={sairDescartando} style={{ flex: 1 }} />
          <Botao tipo="discreto" titulo={ui.ficar} aoPressionar={() => setSaindo(false)} />
        </View>
      </Folha>
    </CenaRondin>
  );
}

const st = estilos(() => StyleSheet.create({
  acoes: { marginTop: 14, width: '100%', gap: 10 },
  linhaAudio: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1,
    borderColor: cores.linha2, backgroundColor: `rgba(${cores.tom},0.07)`,
  },
}));
