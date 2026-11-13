/* O RONDIN ouvindo: "Olá Rondin" em qualquer lugar do app, e a transcrição das respostas do recado. Só no navegador, onde existe
   o reconhecimento de fala (SpeechRecognition); no aplicativo do celular isso precisaria de um módulo nativo novo e não existe.

   Privacidade, por escrito:
   - nada fica ouvindo sem a pessoa ter ligado. O botão fica em Configurações ("Chamar o RONDIN pela voz") e na chegada, com
     o aviso do que acontece; sem esse sim, o microfone nem é pedido;
   - o reconhecimento é o do próprio navegador, e no Chrome o áudio vai para o serviço de fala do Google para virar texto. O RONDO
     não grava, não guarda e não envia essas frases a lugar nenhum: o texto só serve para achar o nome e para a reação do RONDIN;
   - a escuta para sozinha enquanto o RONDIN fala ou a pessoa grava (para ele não se ouvir) e quando a aba está escondida;
   - desligar em Configurações vale na hora. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { idiomaDoChamado, ouveChamado } from './chamado';
import type { Idioma } from './rondinSotaques';

const NA_WEB = Platform.OS === 'web';
const CHAVE = 'yy.escuta.v1';

/* ---------- o reconhecimento do navegador (tipos mínimos: não vêm no TypeScript) ---------- */
type Resultado = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type Evento = { resultIndex: number; results: ArrayLike<Resultado> };
type Reconhecedor = {
  continuous: boolean; interimResults: boolean; lang: string; maxAlternatives: number;
  onresult: ((e: Evento) => void) | null; onerror: ((e: { error?: string }) => void) | null; onend: (() => void) | null; onspeechstart: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};
