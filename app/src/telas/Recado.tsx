/* Recado de voz: uma pergunta por dia, respondida em áudio de até um minuto, para ser ouvida no futuro.
   Enquanto grava, a onda mostra o volume da sua voz. No plano grátis: um recado por dia e um esperando por vez;
   no PRO, sem limite. No fim, "Seu ano em áudio" resume o ano para compartilhar (sem expor o conteúdo dos áudios). */
import { requestRecordingPermissionsAsync, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Share, View } from 'react-native';
import { Folha, Tela, useAviso } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Botao, Cartao, Chip, T, Titulo } from '../componentes/Ui';
import { PERGUNTAS, PRAZOS_RECADO } from '../dados';
import { useLoja } from '../estado/loja';
import { dataLonga, doIso, iso, mmss, somarDias } from '../lib/datas';
import { cores } from '../tema';
import type { Recado as TRecado } from '../tipos';

const LIMITE = 60;
const BARRAS = 40;

/* a pergunta do dia: a mesma para todo mundo no mesmo dia */
export const perguntaDoDia = () => Math.floor(Date.now() / 86400000) % PERGUNTAS.length;

/* volume em dBFS (-160 a 0) para a altura da barra (0 a 1) */
const nivelDe = (db: number | undefined) => (db === undefined ? 0 : Math.min(1, Math.max(0.06, (db + 55) / 55)));
/* onda de enfeite, para quando ainda não há som: a mesma do site */
const ONDA_PARADA = Array.from({ length: BARRAS }, (_, i) => Math.min(1, (18 + Math.abs(Math.sin(i * 1.7) * 52) + ((i * 37) % 22)) / 100));
/* resume a gravação inteira em BARRAS barras, para mostrar na lista */
function resumir(niveis: number[]): number[] {
  if (!niveis.length) return [];
  return Array.from({ length: BARRAS }, (_, i) => {
    const de = Math.floor((i / BARRAS) * niveis.length), ate = Math.max(de + 1, Math.floor(((i + 1) / BARRAS) * niveis.length));
    const fatia = niveis.slice(de, ate);
    return Math.round((fatia.reduce((a, b) => a + b, 0) / fatia.length) * 100) / 100;
  });
}

/* ---------- a onda ---------- */
function Onda({ niveis, altura = 64, ativa, cor = cores.destaque2 }: { niveis: number[]; altura?: number; ativa?: boolean; cor?: string }) {
  const barras = niveis.length >= BARRAS ? niveis.slice(-BARRAS) : [...Array(BARRAS - niveis.length).fill(0.06), ...niveis];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: altura, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {barras.map((n, i) => (
        <View key={i} style={{ flex: 1, height: Math.max(3, n * altura), borderRadius: 2, backgroundColor: cor, opacity: ativa ? 0.45 + n * 0.55 : 0.5 }} />
      ))}
    </View>
  );
}

/* botão de ouvir um áudio */
function Ouvir({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status.playing ? 'Pausar' : 'Ouvir'}
      onPress={() => {
        if (status.playing) { player.pause(); return; }
        if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.1)) player.seekTo(0);
        player.play();
      }}
      style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2, borderWidth: 1, borderColor: cores.linha2 }}
    >
      <Icone nome={status.playing ? 'parar' : 'tocar'} tamanho={18} />
    </Pressable>
  );
}

