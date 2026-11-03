/* Recado de voz: uma pergunta por dia, respondida em áudio de até um minuto, para ser ouvida no futuro. */
import { requestRecordingPermissionsAsync, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder } from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Tela, useAviso } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Botao, Cartao, Chip, T, Titulo } from '../componentes/Ui';
import { PERGUNTAS, PRAZOS_RECADO } from '../dados';
import { useLoja } from '../estado/loja';
import { dataLonga, doIso, iso, mmss, somarDias } from '../lib/datas';
import { cores } from '../tema';

const LIMITE = 60;

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

export function Recado() {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const hoje = iso();
  const [pergunta, setPergunta] = useState(() => Math.floor(Date.now() / 86400000) % PERGUNTAS.length);
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [rascunho, setRascunho] = useState<{ uri: string; segundos: number } | null>(null);
  const [prazo, setPrazo] = useState(90);
  const gravador = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const t0 = useRef(0);
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalo.current) clearInterval(intervalo.current); }, []);

  const parar = async (auto = false) => {
    if (intervalo.current) { clearInterval(intervalo.current); intervalo.current = null; }
    const dur = Math.min(LIMITE, Math.round((Date.now() - t0.current) / 1000));
    try {
      await gravador.stop();
      setGravando(false);
      if (gravador.uri && dur > 0) {
        setRascunho({ uri: gravador.uri, segundos: dur });
        if (auto) avisar('Limite de 1 minuto atingido.');
      }
    } catch {
      setGravando(false);
      avisar('Não foi possível terminar a gravação.');
    }
  };

  const iniciar = async () => {
    try {
      const permissao = await requestRecordingPermissionsAsync();
      if (!permissao.granted) { avisar('Sem permissão para usar o microfone.'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await gravador.prepareToRecordAsync();
      gravador.record();
      setRascunho(null);
      setSegundos(0);
      setGravando(true);
      t0.current = Date.now();
      intervalo.current = setInterval(() => {
        const s = Math.round((Date.now() - t0.current) / 1000);
        setSegundos(s);
        if (s >= LIMITE) parar(true);
      }, 250);
    } catch {
      setGravando(false);
      avisar('Não foi possível usar o microfone neste aparelho.');
    }
  };

  const guardar = () => {
    if (!rascunho) return;
    const entrega = iso(somarDias(new Date(), prazo));
    commit((e) => {
      e.recados.unshift({ id: `r${Date.now()}`, criado: Date.now(), entrega, pergunta: PERGUNTAS[pergunta], segundos: rascunho.segundos, uri: rascunho.uri });
    });
    setRascunho(null);
    avisar(`Recado guardado. Chega a você em ${dataLonga(entrega)}.`);
  };

  return (
    <Tela>
      <T tam={36} peso="200">Recado de voz</T>
      <T tam={14} cor={cores.texto2} style={{ marginTop: 6, lineHeight: 21 }}>Fale com quem você vai ser. Grave hoje, ouça no futuro.</T>

      <Cartao destaque style={{ marginTop: 22 }}>
        <T tam={11} mono cor={cores.destaque2}>PERGUNTA DO DIA</T>
        <T tam={26} peso="200" style={{ marginTop: 8, lineHeight: 32 }}>{PERGUNTAS[pergunta]}</T>
        {!gravando && !rascunho ? (
          <Pressable accessibilityRole="button" onPress={() => setPergunta((p) => (p + 1) % PERGUNTAS.length)} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
            <T tam={13} cor={cores.texto2} style={{ textDecorationLine: 'underline' }}>Outra pergunta</T>
          </Pressable>
        ) : null}

        <View style={{ alignItems: 'center', marginTop: 22, gap: 12 }}>
          <T tam={44} peso="200" mono={false}>{mmss(rascunho && !gravando ? rascunho.segundos : segundos)}</T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={gravando ? 'Parar gravação' : 'Gravar recado'}
            onPress={() => (gravando ? parar() : iniciar())}
            style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: gravando ? cores.erro : cores.destaque, borderWidth: 6, borderColor: gravando ? 'rgba(255,107,129,0.3)' : 'rgba(139,92,246,0.3)' }}
          >
            <Icone nome={gravando ? 'parar' : 'recado'} tamanho={30} cor="#ffffff" />
          </Pressable>
          <T tam={12} cor={cores.texto3}>{gravando ? 'Gravando… toque para parar (máx. 1:00)' : rascunho ? 'Gravado. Ouça, escolha o prazo e guarde.' : 'Toque para gravar (máx. 1:00)'}</T>
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
                    <Pressable key={p.dias} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => setPrazo(p.dias)} style={{ paddingVertical: 9, paddingHorizontal: 16, borderRadius: 8, backgroundColor: ativo ? cores.destaque : 'transparent', borderWidth: 1, borderColor: ativo ? cores.destaque : cores.linha2 }}>
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
              </Cartao>
            );
          })}
        </View>
      )}
      <T tam={11} cor={cores.texto3} style={{ marginTop: 18, lineHeight: 17 }}>
        Os áudios são íntimos: ficam só no seu aparelho e nada é público. O recado é um diário, não um serviço de terapia.
      </T>
    </Tela>
  );
}