const construtor = (): (new () => Reconhecedor) | null => {
  if (!NA_WEB || typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconhecedor; webkitSpeechRecognition?: new () => Reconhecedor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
export const escutaDisponivel = (): boolean => construtor() !== null;

export const LINGUA: Record<Idioma, string> = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

/* ---------- o sim da pessoa (guardado no aparelho) ---------- */
let ligada = false;
const ouvintes = new Set<() => void>();
const avisarTodos = () => ouvintes.forEach((f) => f());
AsyncStorage.getItem(CHAVE).then((v) => { if (v === '1' && !ligada) { ligada = true; avisarTodos(); } }).catch(() => {});

export const escutaLigada = (): boolean => ligada;
function definir(v: boolean): void {
  ligada = v;
  AsyncStorage.setItem(CHAVE, v ? '1' : '0').catch(() => {});
  avisarTodos();
}
export const desligarEscuta = (): void => definir(false);

/* liga depois de pedir o microfone (precisa vir de um toque da pessoa) */
export async function ligarEscuta(): Promise<'ok' | 'negado' | 'indisponivel'> {
  if (!escutaDisponivel()) return 'indisponivel';
  try {
    const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
    fluxo.getTracks().forEach((t) => t.stop());
  } catch {
    return 'negado';
  }
  definir(true);
  return 'ok';
}

export function useEscutaLigada(): boolean {
  const [v, setV] = useState(ligada);
  useEffect(() => { const f = () => setV(ligada); ouvintes.add(f); f(); return () => { ouvintes.delete(f); }; }, []);
  return v;
}

/* ---------- pausas: o RONDIN falando, a pessoa gravando ---------- */
let pausas = 0;
const ouvintesPausa = new Set<() => void>();
const mexeuPausa = () => ouvintesPausa.forEach((f) => f());
export function usePausarEscuta(pausar: boolean): void {
  useEffect(() => {
    if (!pausar) return undefined;
    pausas += 1; mexeuPausa();
    return () => { pausas -= 1; mexeuPausa(); };
  }, [pausar]);
}
function usePausada(): boolean {
  const [v, setV] = useState(pausas > 0);
  useEffect(() => { const f = () => setV(pausas > 0); ouvintesPausa.add(f); f(); return () => { ouvintesPausa.delete(f); }; }, []);
  return v;
}
function useAbaVisivel(): boolean {
  const [v, setV] = useState(true);
  useEffect(() => {
    if (!NA_WEB || typeof document === 'undefined') return undefined;
    const f = () => setV(document.visibilityState !== 'hidden');
    f();
    document.addEventListener('visibilitychange', f);
    return () => document.removeEventListener('visibilitychange', f);
  }, []);
  return v;
}

/* ---------- ouvir "Olá Rondin" ---------- */
const OUTRAS = ['en-US', 'pt-BR', 'es-ES', 'fr-FR', 'it-IT', 'de-DE'];
/* o navegador entende uma língua por vez: a da pessoa vem de duas em duas rodadas, e entre elas as outras, uma de cada vez */
const linguaDaRodada = (principal: string, n: number): string => {
  if (n % 2 === 0) return principal;
  const outras = OUTRAS.filter((l) => l !== principal);
  return outras[Math.floor(n / 2) % outras.length];
};

function comecarEscuta(principal: string, aoChamar: (idioma?: Idioma) => void, aoNegar: () => void): () => void {
  const Ctor = construtor();
  if (!Ctor) return () => undefined;
  let parado = false;
  let rodada = 0;
  let falhas = 0;
  let atual: Reconhecedor | null = null;
  let agenda: ReturnType<typeof setTimeout> | null = null;
  let vigia: ReturnType<typeof setTimeout> | null = null;
  let ultimo = 0;

  const soltar = (r: Reconhecedor | null) => {
    if (!r) return;
    r.onresult = null; r.onerror = null; r.onend = null; r.onspeechstart = null;
    try { r.abort(); } catch { /* já parado */ }
  };

  const iniciar = () => {
    if (parado) return;
    const r = new Ctor();
    atual = r;
    r.continuous = true; r.interimResults = true; r.maxAlternatives = 3;
    r.lang = linguaDaRodada(principal, rodada);
    r.onspeechstart = () => { if (vigia) { clearTimeout(vigia); vigia = null; } };
    r.onresult = (e) => {
      falhas = 0;
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const res = e.results[i];
        for (let j = 0; j < res.length; j += 1) {
          const frase = res[j].transcript;
          if (ouveChamado(frase) && Date.now() - ultimo > 4000) {
            ultimo = Date.now();
            aoChamar(idiomaDoChamado(frase));
            return;
          }
        }
      }
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { parado = true; aoNegar(); return; }
      if (e.error !== 'no-speech' && e.error !== 'aborted') falhas += 1;
    };
    r.onend = () => {
      if (vigia) { clearTimeout(vigia); vigia = null; }
      if (atual === r) atual = null;
      if (parado) return;
      rodada += 1;
      agenda = setTimeout(iniciar, falhas > 2 ? 5000 : 250);   // com falhas seguidas (sem rede, por exemplo) espera mais
    };
    try {
      r.start();
      /* quem fica calado: a rodada acaba logo e passa à próxima língua */
      vigia = setTimeout(() => { try { r.stop(); } catch { /* já acabou */ } }, 12000);
    } catch {
      atual = null;
      agenda = setTimeout(iniciar, 2000);
    }
  };

  agenda = setTimeout(iniciar, 200);
  return () => {
    parado = true;
    if (agenda) clearTimeout(agenda);
    if (vigia) clearTimeout(vigia);
    soltar(atual);
  };
}

/* Liga a escuta enquanto `ativo`, a pessoa tiver dito sim, nada estiver pausando e a aba estiver à vista. */
export function useEscutaDoChamado({ ativo, idioma, aoChamar }: { ativo: boolean; idioma: Idioma; aoChamar: (idioma?: Idioma) => void }): void {
  const sim = useEscutaLigada();
  const pausada = usePausada();
  const visivel = useAbaVisivel();
  const aoChamarRef = useRef(aoChamar);
  aoChamarRef.current = aoChamar;
  const rodar = ativo && sim && !pausada && visivel && escutaDisponivel();
  useEffect(() => {
    if (!rodar) return undefined;
    return comecarEscuta(LINGUA[idioma], (i) => aoChamarRef.current(i), () => desligarEscuta());   // sem permissão do microfone: desliga e não insiste
  }, [rodar, idioma]);
}

/* ---------- transcrever a resposta do recado (só com o sim da pessoa) ---------- */
export type Transcricao = { terminar: () => Promise<string> };

export function iniciarTranscricao(idioma: Idioma): Transcricao | null {
  if (!ligada) return null;
  const Ctor = construtor();
  if (!Ctor) return null;
  const r = new Ctor();
  r.continuous = true; r.interimResults = true; r.maxAlternatives = 1; r.lang = LINGUA[idioma];
  let finais = '';
  let parcial = '';
  let ativa = true;
  let aoAcabar: (() => void) | null = null;
  r.onresult = (e) => {
    parcial = '';
    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      const res = e.results[i];
      const t = res[0]?.transcript ?? '';
      if (res.isFinal) finais += ` ${t}`; else parcial += ` ${t}`;
    }
  };
  r.onerror = () => undefined;
  r.onend = () => {
    if (ativa) { try { r.start(); } catch { /* não reabriu: fica com o que já ouviu */ } return; }   // o navegador encerra com o silêncio: reabre enquanto a pessoa grava
    aoAcabar?.();
  };
  try { r.start(); } catch { return null; }
  return {
    terminar: () => new Promise<string>((ok) => {
      let feito = false;
      const fim = () => { if (feito) return; feito = true; ok(`${finais} ${parcial}`.replace(/\s+/g, ' ').trim()); };
      ativa = false;
      aoAcabar = fim;
      setTimeout(fim, 900);   // o navegador pode demorar a avisar: não segura a conversa
      try { r.stop(); } catch { fim(); }
    }),
  };
}
