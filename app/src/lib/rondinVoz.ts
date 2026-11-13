/* A voz do RONDIN. Cada frase tem dois caminhos:
   1. áudio pronto (mp3 gerado na ElevenLabs, voz "Will", por scripts/gerar-vozes.mjs, em public/vozes/<sotaque>/<frase>.mp3), que é a voz boa;
   2. a voz do aparelho (expo-speech), quando a frase não tem áudio (ex.: mensagem de erro do servidor) ou o áudio não carrega.
   O arquivo vozes/manifest.json diz quais frases têm áudio e quanto duram. Sem nenhum dos dois, o RONDIN segue só com a legenda. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { URL_API } from '../api/cliente';
import { hashFala } from './hashFala';
import type { Trecho } from './rondinRoteiro';
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

/* ---------- trechos que mudam de pessoa para pessoa (nome, quilos): o servidor gera o áudio na hora ----------
   Se o servidor demorar (ele dorme no plano grátis) ou falhar, o trecho é pulado e a conversa segue. */
const PRAZO_DINAMICO_MS = 3500;
const urlsDinamicas = new Map<string, string>();
async function buscarDinamico(texto: string, sotaque: string): Promise<string | null> {
  if (!URL_API) return null;
  const falado = texto.replace(/(\d),(\d)/g, '$1 vírgula $2');   // "4,5" se fala "quatro vírgula cinco"
  const chave = `${sotaque}|${falado}`;
  const guardada = urlsDinamicas.get(chave);
  if (guardada) return guardada;
  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), PRAZO_DINAMICO_MS);
  try {
    const r = await fetch(`${URL_API}/rondin/voz`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controle.signal,
      body: JSON.stringify({ texto: falado, sotaque }),
    });
    if (!r.ok) return null;
    const { url } = (await r.json()) as { url?: string };
    if (!url) return null;
    urlsDinamicas.set(chave, `${URL_API}${url}`);
    return urlsDinamicas.get(chave) ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(prazo);
  }
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

/* O nome da marca é lido com a sílaba forte no começo (RÔN-do). Escrito em maiúsculas, os sintetizadores tendem a ler "rondó" (a palavra
   da música, com o acento no fim). "Rôndo" tem o mesmo tamanho de "RONDO", então o índice das palavras na legenda não muda. */
export const comoSeFala = (texto: string): string => texto.replace(/RONDO/gi, 'Rôndo');

function falarComAparelho(texto: string, sotaque: Sotaque, minha: number, aoPalavra?: (i: number) => void): Promise<void> {
  return new Promise((resolve) => {
    encerrarAtual = resolve;
    void (async () => {
      try {
        const voice = await escolherVoz(sotaque.lang);
        if (rodada !== minha) { resolve(); return; }
        Speech.speak(comoSeFala(texto), {
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

/* ---------- som bloqueado pelo navegador ----------
   Os navegadores não deixam uma página tocar som antes de a pessoa tocar nela (clique, toque ou tecla). A apresentação do
   RONDIN fala sozinha assim que a página abre, então no navegador a primeira fala pode ser recusada. Quando isso acontece,
   o RONDIN marca o som como bloqueado (a tela mostra "toque para ouvir") e, no primeiro toque em qualquer lugar, avisa quem
   estiver escutando (`useSomBloqueado`) para ele falar de novo, desde o começo. No celular isso não existe. */
let somBloqueado = false;
const avisosBloqueio = new Set<(bloqueado: boolean) => void>();
const GESTOS = ['pointerdown', 'keydown', 'touchend'] as const;
function marcarBloqueado(): void {
  if (somBloqueado || typeof window === 'undefined') return;
  somBloqueado = true;
  avisosBloqueio.forEach((f) => f(true));
  const liberar = () => {
    GESTOS.forEach((ev) => window.removeEventListener(ev, liberar, true));
    somBloqueado = false;
    avisosBloqueio.forEach((f) => f(false));
  };
  GESTOS.forEach((ev) => window.addEventListener(ev, liberar, true));
}
export function useSomBloqueado(): boolean {
  const [b, setB] = useState(somBloqueado);
  useEffect(() => { avisosBloqueio.add(setB); setB(somBloqueado); return () => { avisosBloqueio.delete(setB); }; }, []);
  return b;
}

type Resultado = 'tocou' | 'falhou' | 'bloqueado';

/* no navegador, o player do próprio navegador: ele diz na hora se o som foi recusado (o do expo-audio não diz) */
function tocarNoNavegador(url: string, aoComecar?: () => void): Promise<Resultado> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    let pronto = false;
    const acabar = (r: Resultado) => {
      if (pronto) return;
      pronto = true;
      clearTimeout(espera);
      audio.onended = null;
      audio.onerror = null;
      if (!audio.ended) audio.pause();
      if (encerrarAtual === sair) encerrarAtual = null;
      resolve(r);
    };
    const sair = () => acabar('tocou');   // parar(): não toca a voz do aparelho por cima
    const espera = setTimeout(() => acabar('falhou'), 8000);
    encerrarAtual = sair;
    audio.onended = () => acabar('tocou');
    audio.onerror = () => acabar('falhou');
    audio.play().then(() => { clearTimeout(espera); aoComecar?.(); }).catch((e: { name?: string }) => acabar(e?.name === 'NotAllowedError' ? 'bloqueado' : 'falhou'));
  });
}

/* toca o mp3 e diz o que aconteceu ('falhou': o chamador usa a voz do aparelho; 'bloqueado': o navegador recusou o som) */
function tocarArquivo(url: string, aoComecar?: () => void): Promise<Resultado> {
  if (Platform.OS === 'web') return tocarNoNavegador(url, aoComecar);
  return tocarNoAparelho(url, aoComecar).then((ok): Resultado => (ok ? 'tocou' : 'falhou'));
}

function tocarNoAparelho(url: string, aoComecar?: () => void): Promise<boolean> {
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
        if (s.playing) { clearTimeout(espera); aoComecar?.(); }
        if (s.didJustFinish) acabar(true);
      });
      jogador.play();
    } catch {
      acabar(false);
    }
  });
}

