/* A trilha sonora da loja de pacotinhos (pedido do dono em 2026-11-18): música de jogo em 8 bits enquanto a pessoa está na
   loja, suspense enquanto o pacote treme e rasga, um estouro no clarão e uma fanfarra de recompensa quando o mascote aparece
   (mais longa quanto mais rara a raridade). Na tela de compra, cada botão faz um clique (2026-11-19).
   Tudo é composto e tocado aqui mesmo, com a Web Audio do navegador (ondas quadradas, triangulares e ruído, como os
   videogames de 8 bits): nenhum arquivo de música, nada de terceiros, sem direitos autorais de ninguém.

   A música toca sem parar (dono, 2026-11-19: "ela tá tocando e parando"): o laço inteiro (8 compassos, ~16 s) é gravado uma
   vez num áudio (OfflineAudioContext) e tocado em repetição pelo próprio motor de áudio do navegador, sem emenda. Antes, cada
   nota era agendada por um relógio do JavaScript, que atrasava quando a página ficava ocupada, e a música engasgava.

   Os navegadores só deixam tocar som depois de um clique na página: vindo de um clique (o botão da tenda, por exemplo), a
   música começa na hora; abrindo o link direto, começa no primeiro clique ou tecla. A escolha de ligar ou desligar o som
   fica guardada neste navegador ("rondo.loja.som"). */

type Raridade = "comum" | "incomum" | "rara" | "epica" | "lendaria";
type Ctx = BaseAudioContext;

const CHAVE = "rondo.loja.som";
let ligado = (() => { try { return localStorage.getItem(CHAVE) !== "0"; } catch { return true; } })();
const ouvintes = new Set<() => void>();

const VOLUME_MUSICA = 0.32;
let ctx: AudioContext | null = null;
let mestre: GainNode, musicaBus: GainNode, efeitosBus: GainNode;

function contexto(): AudioContext | null {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    mestre = ctx.createGain(); mestre.gain.value = ligado ? 1 : 0; mestre.connect(ctx.destination);
    musicaBus = ctx.createGain(); musicaBus.gain.value = VOLUME_MUSICA; musicaBus.connect(mestre);
    efeitosBus = ctx.createGain(); efeitosBus.gain.value = 0.9; efeitosBus.connect(mestre);
  }
  return ctx;
}

/* liga o som assim que o navegador deixar (agora, se já houve um clique na página; senão, no primeiro clique ou tecla) */
function destravar() {
  const c = contexto();
  if (!c || c.state !== "suspended") return;
  void c.resume().catch(() => {});
}
if (typeof window !== "undefined") {
  const tentar = () => { if (ctx && ctx.state === "suspended" && musicaTocando) destravar(); };
  addEventListener("click", tentar, true);
  addEventListener("keydown", tentar, true);
  addEventListener("touchend", tentar, true);
  /* aba escondida: tudo para; de volta, continua de onde estava */
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend().catch(() => {});
    else if (musicaTocando) destravar();
  });
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/* uma nota com envelope curto (o "bip" dos videogames), num contexto qualquer (o ao vivo ou o da gravação do laço) */
function nota(c: Ctx, destino: AudioNode, tipo: OscillatorType, freq: number, inicio: number, dur: number, vol: number, ate?: number) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, inicio);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, inicio + dur);
  g.gain.setValueAtTime(0.0001, inicio);
  g.gain.exponentialRampToValueAtTime(vol, inicio + 0.008);
  g.gain.setValueAtTime(vol, inicio + Math.max(0.01, dur * 0.6));
  g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
  o.connect(g).connect(destino);
  o.start(inicio);
  o.stop(inicio + dur + 0.03);
}

/* ruído filtrado: chimbal, caixa, prato e o "vento" do clarão (um buffer de ruído por contexto) */
const ruidos = new WeakMap<Ctx, AudioBuffer>();
function ruido(c: Ctx, destino: AudioNode, inicio: number, dur: number, vol: number, filtro: BiquadFilterType, freq: number) {
  let buf = ruidos.get(c);
  if (!buf) {
    buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ruidos.set(c, buf);
  }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; s.loop = true;
  f.type = filtro; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, inicio);
  g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
  s.connect(f).connect(g).connect(destino);
  s.start(inicio);
  s.stop(inicio + dur + 0.03);
}