/* ---------- seu ano em áudio ---------- */
function SeuAno({ recados }: { recados: TRecado[] }) {
  const ano = new Date().getFullYear();
  const doAno = recados.filter((r) => new Date(r.criado).getFullYear() === ano);
  if (!doAno.length) return null;
  const segundos = doAno.reduce((a, r) => a + r.segundos, 0);
  const contagem = new Map<string, number>();
  doAno.forEach((r) => contagem.set(r.pergunta, (contagem.get(r.pergunta) ?? 0) + 1));
  const [maisRespondida] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0];
  const meses = new Set(doAno.map((r) => new Date(r.criado).getMonth())).size;
  const ouvidos = doAno.filter((r) => r.entrega <= iso()).length;

  const compartilhar = () => Share.share({
    message: `Meu ${ano} em áudio no RONDO: ${doAno.length} ${doAno.length === 1 ? 'recado' : 'recados'} para o meu eu do futuro, ${Math.max(1, Math.round(segundos / 60))} min de voz em ${meses} ${meses === 1 ? 'mês' : 'meses'}. Compita com quem você foi ontem.`,
  }).catch(() => {});

  return (
    <>
      <Titulo>Seu ano em áudio</Titulo>
      <Cartao destaque>
        <T tam={11} mono cor={cores.texto3}>{ano}</T>
        <View style={{ flexDirection: 'row', marginTop: 10, gap: 12 }}>
          {[[String(doAno.length), doAno.length === 1 ? 'recado' : 'recados'], [mmss(segundos), 'de voz'], [String(ouvidos), 'já ouvidos']].map(([n, rotulo]) => (
            <View key={rotulo} style={{ flex: 1 }}>
              <T tam={28} peso="200">{n}</T>
              <T tam={12} cor={cores.texto2}>{rotulo}</T>
            </View>
          ))}
        </View>
        <T tam={12} cor={cores.texto3} style={{ marginTop: 14 }}>A pergunta que você mais respondeu</T>
        <T tam={15} style={{ marginTop: 2, lineHeight: 21 }}>{maisRespondida}</T>
        <Botao pequeno tipo="fantasma" icone="compartilhar" titulo="Compartilhar o card" aoPressionar={compartilhar} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
        <T tam={11} cor={cores.texto3} style={{ marginTop: 8 }}>O card leva só os números, nunca o conteúdo dos áudios.</T>
      </Cartao>
    </>
  );
}