/* Fala os trechos em ordem (a legenda mostra o texto inteiro). Trecho fixo: mp3 pronto, ou a voz do aparelho se faltar. Trecho
   dinâmico (nome, quilos): áudio do servidor; se não vier no prazo, é pulado (ou, se a frase toda está sem áudio pronto, sai na
   voz do aparelho junto com o resto). `aoFim` roda quando acabou (na hora, no modo só texto). `aoDuracao` avisa a duração total
   quando todos os trechos têm áudio pronto, para a legenda andar no ritmo real. `aoPalavra` avisa o avanço da voz do aparelho. */
/* ---------- a voz desligada (o botão de alto-falante): vale para todas as falas do RONDIN e fica guardada no aparelho ----------
   Desligada, o RONDIN segue só com a legenda, no mesmo ritmo. */
const CHAVE_MUDO = 'yy.rondin.mudo';
let desligada = false;
const ouvintes = new Set<(v: boolean) => void>();
AsyncStorage.getItem(CHAVE_MUDO).then((v) => { if (v === '1') { desligada = true; ouvintes.forEach((f) => f(true)); } }).catch(() => {});
export const vozDesligada = (): boolean => desligada;
export function definirVozDesligada(v: boolean): void {
  desligada = v;
  if (v) parar();
  AsyncStorage.setItem(CHAVE_MUDO, v ? '1' : '0').catch(() => {});
  ouvintes.forEach((f) => f(v));
}
export function useVozDesligada(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(desligada);
  useEffect(() => { ouvintes.add(setV); setV(desligada); return () => { ouvintes.delete(setV); }; }, []);
  return [v, definirVozDesligada];
}

/* `aoComecar`: avisa quando o som começa de verdade (o navegador aceitou tocar), para a tela só mostrar a legenda nessa hora:
   assim, se o navegador recusar o som, a legenda não aparece e some (o "pisca" da apresentação) */
export function falar(
  itens: (string | Trecho)[], sotaque: Sotaque, aoFim: () => void,
  aoPalavra?: (indice: number) => void, aoDuracao?: (ms: number) => void, aoComecar?: () => void,
): void {
  parar();
  const minha = rodada;
  let comecou = false;
  const comecar = () => { if (!comecou && rodada === minha) { comecou = true; aoComecar?.(); } };
  const fim = () => { if (rodada === minha) { comecar(); aoFim(); } };
  if (sotaque.mudo || desligada) { fim(); return; }
  const trechos: Trecho[] = itens.map((x) => (typeof x === 'string' ? { texto: x, dinamico: false } : x));
  /* os pedidos ao servidor saem já, enquanto os primeiros trechos tocam */
  const dinamicos = trechos.map((x) => (x.dinamico ? buscarDinamico(x.texto, sotaque.id) : null));
  void (async () => {
    const m = await carregarManifesto();
    if (rodada !== minha) return;
    const duracoes = trechos.map((x) => (x.dinamico ? undefined : m?.[sotaque.id]?.[hashFala(x.texto)]));
    const fixosComAudio = trechos.every((x, i) => x.dinamico || duracoes[i] !== undefined);
    if (fixosComAudio && !trechos.some((x) => x.dinamico)) aoDuracao?.(duracoes.reduce<number>((a, d) => a + (d as number), 0) * 1000);
    /* sempre tenta tocar: o Chrome e o Edge liberam o som quando a pessoa chega por um clique no próprio site (o "Criar
       conta"), mesmo sem tocar na página nova; se o navegador recusar, a fala volta no primeiro toque (useSomBloqueado) */
    let deslocamento = 0;
    for (let i = 0; i < trechos.length; i += 1) {
      if (rodada !== minha) return;
      const x = trechos[i];
      let tocou = false;
      if (x.dinamico) {
        const url = await dinamicos[i];
        if (rodada !== minha) return;
        const res: Resultado = url ? await tocarArquivo(url, comecar) : 'falhou';
        if (res === 'bloqueado') { marcarBloqueado(); if (rodada === minha) aoFim(); return; }
        tocou = res === 'tocou';
        if (!tocou && fixosComAudio) { deslocamento += x.texto.length + 1; continue; }   // o resto está em áudio bom: pula só este trecho
      } else {
        const res: Resultado = duracoes[i] !== undefined ? await tocarArquivo(`${BASE_AUDIO}/${sotaque.id}/${hashFala(x.texto)}.mp3`, comecar) : 'falhou';
        if (res === 'bloqueado') { marcarBloqueado(); if (rodada === minha) aoFim(); return; }
        tocou = res === 'tocou';
      }
      if (rodada !== minha) return;
      if (!tocou) {
        const base = deslocamento;
        comecar();
        await falarComAparelho(x.texto, sotaque, minha, aoPalavra ? (c) => aoPalavra(base + c) : undefined);
      }
      deslocamento += x.texto.length + 1;
    }
    fim();
  })();
}
