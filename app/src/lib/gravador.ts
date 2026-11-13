/* Gravar a resposta do recado: até um minuto por resposta, com a onda do volume ao vivo (expo-audio). `iniciar` pede o
   microfone e começa; `terminar` para e devolve o áudio. Passado o limite, para sozinho e avisa por `aoLimite`. */
import { requestRecordingPermissionsAsync, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { marcarVivo } from './audioGuardado';
import { BARRAS, nivelDe, resumir } from './onda';

export const LIMITE_SEGUNDOS = 60;

export type Gravacao = { uri: string; segundos: number; onda: number[] };
export type ResultadoInicio = 'ok' | 'sem-permissao' | 'erro';

export function useGravador(aoLimite: () => void) {
  const gravador = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [niveis, setNiveis] = useState<number[]>([]);
  const t0 = useRef(0);
  const todos = useRef<number[]>([]);   // todos os volumes da gravação, para a onda que fica guardada
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null);
  const aoLimiteRef = useRef(aoLimite);
  aoLimiteRef.current = aoLimite;

  const limpar = useCallback(() => { if (intervalo.current) { clearInterval(intervalo.current); intervalo.current = null; } }, []);
  useEffect(() => limpar, [limpar]);

  const iniciar = useCallback(async (): Promise<ResultadoInicio> => {
    try {
      const permissao = await requestRecordingPermissionsAsync();
      if (!permissao.granted) return 'sem-permissao';
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await gravador.prepareToRecordAsync();
      gravador.record();
      todos.current = [];
      setSegundos(0); setNiveis([]); setGravando(true);
      t0.current = Date.now();
      intervalo.current = setInterval(() => {
        const s = Math.round((Date.now() - t0.current) / 1000);
        setSegundos(s);
        /* volume da voz agora; sem medidor (alguns aparelhos), uma onda suave para mostrar que está gravando */
        let db: number | undefined;
        try { db = gravador.getStatus().metering; } catch { db = undefined; }
        const n = db === undefined ? 0.25 + Math.abs(Math.sin(Date.now() / 180)) * 0.45 : nivelDe(db);
        todos.current.push(n);
        setNiveis((v) => [...v.slice(-(BARRAS - 1)), n]);
        if (s >= LIMITE_SEGUNDOS) aoLimiteRef.current();
      }, 100);
      return 'ok';
    } catch {
      limpar(); setGravando(false);
      return 'erro';
    }
  }, [gravador, limpar]);

  const terminar = useCallback(async (): Promise<Gravacao | null> => {
    limpar();
    const dur = Math.min(LIMITE_SEGUNDOS, Math.round((Date.now() - t0.current) / 1000));
    try {
      await gravador.stop();
      setGravando(false);
      if (gravador.uri && dur > 0) {
        marcarVivo(gravador.uri);
        return { uri: gravador.uri, segundos: dur, onda: resumir(todos.current) };
      }
    } catch { setGravando(false); }
    return null;
  }, [gravador, limpar]);

  return { gravando, segundos, niveis, iniciar, terminar };
}