export function Recado() {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const hoje = iso();
  const [pergunta, setPergunta] = useState(perguntaDoDia);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [niveis, setNiveis] = useState<number[]>([]);
  const [rascunho, setRascunho] = useState<{ uri: string; segundos: number; onda: number[] } | null>(null);
  const [prazo, setPrazo] = useState(90);
  const [apagando, setApagando] = useState(false);
  const gravador = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const t0 = useRef(0);
  const todos = useRef<number[]>([]);   // todos os volumes da gravação, para a onda que fica guardada
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalo.current) clearInterval(intervalo.current); }, []);

  /* plano grátis: um recado por dia e um esperando por vez */
  const gravouHoje = estado.recados.some((r) => iso(new Date(r.criado)) === hoje);
  const esperando = estado.recados.filter((r) => r.entrega > hoje).length;
  const bloqueio = estado.pro ? null
    : gravouHoje ? 'Você já gravou o recado de hoje. Amanhã chega uma nova pergunta.'
    : esperando >= 1 ? 'No plano grátis, um recado espera por vez. Quando ele chegar, grave o próximo.'
    : null;

  const parar = async (auto = false) => {
    if (intervalo.current) { clearInterval(intervalo.current); intervalo.current = null; }
    const dur = Math.min(LIMITE, Math.round((Date.now() - t0.current) / 1000));
    try {
      await gravador.stop();
      setGravando(false);
      if (gravador.uri && dur > 0) {
        setRascunho({ uri: gravador.uri, segundos: dur, onda: resumir(todos.current) });
        if (auto) avisar('Limite de 1 minuto atingido.');
      }
    } catch {
      setGravando(false);
      avisar('Não foi possível terminar a gravação.');
    }
  };

  const iniciar = async () => {
    if (bloqueio) { avisar(bloqueio); return; }
    try {
      const permissao = await requestRecordingPermissionsAsync();
      if (!permissao.granted) { avisar('Sem permissão para usar o microfone.'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await gravador.prepareToRecordAsync();
      gravador.record();
      setRascunho(null);
      setSegundos(0);
      setNiveis([]);
      todos.current = [];
      setGravando(true);
      t0.current = Date.now();
      intervalo.current = setInterval(() => {
        const s = Math.round((Date.now() - t0.current) / 1000);
        setSegundos(s);
        // volume da voz agora; sem medidor (alguns aparelhos), uma onda suave para mostrar que está gravando
        let db: number | undefined;
        try { db = gravador.getStatus().metering; } catch { db = undefined; }
        const n = db === undefined ? 0.25 + Math.abs(Math.sin(Date.now() / 180)) * 0.45 : nivelDe(db);
        todos.current.push(n);
        setNiveis((v) => [...v.slice(-(BARRAS - 1)), n]);
        if (s >= LIMITE) parar(true);
      }, 100);
    } catch {
      setGravando(false);
      avisar('Não foi possível usar o microfone neste aparelho.');
    }
  };

  const guardar = () => {
    if (!rascunho) return;
    const entrega = iso(somarDias(new Date(), prazo));
    commit((e) => {
      e.recados.unshift({ id: `r${Date.now()}`, criado: Date.now(), entrega, pergunta: PERGUNTAS[pergunta], segundos: rascunho.segundos, uri: rascunho.uri, onda: rascunho.onda });
    });
    setRascunho(null);
    avisar(`Recado guardado. Chega a você em ${dataLonga(entrega)}.`);
  };

  /* apaga os áudios do aparelho e a lista */
  const apagarTudo = () => {
    estado.recados.forEach((r) => {
      if (Platform.OS !== 'web' && r.uri.startsWith('file:')) {
        try { new File(r.uri).delete(); } catch { /* já não existia */ }
      }
    });
    commit((e) => { e.recados = []; });
    setApagando(false);
    avisar('Todos os recados foram apagados.');
  };

  const onda = gravando ? niveis : rascunho ? rascunho.onda : ONDA_PARADA;

  return (
    <Tela>
      <T tam={15} peso="400" centro>Recado de voz</T>
      <T tam={13} centro cor={cores.texto2} style={{ marginTop: 6, lineHeight: 21 }}>Fale com quem você vai ser. Grave hoje, ouça no futuro.</T>

      <Cartao destaque style={{ marginTop: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T tam={11} mono cor={cores.texto3}>PERGUNTA DO DIA</T>
          {estado.pro ? <Chip texto="PRO · sem limite" /> : null}
        </View>
        <T tam={26} peso="200" style={{ lineHeight: 32, marginTop: 8 }}>{PERGUNTAS[pergunta]}</T>
        {!gravando && !rascunho ? (
          <Pressable accessibilityRole="button" onPress={() => setPergunta((p) => (p + 1) % PERGUNTAS.length)} style={{ marginTop: 10, alignSelf: 'flex-start', paddingVertical: 6 }}>
            <T tam={13} cor={cores.texto2} style={{ textDecorationLine: 'underline' }}>Outra pergunta</T>
          </Pressable>
        ) : null}

        <View style={{ marginTop: 18 }}>
          <Onda niveis={onda} ativa={gravando || !!rascunho} cor={gravando ? cores.erro : cores.destaque2} />
        </View>

        <View style={{ alignItems: 'center', marginTop: 16, gap: 12 }}>
          <T tam={44} peso="200" mono={false}>{mmss(rascunho && !gravando ? rascunho.segundos : segundos)}</T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={gravando ? 'Parar gravação' : 'Gravar recado'}
            accessibilityState={{ disabled: !!bloqueio && !gravando }}
            onPress={() => (gravando ? parar() : iniciar())}
            style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', opacity: bloqueio && !gravando ? 0.45 : 1, backgroundColor: gravando ? cores.erro : cores.destaque, borderWidth: 6, borderColor: gravando ? 'rgba(255,107,129,0.3)' : `rgba(${cores.tom},0.3)` }}
          >
            <Icone nome={gravando ? 'parar' : 'recado'} tamanho={30} cor="#ffffff" />
          </Pressable>
          <T tam={12} centro cor={cores.texto3} style={{ lineHeight: 18 }}>
            {gravando ? 'Gravando… toque para parar (máx. 1:00)' : rascunho ? 'Gravado. Ouça, escolha o prazo e guarde.' : bloqueio ?? 'Toque para gravar (máx. 1:00)'}
          </T>
        </View>

        {rascunho && !gravando ? (
          <View style={{ marginTop: 18, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ouvir uri={rascunho.uri} />
              <T tam={14} cor={cores.texto2}>Ouvir o recado</T>
            </View>
            <View>
              <T tam={11} mono cor={cores.texto3} style={{ marginBottom: 8 }}>ENTREGAR A MIM EM</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PRAZOS_RECADO.map((p) => {
                  const ativo = p.dias === prazo;
                  return (
                    <Pressable key={p.dias} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => setPrazo(p.dias)} style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: 8, backgroundColor: ativo ? cores.destaqueForte : 'transparent', borderWidth: 1, borderColor: ativo ? cores.destaqueForte : cores.linha2 }}>
                      <T tam={13} peso={ativo ? '500' : '300'} cor={ativo ? '#ffffff' : cores.texto2}>{p.nome}</T>
                    </Pressable>
                  );
                })}
              </View>
              <T tam={12} cor={cores.texto3} style={{ marginTop: 8 }}>Chega em {dataLonga(iso(somarDias(new Date(), prazo)))}.</T>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Botao titulo="Guardar recado" icone="ok" aoPressionar={guardar} style={{ flex: 1 }} />
              <Botao tipo="discreto" titulo="Descartar" aoPressionar={() => setRascunho(null)} />
            </View>
          </View>
        ) : null}
      </Cartao>

      {!estado.pro ? (
        <T tam={12} cor={cores.texto3} style={{ marginTop: 10, lineHeight: 18 }}>
          Plano grátis: um recado por dia e um esperando por vez. No PRO, recados para o futuro sem limite e o seu ano em áudio completo.
        </T>
      ) : null}

      <Titulo>Meus recados</Titulo>
      {estado.recados.length === 0 ? (
        <T tam={14} cor={cores.texto2} style={{ lineHeight: 21 }}>Nenhum ainda. Que tal gravar por que você está começando e ouvir daqui a 90 dias?</T>
      ) : (
        <View style={{ gap: 12 }}>
          {estado.recados.map((r) => {
            const liberado = r.entrega <= hoje;
            const faltam = Math.max(0, Math.ceil((doIso(r.entrega).getTime() - doIso(hoje).getTime()) / 86400000));
            return (
              <Cartao key={r.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {liberado ? (
                    <Ouvir uri={r.uri} />
                  ) : (
                    <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 }}>
                      <Icone nome="cadeado" tamanho={18} cor={cores.texto3} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <T tam={14} linhas={2}>{r.pergunta}</T>
                    <T tam={12} cor={cores.texto3} style={{ marginTop: 2 }}>{mmss(r.segundos)} · {liberado ? 'pronto para ouvir' : `chega em ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`}</T>
                  </View>
                  {liberado ? <Chip texto="liberado" tom="bom" /> : null}
                </View>
                {r.onda?.length ? <View style={{ marginTop: 12 }}><Onda niveis={r.onda} altura={26} cor={liberado ? cores.destaque2 : cores.texto3} /></View> : null}
              </Cartao>
            );
          })}
        </View>
      )}

      <SeuAno recados={estado.recados} />

      <Titulo>Privacidade</Titulo>
      <T tam={13} cor={cores.texto2} style={{ lineHeight: 20 }}>
        Seu áudio é só seu: os recados ficam neste aparelho, nada é público e você pode apagar tudo quando quiser. O recado é um diário, não um serviço de terapia.
      </T>
      {estado.recados.length ? (
        <Botao pequeno tipo="perigo" icone="lixo" titulo="Apagar todos os recados" aoPressionar={() => setApagando(true)} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
      ) : null}

      <Folha aberta={apagando} aoFechar={() => setApagando(false)} titulo="Apagar todos os recados?">
        <T tam={14} style={{ lineHeight: 21 }}>
          {estado.recados.length} {estado.recados.length === 1 ? 'recado será apagado' : 'recados serão apagados'} deste aparelho, inclusive os que ainda não chegaram. Não dá para desfazer.
        </T>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Botao tipo="perigo" titulo="Apagar tudo" aoPressionar={apagarTudo} style={{ flex: 1 }} />
          <Botao tipo="discreto" titulo="Cancelar" aoPressionar={() => setApagando(false)} />
        </View>
      </Folha>
    </Tela>
  );
}