/* ---------- a música da loja: 8 compassos de feira alegre, em laço (Dó - Lá menor - Fá - Sol) ---------- */
const PASSO = 60 / 116 / 4;   // semicolcheia a 116 batidas por minuto
const PASSOS = 128;          // 8 compassos de 16
/* [passo, nota MIDI, duração em passos] */
const MELODIA: [number, number, number][] = [
  [0, 76, 2], [2, 79, 2], [4, 84, 4], [8, 79, 2], [10, 76, 2], [12, 74, 2], [14, 72, 2],
  [16, 72, 2], [18, 76, 2], [20, 81, 4], [24, 79, 2], [26, 76, 2], [28, 74, 4],
  [32, 77, 2], [34, 81, 2], [36, 84, 4], [40, 81, 2], [42, 77, 2], [44, 76, 2], [46, 74, 2],
  [48, 74, 2], [50, 79, 2], [52, 83, 4], [56, 81, 2], [58, 79, 2], [60, 74, 4],
  [64, 84, 2], [66, 83, 2], [68, 79, 4], [72, 76, 2], [74, 79, 2], [76, 84, 4],
  [80, 81, 2], [82, 79, 2], [84, 76, 4], [88, 72, 2], [90, 76, 2], [92, 81, 4],
  [96, 77, 2], [98, 81, 2], [100, 84, 2], [102, 86, 2], [104, 84, 4], [108, 81, 4],
  [112, 83, 2], [114, 81, 2], [116, 79, 4], [120, 74, 2], [122, 77, 2], [124, 79, 4],
];
const BAIXO = [36, 33, 29, 31, 36, 33, 29, 31];   // a fundamental de cada compasso (Dó, Lá, Fá, Sol)
const ACORDES = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62], [60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];

/* grava o laço inteiro num áudio, uma vez (leva uma fração de segundo) */
let laco: Promise<AudioBuffer> | null = null;
function gravarLaco(taxa: number): Promise<AudioBuffer> {
  laco ??= (async () => {
    const O = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    const duracao = PASSOS * PASSO;
    const off = new O(1, Math.ceil(duracao * taxa), taxa);
    const saida = off.destination;
    for (let p = 0; p < PASSOS; p++) {
      const t = p * PASSO, compasso = Math.floor(p / 16), noCompasso = p % 16;
      for (const [passo, midi, dur] of MELODIA) if (passo === p) nota(off, saida, "square", hz(midi), t, dur * PASSO * 0.92, 0.07);
      if (noCompasso % 2 === 0) {   // baixo em colcheias, alternando a oitava
        const raiz = BAIXO[compasso];
        nota(off, saida, "triangle", hz(noCompasso % 4 === 0 ? raiz : raiz + 12), t, PASSO * 1.8, 0.16);
      }
      /* arpejo leve: a nota do acorde gira entre as três (o "% 3" precisa dos parênteses: sem eles, no 4º tempo o índice
         passava do fim, a frequência saía inválida e o erro fazia a música parar; era o "toca e para" de 2026-11-19) */
      if (noCompasso % 4 === 2) nota(off, saida, "square", hz(ACORDES[compasso][Math.floor(noCompasso / 4) % 3] + 12), t, PASSO * 0.9, 0.022);
      if (noCompasso === 0 || noCompasso === 8) nota(off, saida, "sine", 150, t, 0.12, 0.28, 45);   // bumbo
      if (noCompasso === 4 || noCompasso === 12) ruido(off, saida, t, 0.09, 0.09, "bandpass", 1800);   // caixa
      if (noCompasso % 2 === 1) ruido(off, saida, t, 0.03, 0.035, "highpass", 7000);   // chimbal
    }
    return off.startRendering();
  })();
  return laco;
}

let musicaTocando = false;
let fonte: AudioBufferSourceNode | null = null;
let vez = 0;   // cada tocarMusica() tem a sua vez: um parar no meio da gravação não deixa a música começar depois

