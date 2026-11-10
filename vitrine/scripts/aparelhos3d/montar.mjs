/* Monta as imagens a partir dos quadros do render.mjs: testes para olhar e, no comando "tudo", o que o site usa:
   para cada aparelho, uma folha com todos os ângulos (AVIF, em dois tamanhos), o quadro de descanso sozinho (WebP) e o contorno
   do "ontem" (WebP), mais o arquivo gymQuadros.ts com as medidas. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CENAS, quadro, emParalelo, janela } from './render.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.join(AQUI, 'out');
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const cru = (rgba, w, h) => sharp(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength), { raw: { width: w, height: h, channels: 4 } });

/* caixa que envolve tudo o que tem alfa acima do limiar */
function caixaDe(rgba, w, h, limiar = 2) {
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (rgba[(j * w + i) * 4 + 3] > limiar) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  return { x0, y0, x1, y1 };
}

/* um fundo parecido com o painel do site, para olhar o quadro como ele vai aparecer */
function painel(cena, w, h) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><radialGradient id="g" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="${cena.luz}" stop-opacity=".22"/><stop offset=".72" stop-color="${cena.luz}" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="${cena.cor}"/><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  return sharp(Buffer.from(svg)).png();
}

export async function principal(args) {
  const [cmd, ...r] = args;
  if (cmd === 'teste') {
    fs.mkdirSync(SAIDA, { recursive: true });
    const [nome, yaw = '30', amostras = '2', escala = '1'] = r;
    const t0 = Date.now();
    const q = quadro(nome, +yaw, +amostras, +escala);
    console.log(nome, 'yaw', yaw, `${q.w}x${q.h}`, 'caixa', caixaDe(q.rgba, q.w, q.h), ((Date.now() - t0) / 1000).toFixed(1) + 's');
    const png = await cru(q.rgba, q.w, q.h).png().toBuffer();
    const arq = path.join(SAIDA, `teste-${nome}-${yaw}.png`);
    await painel(CENAS[nome], q.w, q.h).composite([{ input: png }]).toFile(arq);
    console.log(arq);
    return;
  }
  if (cmd === 'tira') {
    /* vários ângulos lado a lado */
    fs.mkdirSync(SAIDA, { recursive: true });
    const [nome, a = '-30', b = '90', n = '5', amostras = '2', escala = '0.6'] = r;
    const yaws = Array.from({ length: +n }, (_, i) => +a + ((+b - +a) * i) / (+n - 1));
    const qs = await emParalelo(yaws.map((yaw) => ({ nome, yaw, amostras: +amostras, escala: +escala })));
    const w = qs[0].w, h = qs[0].h, cols = Math.min(qs.length, 3), rows = Math.ceil(qs.length / cols);
    const partes = await Promise.all(qs.map(async (q, i) => ({ input: await cru(q.rgba, w, h).png().toBuffer(), left: (i % cols) * w, top: Math.floor(i / cols) * h })));
    const arq = path.join(SAIDA, `tira-${nome}.png`);
    await painel(CENAS[nome], w * cols, h * rows).composite(partes).toFile(arq);
    console.log(arq, `${w * cols}x${h * rows}`, yaws.map((y) => y.toFixed(0)).join(' '));
    return;
  }
  if (cmd === 'tudo') return tudo(path.resolve(r[0] ?? path.join(AQUI, '../../src/assets/gym')), path.resolve(r[1] ?? path.join(AQUI, '../../src/components/gymQuadros.ts')), +(r[2] ?? 4));
  console.log('uso: node cli.mjs teste <aparelho> <yaw> [amostras] [escala] | tira <aparelho> <de> <até> <n> [amostras] [escala] | tudo [pasta das imagens] [gymQuadros.ts] [amostras]');
}

/* ------------------------------------------------------------------ as sequências do site
   Cada aparelho gira GIRO graus para cada lado do ângulo de descanso, em N quadros. O quadro 0 é o aparelho entrando pela direita
   (mostrando mais o lado esquerdo, como numa passagem de câmera) e o último é ele saindo pela esquerda. */
const N = 31, HEROI = (N - 1) / 2;
const MAX_LADO = 4096;      // nenhuma folha passa disso em largura ou altura (limite de textura de placas de vídeo antigas)
const PEQUENO = 0.7;        // a folha das telas pequenas, em relação à grande
const QUALIDADE = 52;       // AVIF: abaixo disso o metal começa a manchar
const GIRO = { halter: 32, kettlebell: 40, barra: 28, banco: 28 };
const yawDe = (nome, i) => CENAS[nome].yaw + GIRO[nome] - (i * 2 * GIRO[nome]) / (N - 1);

