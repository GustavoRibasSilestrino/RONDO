/* A voz do RONDIN. Cada frase tem dois caminhos:
   1. áudio pronto (mp3 gerado no ElevenLabs por scripts/gerar-vozes.mjs, em public/vozes/<sotaque>/<frase>.mp3), que é a voz boa;
   2. a voz do aparelho (expo-speech), quando a frase não tem áudio (ex.: mensagem de erro do servidor) ou o áudio não carrega.
   O arquivo vozes/manifest.json diz quais frases têm áudio e quanto duram. Sem nenhum dos dois, o RONDIN segue só com a legenda. */
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { hashFala } from './hashFala';
import type { Sotaque } from './rondinSotaques';

export * from './rondinSotaques';

/* onde ficam os áudios: no navegador, no mesmo site do app; no celular, no endereço público do site */
const BASE_AUDIO = Platform.OS === 'web' ? '/app/vozes' : 'https://userondo.vercel.app/app/vozes';

type Manifesto = Record<string, Record<string, number>>;   // sotaque -> frase (hash) -> duração em segundos
let manifesto: Promise<Manifesto | null> | null = null;
function carregarManifesto(): Promise<Manifesto | null> {
  if (!manifesto) {
    manifesto = fetch(`${BASE_AUDIO}/manifest.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Manifesto>) : null))
      .catch(() => null)
      .then((m) => { if (!m) manifesto = null; return m; });   // falhou: tenta de novo na próxima fala
  }
  return manifesto;
}

/* ---------- voz do aparelho (plano B) ---------- */
let vozes: Speech.Voice[] | null = null;
let lendoVozes: Promise<Speech.Voice[]> | null = null;
async function listarVozes(): Promise<Speech.Voice[]> {
  if (vozes && vozes.length) return vozes;
  if (!lendoVozes) {
    lendoVozes = (async () => {
      for (let i = 0; i < 4; i += 1) {   // o navegador pode devolver a lista vazia nas primeiras vezes
        try {
          const v = await Speech.getAvailableVoicesAsync();
          if (v.length) { vozes = v; return v; }
        } catch { /* sem lista de vozes: usa a padrão */ }
        await new Promise((r) => setTimeout(r, 250));
      }
      return [];
    })().finally(() => { lendoVozes = null; });
  }
  return lendoVozes;
}

/* a melhor voz do idioma: prefere as "naturais"/"Google"/"Online" e a qualidade melhor */
async function escolherVoz(lang: string): Promise<string | undefined> {
  const todas = await listarVozes();
  const base = lang.slice(0, 2).toLowerCase();
  const igual = todas.filter((v) => v.language?.replace('_', '-').toLowerCase() === lang.toLowerCase());
  const doIdioma = igual.length ? igual : todas.filter((v) => v.language?.toLowerCase().startsWith(base));
  if (!doIdioma.length) return undefined;
  const nota = (v: Speech.Voice) =>
    (/natural|online|neural/i.test(v.name ?? '') ? 3 : 0) + (/google/i.test(v.name ?? '') ? 2 : 0) + (v.quality === 'Enhanced' ? 1 : 0);
  return [...doIdioma].sort((a, b) => nota(b) - nota(a))[0].identifier;
}

let rodada = 0;   // cada fala nova invalida a anterior: um "acabou" atrasado não dispara o passo errado
let encerrarAtual: (() => void) | null = null;   // solta a espera da frase que está tocando

export function parar(): void {
  rodada += 1;
  encerrarAtual?.();
  try { void Speech.stop(); } catch { /* nada falando */ }
}

function falarComAparelho(texto: string, sotaque: Sotaque, minha: number, aoPalavra?: (i: number) => void): Promise<void> {
  return new Promise((resolve) => {
    encerrarAtual = resolve;
    void (async () => {
      try {
        const voice = await escolherVoz(sotaque.lang);
        if (rodada !== minha) { resolve(); return; }
        Speech.speak(texto, {
          language: sotaque.lang, pitch: sotaque.tom, rate: sotaque.taxa, voice,
          onDone: () => resolve(), onStopped: () => resolve(), onError: () => resolve(),
          onBoundary: ((e: { charIndex?: number }) => { if (rodada === minha && typeof e.charIndex === 'number') aoPalavra?.(e.charIndex); }) as never,
        });
      } catch {
        resolve();
      }
    })();
  });
}

/* toca o mp3; devolve false se não deu para tocar (o chamador usa a voz do aparelho) */
function tocarArquivo(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let jogador: AudioPlayer | null = null;
    let pronto = false;
    const acabar = (ok: boolean) => {
      if (pronto) return;
      pronto = true;
      clearTimeout(espera);
      try { jogador?.remove(); } catch { /* já solto */ }
      if (encerrarAtual === sair) encerrarAtual = null;
      resolve(ok);
    };
    const sair = () => acabar(true);   // parar(): não toca a voz do aparelho por cima
    const espera = setTimeout(() => acabar(false), 8000);   // não começou a tocar: desiste e usa a voz do aparelho
    try {
      jogador = createAudioPlayer({ uri: url });
      encerrarAtual = sair;
      jogador.addListener('playbackStatusUpdate', (s) => {
        if (s.playing) clearTimeout(espera);
        if (s.didJustFinish) acabar(true);
      });
      jogador.play();
    } catch {
      acabar(false);
    }
  });
}

/* Fala os trechos em ordem (a legenda mostra todos juntos). Para cada um usa o áudio pronto, se houver, ou a voz do aparelho.
   `aoFim` roda quando acabou (na hora, no modo só texto). `aoDuracao` avisa a duração total quando todos os trechos têm áudio,
   para a legenda andar no ritmo real. `aoPalavra` avisa o avanço da voz do aparelho no texto, quando ela informa. */
export function falar(
  trechos: string[], sotaque: Sotaque, aoFim: () => void,
  aoPalavra?: (indice: number) => void, aoDuracao?: (ms: number) => void,
): void {
  parar();
  const minha = rodada;
  const fim = () => { if (rodada === minha) aoFim(); };
  if (sotaque.mudo) { fim(); return; }
  void (async () => {
    const m = await carregarManifesto();
    if (rodada !== minha) return;
    const duracoes = trechos.map((t) => m?.[sotaque.id]?.[hashFala(t)]);
    if (duracoes.every((d) => d !== undefined)) aoDuracao?.(duracoes.reduce<number>((a, d) => a + (d as number), 0) * 1000);
    let deslocamento = 0;
    for (let i = 0; i < trechos.length; i += 1) {
      if (rodada !== minha) return;
      const texto = trechos[i];
      const tocou = duracoes[i] !== undefined && (await tocarArquivo(`${BASE_AUDIO}/${sotaque.id}/${hashFala(texto)}.mp3`));
      if (rodada !== minha) return;
      if (!tocou) {
        const base = deslocamento;
        await falarComAparelho(texto, sotaque, minha, aoPalavra ? (c) => aoPalavra(base + c) : undefined);
      }
      deslocamento += texto.length + 1;
    }
    fim();
  })();
}