/* começa a música da loja, em laço contínuo */
export function tocarMusica() {
  const c = contexto();
  if (!c || musicaTocando) return;
  musicaTocando = true;
  const minha = ++vez;
  destravar();
  void gravarLaco(c.sampleRate).then((buf) => {
    if (minha !== vez || !musicaTocando || !ctx) return;
    fonte?.stop();
    fonte = ctx.createBufferSource();
    fonte.buffer = buf;
    fonte.loop = true;
    fonte.connect(musicaBus);
    const t = ctx.currentTime;
    musicaBus.gain.cancelScheduledValues(t);
    musicaBus.gain.setValueAtTime(0.0001, t);
    musicaBus.gain.exponentialRampToValueAtTime(VOLUME_MUSICA, t + 1.2);
    fonte.start(t + 0.05);
  }).catch(() => { /* sem áudio no navegador: a loja segue em silêncio */ });
}

export function pararMusica() {
  if (!ctx || !musicaTocando) return;
  musicaTocando = false;
  vez++;
  const t = ctx.currentTime, f = fonte;
  fonte = null;
  musicaBus.gain.cancelScheduledValues(t);
  musicaBus.gain.setValueAtTime(Math.max(0.0001, musicaBus.gain.value), t);
  musicaBus.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  f?.stop(t + 0.45);
}

/* a música abaixa durante a abertura do pacote e volta depois */
function abaixarMusica(ate: number, emSegundos: number) {
  if (!ctx) return;
  const t = ctx.currentTime;
  musicaBus.gain.cancelScheduledValues(t);
  musicaBus.gain.setValueAtTime(Math.max(0.0001, musicaBus.gain.value), t);
  musicaBus.gain.exponentialRampToValueAtTime(Math.max(0.0001, ate), t + emSegundos);
}
export const voltarMusica = () => { if (musicaTocando) abaixarMusica(VOLUME_MUSICA, 1.5); };

/* ---------- o suspense: tambor que acelera e uma nota que sobe, até o clarão ---------- */
let suspenseParar: (() => void) | null = null;

export function suspense() {
  const c = contexto();
  if (!c) return;
  destravar();
  pararSuspense();
  abaixarMusica(0.04, 0.4);
  const inicio = c.currentTime + 0.05;
  const bus = c.createGain(); bus.gain.value = 1; bus.connect(efeitosBus);
  /* o zumbido grave e a nota que sobe devagar, tremendo */
  const sobe = c.createOscillator(), trem = c.createOscillator(), tremG = c.createGain(), sobeG = c.createGain();
  sobe.type = "square"; sobe.frequency.setValueAtTime(hz(57), inicio); sobe.frequency.exponentialRampToValueAtTime(hz(81), inicio + 4.5);
  trem.frequency.value = 9; tremG.gain.value = 0.035;
  sobeG.gain.setValueAtTime(0.0001, inicio); sobeG.gain.exponentialRampToValueAtTime(0.05, inicio + 0.6);
  trem.connect(tremG).connect(sobeG.gain);
  sobe.connect(sobeG).connect(bus);
  const grave = c.createOscillator(), graveG = c.createGain();
  grave.type = "triangle"; grave.frequency.value = hz(33);
  graveG.gain.setValueAtTime(0.0001, inicio); graveG.gain.exponentialRampToValueAtTime(0.18, inicio + 0.8);
  grave.connect(graveG).connect(bus);
  sobe.start(inicio); trem.start(inicio); grave.start(inicio);
  /* o rufar da caixa, cada vez mais rápido (agendado de uma vez, no motor de áudio) */
  let t = inicio, intervalo = 0.2;
  const fim = inicio + 8;
  while (t < fim) {
    ruido(c, bus, t, 0.06, 0.05 + Math.min(0.08, (t - inicio) * 0.012), "bandpass", 1600);
    t += intervalo;
    intervalo = Math.max(0.045, intervalo * 0.93);
  }
  suspenseParar = () => {
    const agora = c.currentTime;
    bus.gain.cancelScheduledValues(agora);
    bus.gain.setValueAtTime(bus.gain.value, agora);
    bus.gain.exponentialRampToValueAtTime(0.0001, agora + 0.12);
    for (const o of [sobe, trem, grave]) o.stop(agora + 0.15);
    window.setTimeout(() => bus.disconnect(), 400);
  };
}