async function tudo(pasta, arquivoTs, amostras) {
  fs.mkdirSync(pasta, { recursive: true });
  const nomes = (process.env.SO ?? Object.keys(CENAS).join(',')).split(','), t0 = Date.now();
  const tarefas = [];
  for (const nome of nomes) {
    for (let i = 0; i < N; i++) tarefas.push({ nome, i, yaw: yawDe(nome, i), amostras, escala: 1 });
    tarefas.push({ nome, i: -1, yaw: yawDe(nome, HEROI), amostras: 1, escala: 2, pecas: true });   // para o contorno do "ontem"
  }
  /* as mais demoradas primeiro, para os núcleos não ficarem ociosos no fim */
  const ordem = tarefas.map((_, k) => k).sort((a, b) => CENAS[tarefas[b].nome].raio - CENAS[tarefas[a].nome].raio);
  let ultimo = 0;
  const res = await emParalelo(ordem.map((k) => tarefas[k]), (f, tot) => { if (Date.now() - ultimo > 20000 || f === tot) { ultimo = Date.now(); console.log(`  ${f}/${tot} quadros  ${((Date.now() - t0) / 1000).toFixed(0)}s`); } });
  const por = (nome, i) => res[ordem.findIndex((k) => tarefas[k].nome === nome && tarefas[k].i === i)];
  const kb = (arq) => (fs.statSync(arq).size / 1024).toFixed(0) + ' KB';

  const meta = [];
  for (const nome of nomes) {
    const cena = CENAS[nome], J = janela(cena, 1), qs = Array.from({ length: N }, (_, i) => por(nome, i));
    const w = qs[0].w, h = qs[0].h;
    /* o mesmo recorte para todos os quadros: a união do que aparece, simétrica em volta do eixo do giro */
    let x0 = w, x1 = -1, y0 = h, y1 = -1;
    for (const q of qs) { const b = caixaDe(q.rgba, w, h, 3); x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1); }
    const eixo = -J.x0;                                   // coluna do eixo do giro
    const meia = Math.min(Math.max(eixo - x0, x1 + 1 - eixo) + 2, eixo, w - eixo);
    x0 = Math.round(eixo - meia); const cw = Math.round(meia * 2);
    y0 = Math.max(0, y0 - 2); const ch = Math.min(h, y1 + 3) - y0;
    /* a linha do chão: onde o pé do eixo aparece no quadro */
    const v = [-J.cam[0], -J.cam[1], -J.cam[2]];
    const zz = v[0] * J.fw[0] + v[1] * J.fw[1] + v[2] * J.fw[2];
    const sy = ((v[1] * J.up[1] + v[2] * J.up[2]) / zz) * J.f;
    const linhaChao = h - 1 - (sy - J.y0) + 0.5 - y0;     // em pixels, a partir do alto do recorte
    const chao = +(1 - linhaChao / ch).toFixed(4);        // fração da altura que fica abaixo da linha do chão
    /* onde fica o aparelho (sem a sombra) no quadro de descanso: serve para acertar o tamanho no CSS */
    const hb = caixaDe(qs[HEROI].rgba, w, h, 200);
    const corpo = [(hb.x0 - x0) / cw, (hb.x1 + 1 - x0) / cw, (hb.y0 - y0) / ch, (hb.y1 + 1 - y0) / ch].map((n) => +n.toFixed(3));

    const quadros = await Promise.all(qs.map((q) => cru(q.rgba, w, h).extract({ left: x0, top: y0, width: cw, height: ch }).png().toBuffer()));
    const folha = async (escala, sufixo) => {
      const fw = Math.round(cw * escala), fh = Math.round(ch * escala);
      const cols = Math.min(N, Math.floor(MAX_LADO / fw)), rows = Math.ceil(N / cols);
      if (rows * fh > MAX_LADO) throw new Error(`${nome}${sufixo}: folha alta demais (${rows * fh}px)`);
      const partes = await Promise.all(quadros.map(async (png, i) => ({ input: escala === 1 ? png : await sharp(png).resize(fw, fh, { kernel: 'lanczos3' }).png().toBuffer(), left: (i % cols) * fw, top: Math.floor(i / cols) * fh })));
      const tela = await sharp({ create: { width: cols * fw, height: rows * fh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(partes).png().toBuffer();
      const arq = path.join(pasta, `${nome}${sufixo}.avif`);
      await sharp(tela).avif({ quality: QUALIDADE, effort: 7, chromaSubsampling: '4:2:0' }).toFile(arq);
      return { w: fw, h: fh, cols, rows, peso: kb(arq) };
    };
    const g = await folha(1, '-g'), p = await folha(PEQUENO, '-p');
    /* o quadro de descanso sozinho: o que aparece antes de a folha chegar, sem AVIF e no modo de movimento reduzido */
    await sharp(quadros[HEROI]).webp({ quality: 86, alphaQuality: 92, effort: 6, smartSubsample: true }).toFile(path.join(pasta, `${nome}.webp`));

    /* o contorno do "ontem": bordas das peças, no ângulo de descanso, desenhadas no dobro do tamanho e reduzidas */
    const e = por(nome, -1), J2 = janela(cena, 2), W2 = e.w, H2 = e.h, P = e.pecas;
    const borda = new Uint8Array(W2 * H2);
    const dif = (a, b) => P[a] !== P[b] || (P[a] !== 0 && (P[a + 1] * P[b + 1] + P[a + 2] * P[b + 2] + P[a + 3] * P[b + 3] < 0.82 || Math.abs(P[a + 4] - P[b + 4]) > 0.05));
    for (let j = 0; j < H2 - 1; j++) for (let i = 0; i < W2 - 1; i++) {
      const o = (j * W2 + i) * 5;
      if (dif(o, o + 5) || dif(o, o + W2 * 5)) borda[j * W2 + i] = 1;
    }
    const linha = new Uint8ClampedArray(W2 * H2 * 4);
    for (let j = 1; j < H2 - 1; j++) for (let i = 1; i < W2 - 1; i++) {
      let s = 0;
      for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) s += borda[(j + b) * W2 + i + a];
      if (s) { const o = (j * W2 + i) * 4; linha[o] = linha[o + 1] = linha[o + 2] = 255; linha[o + 3] = Math.min(255, s * 110); }
    }
    /* o mesmo recorte, no dobro: nas duas janelas o ponto para onde a câmera olha fica em (-x0, y0 + h - 1) */
    const ex0 = Math.round(2 * (x0 + J.x0) - J2.x0), topo1 = J.y0 + (h - 1 - y0), ey0 = Math.round(J2.y0 + (H2 - 1) - 2 * topo1 - 1);
    await cru(linha, W2, H2).extract({ left: clamp(ex0, 0, W2 - cw * 2), top: clamp(ey0, 0, H2 - ch * 2), width: cw * 2, height: ch * 2 })
      .resize(cw, ch, { kernel: 'cubic' }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(path.join(pasta, `${nome}-eco.webp`));

    meta.push({ id: nome, w: g.w, h: g.h, cols: g.cols, chao, corpo, p: { w: p.w, h: p.h, cols: p.cols } });
    console.log(`${nome}: quadro ${cw}x${ch}  chão ${chao}  corpo ${corpo.join(' ')}  folha ${g.cols}x${g.rows} ${g.peso}  pequena ${p.w}x${p.h} ${p.cols}x${p.rows} ${p.peso}  descanso ${kb(path.join(pasta, nome + '.webp'))}  contorno ${kb(path.join(pasta, nome + '-eco.webp'))}`);
  }
  const ts = `/* Gerado por vitrine/scripts/aparelhos3d (node cli.mjs tudo). Não editar à mão: rode o script de novo.
   n = quadros por aparelho; heroi = o quadro de descanso (o aparelho parado no centro).
   w, h = tamanho de um quadro; cols = quadros por linha na folha; chao = fração da altura do quadro que fica abaixo da linha do chão;
   corpo = onde o aparelho (sem a sombra) fica no quadro de descanso, em frações: esquerda, direita, alto, baixo;
   p = a folha menor, das telas pequenas. */
export const QUADROS = { n: ${N}, heroi: ${HEROI} } as const;
export type Folha = { id: string; w: number; h: number; cols: number; chao: number; corpo: number[]; p: { w: number; h: number; cols: number } };
export const FOLHAS: Folha[] = ${JSON.stringify(meta).replace(/"(\w+)":/g, '$1: ').replace(/\},\{id/g, '},\n  {id').replace('[{', '[\n  {').replace(/\}\]$/, '},\n]')};
`;
  fs.writeFileSync(arquivoTs, ts);
  console.log('pronto em', ((Date.now() - t0) / 1000).toFixed(0) + 's', '→', pasta);
}