export function pararSuspense() {
  suspenseParar?.();
  suspenseParar = null;
}

/* o clarão: o estouro (um prato longo e um "vento" que sobe) */
export function clarao() {
  const c = contexto();
  if (!c) return;
  pararSuspense();
  const t = c.currentTime + 0.01;
  ruido(c, efeitosBus, t, 1.4, 0.22, "highpass", 5000);
  ruido(c, efeitosBus, t, 0.5, 0.18, "lowpass", 900);
  nota(c, efeitosBus, "square", hz(72), t, 0.35, 0.06, hz(96));
}

/* ---------- a recompensa: uma fanfarra, mais longa e mais alta quanto mais rara ---------- */
const NIVEL: Record<Raridade, number> = { comum: 0, incomum: 1, rara: 2, epica: 3, lendaria: 4 };

export function recompensa(raridade: Raridade) {
  const c = contexto();
  if (!c) return;
  pararSuspense();
  destravar();
  const n = NIVEL[raridade];
  let t = c.currentTime + 0.05;
  const passo = 0.085;
  /* o arpejo que sobe (Dó maior), mais longo nas raridades altas */
  const arpejo = [72, 76, 79, 84, 88, 91, 96].slice(0, 4 + Math.min(3, n));
  for (const m of arpejo) { nota(c, efeitosBus, "square", hz(m), t, passo * 1.6, 0.08); t += passo; }
  /* o acorde final, com o baixo */
  for (const m of [72, 76, 79, 84]) nota(c, efeitosBus, "square", hz(m), t, 0.75 + n * 0.12, 0.05);
  nota(c, efeitosBus, "triangle", hz(48), t, 0.9 + n * 0.12, 0.2);
  /* épico e lendário: a frase de vitória */
  if (n >= 3) {
    let v = t + 0.35;
    for (const [m, d] of [[79, 1], [81, 1], [83, 1], [84, 3]] as [number, number][]) { nota(c, efeitosBus, "square", hz(m + 12), v, passo * d * 1.5, 0.06); v += passo * d * 1.4; }
  }
  /* o brilho: notinhas agudas soltas */
  const brilhos = 4 + n * 3;
  for (let i = 0; i < brilhos; i++) nota(c, efeitosBus, "triangle", hz(96 + ((i * 5) % 12)), t + 0.1 + i * 0.07, 0.12, 0.03);
  window.setTimeout(voltarMusica, (1.2 + n * 0.3) * 1000);
}

/* ---------- o clique dos botões da tela de compra (pedido do dono em 2026-11-19) ----------
   Um "tic" curto de videogame: uma nota quadrada aguda que cai rápido, com um estalinho de ruído. Toca em qualquer botão
   da tela de compra do pacote (LojaAbrir.tsx) e só nela; com o som da loja desligado, fica mudo como o resto. */
export function clique() {
  const c = contexto();
  if (!c) return;
  destravar();
  const t = c.currentTime + 0.005;
  nota(c, efeitosBus, "square", hz(91), t, 0.035, 0.055, hz(84));
  ruido(c, efeitosBus, t, 0.015, 0.045, "highpass", 6000);
}

/* ---------- ligar e desligar o som da loja ---------- */
export const somLigado = () => ligado;
export function alternarSom() {
  ligado = !ligado;
  try { localStorage.setItem(CHAVE, ligado ? "1" : "0"); } catch { /* sem armazenamento */ }
  const c = contexto();
  if (c) {
    mestre.gain.cancelScheduledValues(c.currentTime);
    mestre.gain.setValueAtTime(ligado ? 1 : 0, c.currentTime);
    if (ligado) destravar();
  }
  ouvintes.forEach((f) => f());
}
export const assinarSom = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };
