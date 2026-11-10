/* Paisagens ilustradas do RONDO (site e app): desenho vetorial plano, em camadas, no estilo de fundo de cartaz.
   Cada cena é montada por código (céu em degradê, sol ou lua, nuvens, serras, pinheiros, árvores, cidade, lago com reflexo), em cores
   de verdade (céu azul, verde do campo, laranja do pôr do sol), e sai
   em dois formatos: paisagem (computador) e retrato (celular). Como é vetor, fica nítida em qualquer tela.

   Uso:  node cenas.mjs <pasta de saída> [largura do PNG de conferência]
   Gera <cena>-l.svg e <cena>-r.svg; com o sharp instalado, gera também os .webp que o app usa. */
import fs from 'node:fs';
import path from 'node:path';

/* sorteio com semente: a mesma cena sai igual toda vez */
function sorteio(semente) {
  let a = semente >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const n1 = (v) => (Math.round(v * 10) / 10).toString();

function fazer(W, H, id) {
  const defs = [], corpo = [];
  let k = 0;
  const novoId = (p) => `${id}${p}${k++}`;
  const u = H > W ? W / 700 : H / 900;   // unidade: no retrato as coisas ficam um pouco maiores, para a cena não parecer distante
  const api = {
    W, H, u,
    grad(paradas, x1 = 0, y1 = 0, x2 = 0, y2 = 1) {
      const g = novoId('g');
      defs.push(`<linearGradient id="${g}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${paradas.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`);
      return `url(#${g})`;
    },
    radial(paradas) {
      const g = novoId('r');
      defs.push(`<radialGradient id="${g}">${paradas.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`).join('')}</radialGradient>`);
      return `url(#${g})`;
    },
    por(s) { corpo.push(s); },
    /* o céu: as cores vão do alto até o horizonte (`ate`, fração da altura), que é onde o degradê termina */
    ceu(paradas, ate = 1) { api.por(`<rect width="${W}" height="${H}" fill="${api.grad(paradas.map(([o, c2]) => [n1(o * ate), c2]))}"/>`); },
    /* estrelas: pontinhos e alguns brilhos de quatro pontas, só na parte de cima */
    estrelas(n, ate, semente, cor = '#ffffff') {
      const r = sorteio(semente); let s = '';
      for (let i = 0; i < n; i++) {
        const x = r() * W, y = r() * H * ate, t = r();
        if (t > 0.93) { const q = (3 + r() * 4) * u; s += `<path d="M${n1(x)} ${n1(y - q)}Q${n1(x)} ${n1(y)} ${n1(x + q)} ${n1(y)}Q${n1(x)} ${n1(y)} ${n1(x)} ${n1(y + q)}Q${n1(x)} ${n1(y)} ${n1(x - q)} ${n1(y)}Q${n1(x)} ${n1(y)} ${n1(x)} ${n1(y - q)}Z" fill="${cor}" opacity="${n1(0.6 + r() * 0.4)}"/>`; }
        else s += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1((0.6 + t * 1.5) * u)}" fill="${cor}" opacity="${n1(0.25 + r() * 0.65)}"/>`;
      }
      api.por(s);
    },
    disco(x, y, raio, cor, brilho, alcance = 3.2) {
      if (brilho) api.por(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(raio * alcance)}" fill="${api.radial([[0, brilho, 0.55], [0.35, brilho, 0.22], [1, brilho, 0]])}"/>`);
      api.por(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(raio)}" fill="${cor}"/>`);
    },
    lua(x, y, raio, cor = '#f3ecff', sombra = '#cdbdf3') {
      api.disco(x, y, raio, cor, '#b9a2ff');
      for (const [dx, dy, q] of [[-0.3, -0.25, 0.2], [0.28, 0.1, 0.26], [-0.1, 0.42, 0.14], [0.36, -0.42, 0.1], [-0.5, 0.2, 0.09]]) api.por(`<circle cx="${n1(x + dx * raio)}" cy="${n1(y + dy * raio)}" r="${n1(q * raio)}" fill="${sombra}" opacity=".7"/>`);
    },
    /* nuvem fofa: bolas sobre uma base reta; `s` é o tamanho */
    nuvem(x, y, s, cor, opacidade = 1, semente = 1) {
      const r = sorteio(semente); let g = `<g fill="${cor}" opacity="${opacidade}">`;
      const bolas = [[0, 0, 0.5], [0.42, 0.1, 0.36], [-0.45, 0.12, 0.34], [0.82, 0.22, 0.24], [-0.85, 0.24, 0.22], [0.2, -0.22, 0.34]];
      for (const [dx, dy, q] of bolas) g += `<circle cx="${n1(x + dx * s)}" cy="${n1(y + dy * s)}" r="${n1(q * s * (0.9 + r() * 0.2))}"/>`;
      g += `<path d="M${n1(x - 1.25 * s)} ${n1(y + 0.42 * s)}Q${n1(x - 1.2 * s)} ${n1(y + 0.26 * s)} ${n1(x - 0.9 * s)} ${n1(y + 0.3 * s)}H${n1(x + 0.9 * s)}Q${n1(x + 1.2 * s)} ${n1(y + 0.26 * s)} ${n1(x + 1.3 * s)} ${n1(y + 0.42 * s)}Z"/></g>`;
      api.por(g);
    },
    /* nuvem em risco: um traço comprido de pontas finas, como nas ilustrações de referência */
    risco(x, y, comp, alt, cor, opacidade = 1) {
      api.por(`<path d="M${n1(x)} ${n1(y)}Q${n1(x + comp * 0.3)} ${n1(y - alt)} ${n1(x + comp * 0.62)} ${n1(y - alt * 0.5)}Q${n1(x + comp * 0.86)} ${n1(y - alt * 0.2)} ${n1(x + comp)} ${n1(y - alt * 0.1)}Q${n1(x + comp * 0.6)} ${n1(y + alt * 0.35)} ${n1(x)} ${n1(y)}Z" fill="${cor}" opacity="${opacidade}"/>`);
    },
    /* a linha de uma serra: soma de ondas e um pouco de acaso; devolve a função y(x) */
    linha(yBase, amp, semente, asp = 1) {
      const r = sorteio(semente), f = [r() * 6, r() * 6, r() * 6, r() * 6];
      return (x) => { const t = x / W; return yBase - amp * (0.5 * Math.sin(t * 3.1 * asp + f[0]) + 0.28 * Math.sin(t * 7.3 * asp + f[1]) + 0.14 * Math.sin(t * 15.7 * asp + f[2]) + 0.08 * Math.sin(t * 31 * asp + f[3])); };
    },
    /* serra de picos retos (montanha) a partir de uma lista de picos [x 0..1, altura 0..1] */
    picos(yBase, alt, lista, cor, neve) {
      let d = `M0 ${n1(H)}V${n1(yBase)}`;
      for (const [px, ph, larg] of lista) {
        const x = px * W, y = yBase - ph * alt, w = larg * W;
        d += `L${n1(x - w)} ${n1(yBase - ph * alt * 0.12)}L${n1(x - w * 0.42)} ${n1(yBase - ph * alt * 0.55)}L${n1(x)} ${n1(y)}L${n1(x + w * 0.5)} ${n1(yBase - ph * alt * 0.5)}L${n1(x + w)} ${n1(yBase - ph * alt * 0.08)}`;
      }
      api.por(`<path d="${d}L${W} ${n1(yBase)}V${H}Z" fill="${cor}"/>`);
      if (neve) for (const [px, ph, larg] of lista.filter((p) => p[1] > 0.7)) {
        const x = px * W, y = yBase - ph * alt, w = larg * W, q = ph * alt;
        api.por(`<path d="M${n1(x)} ${n1(y)}L${n1(x - w * 0.2)} ${n1(y + q * 0.2)}L${n1(x - w * 0.09)} ${n1(y + q * 0.15)}L${n1(x - w * 0.04)} ${n1(y + q * 0.27)}L${n1(x + w * 0.06)} ${n1(y + q * 0.17)}L${n1(x + w * 0.13)} ${n1(y + q * 0.26)}L${n1(x + w * 0.25)} ${n1(y + q * 0.25)}Z" fill="${neve}"/>`);
        api.por(`<path d="M${n1(x)} ${n1(y)}L${n1(x + w * 0.5)} ${n1(yBase - ph * alt * 0.5)}L${n1(x + w)} ${n1(yBase - ph * alt * 0.08)}L${n1(x + w * 0.3)} ${n1(yBase)}Z" fill="#000" opacity=".12"/>`);
      }
    },
    serra(fn, cor, passo = 8) {
      let d = `M0 ${H}`;
      for (let x = 0; x <= W + passo; x += passo) d += `L${n1(x)} ${n1(fn(x))}`;
      api.por(`<path d="${d}L${W} ${H}Z" fill="${cor}"/>`);
    },
    /* pinheiros em pé sobre uma linha */
    pinheiros(fn, n, de, ate, altMin, altMax, cor, semente) {
      const r = sorteio(semente); let s = `<g fill="${cor}">`;
      for (let i = 0; i < n; i++) {
        const x = (de + (ate - de) * ((i + r() * 0.8) / n)) * W, a = (altMin + r() * (altMax - altMin)) * u, l = a * 0.4, y = fn(x) + a * 0.06;
        s += `<path d="M${n1(x)} ${n1(y - a)}L${n1(x + l * 0.5)} ${n1(y - a * 0.62)}H${n1(x + l * 0.22)}L${n1(x + l * 0.78)} ${n1(y - a * 0.3)}H${n1(x + l * 0.3)}L${n1(x + l)} ${n1(y)}H${n1(x - l)}L${n1(x - l * 0.3)} ${n1(y - a * 0.3)}H${n1(x - l * 0.78)}L${n1(x - l * 0.22)} ${n1(y - a * 0.62)}H${n1(x - l * 0.5)}Z"/>`;
      }
      api.por(s + '</g>');
    },
    /* árvore de copa redonda: tronco e três bolas de folha, com uma mais clara por cima */
    arvore(x, y, a, cor, claro, tronco) {
      api.por(`<path d="M${n1(x - a * 0.035)} ${n1(y)}L${n1(x - a * 0.02)} ${n1(y - a * 0.5)}H${n1(x + a * 0.02)}L${n1(x + a * 0.035)} ${n1(y)}Z" fill="${tronco}"/><circle cx="${n1(x)}" cy="${n1(y - a * 0.72)}" r="${n1(a * 0.3)}" fill="${cor}"/><circle cx="${n1(x - a * 0.22)}" cy="${n1(y - a * 0.56)}" r="${n1(a * 0.22)}" fill="${cor}"/><circle cx="${n1(x + a * 0.23)}" cy="${n1(y - a * 0.58)}" r="${n1(a * 0.24)}" fill="${cor}"/><circle cx="${n1(x - a * 0.06)}" cy="${n1(y - a * 0.8)}" r="${n1(a * 0.2)}" fill="${claro}"/><circle cx="${n1(x + a * 0.16)}" cy="${n1(y - a * 0.68)}" r="${n1(a * 0.14)}" fill="${claro}"/>`);
    },
    /* a cidade: prédios de alturas sorteadas, com janelas acesas */
    cidade(yBase, de, ate, altMax, cor, janela, semente, densidade = 1) {
      const r = sorteio(semente); let s = `<g>`, x = de * W;
      while (x < ate * W) {
        const w = (16 + r() * 30) * u, centro = 1 - Math.abs(((x + w / 2) / W - (de + ate) / 2) / ((ate - de) / 2));
        const a = altMax * u * (0.25 + 0.75 * r()) * (0.45 + 0.55 * centro);
        s += `<rect x="${n1(x)}" y="${n1(yBase - a)}" width="${n1(w)}" height="${n1(a + 2)}" fill="${cor}"/>`;
        if (r() > 0.6) s += `<rect x="${n1(x + w * 0.44)}" y="${n1(yBase - a - 14 * u * (0.5 + r()))}" width="${n1(Math.max(1, 1.6 * u))}" height="${n1(16 * u)}" fill="${cor}"/>`;
        if (r() > 0.72) s += `<rect x="${n1(x + w * 0.2)}" y="${n1(yBase - a - 6 * u)}" width="${n1(w * 0.6)}" height="${n1(7 * u)}" fill="${cor}"/>`;
        if (janela) {
          const cols = Math.max(2, Math.floor(w / (7 * u))), lins = Math.floor(a / (9 * u));
          for (let j = 1; j < lins; j++) for (let i = 0; i < cols; i++) if (r() < 0.34 * densidade) s += `<rect x="${n1(x + 3 * u + (i * (w - 6 * u)) / cols)}" y="${n1(yBase - a + j * 9 * u)}" width="${n1(3 * u)}" height="${n1(4 * u)}" fill="${janela}" opacity="${n1(0.55 + r() * 0.45)}"/>`;
        }
        x += w + (r() > 0.75 ? 6 * u * r() : 0);
      }
      api.por(s + '</g>');
    },
    /* o lago: uma faixa de água com riscos de luz */
    lago(y, paradas, risco, semente, n = 26) {
      api.por(`<rect x="0" y="${n1(y)}" width="${W}" height="${n1(H - y)}" fill="${api.grad(paradas)}"/>`);
      const r = sorteio(semente); let s = `<g fill="${risco}">`;
      for (let i = 0; i < n; i++) { const yy = y + (H - y) * Math.pow(r(), 1.4), w = (30 + r() * 150) * u * (0.4 + (yy - y) / (H - y)); s += `<rect x="${n1(r() * W - w / 2)}" y="${n1(yy)}" width="${n1(w)}" height="${n1(Math.max(1, 1.6 * u))}" rx="${n1(u)}" opacity="${n1(0.12 + r() * 0.3)}"/>`; }
      api.por(s + '</g>');
    },
    /* o reflexo de uma coluna de luz (sol ou lua) na água */
    reflexo(x, y, larg, cor, semente, n = 14) {
      const r = sorteio(semente); let s = `<g fill="${cor}">`;
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, w = larg * (0.5 + t * 1.3) * (0.6 + r() * 0.6); s += `<rect x="${n1(x - w / 2 + (r() - 0.5) * larg * 0.3)}" y="${n1(y + t * (H - y) * 0.8)}" width="${n1(w)}" height="${n1((2.2 + t * 3) * u)}" rx="${n1(2 * u)}" opacity="${n1(0.75 * (1 - t * 0.8))}"/>`; }
      api.por(s + '</g>');
    },
    svg() { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMax slice"><defs>${defs.join('')}</defs>${corpo.join('')}</svg>`; },
  };
  return api;
}

/* ------------------------------------------------------------------ as cenas
   Cada função recebe o quadro (W x H) e desenha de trás para a frente. `h` é a altura do horizonte. */
const CENAS = {
  /* pôr do sol nas serras: céu do violeta ao laranja, sol descendo atrás das montanhas, lago que reflete tudo */
  entardecer(c) {
    const { W, H, u } = c, h = H * 0.7, retrato = H > W;
    c.ceu([[0, '#3b1c8f'], [0.3, '#8a2fd0'], [0.56, '#e0509a'], [0.8, '#ff8a5c'], [1, '#ffd27a']], h / H);
    c.estrelas(retrato ? 30 : 46, 0.26, 11, '#fff3e0');
    const sx = W * (retrato ? 0.56 : 0.66);
    c.disco(sx, h - 60 * u, 76 * u, '#fff3c4', '#ffb86b', 3.4);
    c.risco(W * 0.04, H * 0.3, W * 0.34, 16 * u, '#ffb0c8', 0.7);
    c.risco(W * 0.52, H * 0.22, W * 0.4, 14 * u, '#ff9fb0', 0.6);
    c.risco(W * 0.3, H * 0.46, W * 0.46, 13 * u, '#ffd0a0', 0.7);
    c.nuvem(W * 0.14, H * 0.42, 62 * u, '#ff9fc0', 0.75, 3);
    c.nuvem(W * 0.9, H * 0.36, 78 * u, '#ffb59a', 0.75, 4);
    c.picos(h, 250 * u, [[0.08, 0.5, 0.2], [0.3, 0.72, 0.2], [0.52, 0.5, 0.17], [0.76, 0.86, 0.22], [0.97, 0.55, 0.16]], '#c57ad8');
    c.picos(h, 210 * u, [[0.18, 0.7, 0.2], [0.44, 1, 0.24], [0.68, 0.6, 0.2], [0.9, 0.78, 0.2]], '#8a4fc8');
    c.serra(c.linha(h - 26 * u, 46 * u, 21, 1.6), '#5a3aa8');
    const l1 = c.linha(h + 4 * u, 22 * u, 5, 2.2);
    c.pinheiros(l1, retrato ? 30 : 54, -0.02, 1.02, 34, 78, '#2a3a78', 8);
    c.serra(l1, '#2a3a78');
    c.lago(h + 14 * u, [[0, '#ff9a7a'], [0.22, '#c85aa8'], [0.6, '#5a3aa8'], [1, '#1c1a52']], '#ffe0b0', 31);
    c.reflexo(sx, h + 18 * u, 64 * u, '#fff0c0', 33);
    const l2 = c.linha(H - 30 * u, 36 * u, 9, 1.4);
    c.pinheiros(l2, retrato ? 8 : 14, -0.03, 0.34, 80, 170, '#14203f', 13);
    c.pinheiros(l2, retrato ? 5 : 9, 0.78, 1.03, 70, 150, '#14203f', 14);
    c.serra(l2, '#14203f');
  },
  /* noite na cidade: céu azul-marinho, lua amarela, prédios com janelas de várias cores refletidos no lago */
  noite(c) {
    const { W, H, u } = c, h = H * 0.66, retrato = H > W;
    c.ceu([[0, '#070b2e'], [0.42, '#101c6a'], [0.78, '#2a3aa8'], [1, '#6a6fe0']], h / H);
    c.estrelas(retrato ? 90 : 140, 0.6, 5);
    c.lua(W * (retrato ? 0.68 : 0.76), H * 0.2, 46 * u, '#fff6d6', '#f0dca0');
    c.risco(W * 0.02, H * 0.3, W * 0.36, 15 * u, '#2a3aa0', 0.8);
    c.risco(W * 0.5, H * 0.42, W * 0.46, 13 * u, '#3a4ab8', 0.65);
    c.nuvem(W * 0.2, H * 0.44, 70 * u, '#24308f', 0.85, 6);
    c.nuvem(W * 0.94, H * 0.5, 84 * u, '#2c3aa0', 0.8, 7);
    c.serra(c.linha(h - 30 * u, 70 * u, 15, 1.2), '#1f2f8a');
    c.cidade(h, retrato ? 0.3 : 0.42, 1.02, 230, '#1a2470', '#ffd36b', 42);
    c.cidade(h, retrato ? 0.42 : 0.5, 0.98, 150, '#101650', '#7fe3ff', 43, 0.9);
    c.cidade(h, retrato ? 0.36 : 0.46, 1.0, 90, '#0c1040', '#ff9ac8', 44, 0.7);
    const l1 = c.linha(h + 2 * u, 26 * u, 17, 1.8);
    c.pinheiros(l1, retrato ? 9 : 16, -0.02, retrato ? 0.36 : 0.42, 40, 96, '#0e3344', 19);
    c.serra((x) => (x < W * (retrato ? 0.4 : 0.46) ? l1(x) : h + 6 * u), '#0e3344');
    c.lago(h + 6 * u, [[0, '#2a3ab0'], [0.45, '#141c72'], [1, '#060a2c']], '#ffd98a', 23, 40);
    c.reflexo(W * (retrato ? 0.68 : 0.76), h + 10 * u, 40 * u, '#fff0c0', 24, 10);
    const l2 = c.linha(H - 24 * u, 30 * u, 27, 1.5);
    c.pinheiros(l2, retrato ? 6 : 10, -0.03, 0.3, 70, 150, '#04121c', 29);
    c.serra(l2, '#04121c');
  },
  /* dia claro na montanha: céu azul, nuvens brancas, pico nevado, pinheiros verdes e o lago azul */
  lago(c) {
    const { W, H, u } = c, h = H * 0.64, retrato = H > W;
    c.ceu([[0, '#1f7bf0'], [0.45, '#49a6ff'], [0.82, '#9fd6ff'], [1, '#d8f1ff']], h / H);
    c.disco(W * (retrato ? 0.24 : 0.16), H * 0.16, 44 * u, '#fff7c2', '#fff1a8', 2.6);
    c.risco(W * 0.3, H * 0.14, W * 0.38, 15 * u, '#ffffff', 0.8);
    c.risco(W * 0.56, H * 0.34, W * 0.4, 13 * u, '#ffffff', 0.7);
    c.nuvem(W * 0.84, H * 0.22, 96 * u, '#ffffff', 0.96, 8);
    c.nuvem(W * 0.1, H * 0.4, 72 * u, '#ffffff', 0.92, 9);
    c.nuvem(W * 0.62, H * 0.46, 54 * u, '#eaf6ff', 0.9, 10);
    c.picos(h, 200 * u, [[0.1, 0.6, 0.2], [0.86, 0.66, 0.2]], '#8fb4f0');
    c.picos(h, 250 * u, [[0.14, 0.5, 0.18], [0.38, 0.8, 0.22], [0.62, 1, 0.24], [0.9, 0.58, 0.2]], '#4f7fd6', '#ffffff');
    c.serra(c.linha(h - 20 * u, 56 * u, 81, 1.4), '#3f9a5a');
    const l1 = c.linha(h + 2 * u, 24 * u, 83, 2);
    c.pinheiros(l1, retrato ? 34 : 60, -0.02, 1.02, 36, 90, '#1f6b45', 85);
    c.serra(l1, '#1f6b45');
    c.lago(h + 12 * u, [[0, '#3aa0f0'], [0.5, '#2a6fd0'], [1, '#15408f']], '#ffffff', 87, 34);
    const l2 = c.linha(H - 26 * u, 34 * u, 89, 1.3);
    c.pinheiros(l2, retrato ? 7 : 12, 0.62, 1.03, 80, 180, '#0f3d2a', 91);
    c.pinheiros(l2, retrato ? 4 : 7, -0.03, 0.22, 60, 130, '#0f3d2a', 92);
    c.serra(l2, '#0f3d2a');
  },
  /* a pista de corrida no pôr do sol: céu laranja, gramado verde, pista vermelha, a cidade ao fundo */
  pista(c) {
    const { W, H, u } = c, h = H * 0.6, retrato = H > W;
    c.ceu([[0, '#6a2fc0'], [0.34, '#e0509a'], [0.62, '#ff8a5c'], [0.84, '#ffc56b'], [1, '#ffe59a']], h / H);
    const sx = W * (retrato ? 0.5 : 0.56);
    c.disco(sx, h - 46 * u, 84 * u, '#fff6cf', '#ffd08a', 3);
    c.risco(W * 0.03, H * 0.18, W * 0.38, 15 * u, '#ffb0c8', 0.7);
    c.risco(W * 0.56, H * 0.28, W * 0.42, 13 * u, '#ffd0a0', 0.7);
    c.nuvem(W * 0.88, H * 0.2, 74 * u, '#ff9fc0', 0.75, 2);
    c.nuvem(W * 0.1, H * 0.34, 58 * u, '#ffb59a', 0.75, 3);
    c.cidade(h, 0.18, 0.86, 150, '#d0608a', null, 51);
    c.cidade(h, 0.3, 0.74, 96, '#8a3f8a', '#ffe0a0', 52, 0.8);
    c.serra(c.linha(h + 4 * u, 20 * u, 53, 2), '#2f7a40');
    /* o gramado e a pista: faixas em curva, mais largas perto de quem olha */
    c.por(`<rect x="0" y="${n1(h + 14 * u)}" width="${W}" height="${n1(H - h)}" fill="${c.grad([[0, '#3f9a4a'], [1, '#1f5a34']])}"/>`);
    const fx = W * (retrato ? 0.92 : 0.86), fy = h + 20 * u, raias = 5;
    for (let i = raias; i >= 0; i--) {
      const a = i / raias, x0 = -W * 0.35 + a * W * (retrato ? 1.25 : 0.95), cor = i % 2 ? '#d8452f' : '#ea5a3f';
      if (i < raias) c.por(`<path d="M${n1(x0)} ${H}Q${n1(x0 + (fx - x0) * 0.72)} ${n1(H - (H - fy) * 0.72)} ${n1(fx)} ${n1(fy)}L${n1(fx + 16 * u)} ${n1(fy)}Q${n1(x0 + W * 0.2 + (fx - x0) * 0.74)} ${n1(H - (H - fy) * 0.7)} ${n1(x0 + W * (retrato ? 0.25 : 0.19))} ${H}Z" fill="${cor}"/>`);
      c.por(`<path d="M${n1(x0)} ${H}Q${n1(x0 + (fx - x0) * 0.72)} ${n1(H - (H - fy) * 0.72)} ${n1(fx)} ${n1(fy)}" fill="none" stroke="#fff4ea" stroke-width="${n1((2 + a * 3) * u)}" opacity=".95"/>`);
    }
    /* o poste de refletores e as árvores */
    const px = W * (retrato ? 0.8 : 0.72);
    c.por(`<rect x="${n1(px)}" y="${n1(h - 190 * u)}" width="${n1(5 * u)}" height="${n1(214 * u)}" fill="#3a2a4a"/><rect x="${n1(px - 16 * u)}" y="${n1(h - 206 * u)}" width="${n1(37 * u)}" height="${n1(24 * u)}" rx="${n1(3 * u)}" fill="#3a2a4a"/>`);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) c.por(`<circle cx="${n1(px - 9 * u + i * 11.5 * u)}" cy="${n1(h - 200 * u + j * 11 * u)}" r="${n1(3.6 * u)}" fill="#fff3c8"/>`);
    const l2 = c.linha(h + 30 * u, 14 * u, 57, 1.5);
    for (const [tx, s] of retrato ? [[0.1, 1.2], [0.28, 0.8]] : [[0.06, 1.3], [0.2, 0.9], [0.3, 0.7]]) c.arvore(tx * W, l2(tx * W) + 8 * u, 150 * u * s, '#1f5a34', '#2f7a40', '#4a2c1a');
  },
  /* o campo de dia: céu azul, nuvens grandes, morros verdes, uma árvore e a trilha */
  campo(c) {
    const { W, H, u } = c, h = H * 0.6, retrato = H > W;
    c.ceu([[0, '#1a78f0'], [0.5, '#4fb0ff'], [0.86, '#a8e0ff'], [1, '#e0f6ff']], h / H);
    c.risco(W * 0.36, H * 0.12, W * 0.4, 15 * u, '#ffffff', 0.8);
    c.risco(W * 0.04, H * 0.26, W * 0.3, 12 * u, '#ffffff', 0.7);
    c.nuvem(W * 0.86, H * 0.26, 120 * u, '#ffffff', 0.97, 21);
    c.nuvem(W * 0.6, H * 0.4, 70 * u, '#f0faff', 0.92, 22);
    c.nuvem(W * 0.08, H * 0.42, 60 * u, '#ffffff', 0.92, 23);
    c.picos(h, 150 * u, [[0.3, 0.7, 0.24], [0.62, 1, 0.26], [0.9, 0.6, 0.2]], '#6fa0e0');
    c.serra(c.linha(h - 6 * u, 60 * u, 61, 1.1), '#3fae8a');
    c.serra(c.linha(h + 40 * u, 54 * u, 62, 1.5), '#5cc85a');
    const l1 = c.linha(h + 110 * u, 50 * u, 63, 1.2);
    c.serra(l1, '#7ed957');
    /* a trilha, que vem de longe e abre para quem olha */
    const tx = W * (retrato ? 0.6 : 0.56), ty = l1(tx) + 6 * u;
    c.por(`<path d="M${n1(tx)} ${n1(ty)}Q${n1(tx + W * 0.1)} ${n1(ty + (H - ty) * 0.4)} ${n1(tx - W * 0.06)} ${n1(ty + (H - ty) * 0.62)}Q${n1(tx - W * 0.2)} ${n1(ty + (H - ty) * 0.82)} ${n1(tx - W * 0.16)} ${H}H${n1(tx + W * 0.16)}Q${n1(tx + W * 0.02)} ${n1(ty + (H - ty) * 0.8)} ${n1(tx + W * 0.07)} ${n1(ty + (H - ty) * 0.6)}Q${n1(tx + W * 0.14)} ${n1(ty + (H - ty) * 0.38)} ${n1(tx + 14 * u)} ${n1(ty)}Z" fill="#e8c98a"/>`);
    c.arvore(W * (retrato ? 0.2 : 0.16), l1(W * 0.16) + 60 * u, 330 * u, '#2f9a45', '#4fbf4a', '#6a4326');
    const l2 = c.linha(H - 20 * u, 40 * u, 64, 1.6);
    c.serra((x) => (Math.abs(x - (tx - W * 0.04)) < W * 0.2 ? H + 10 : l2(x)), '#3fa23f');
    const r = sorteio(65); let f = '';
    for (let i = 0; i < (retrato ? 26 : 44); i++) { const x = r() * W, y = H - r() * 150 * u; if (Math.abs(x - (tx - W * 0.04)) < W * 0.22) continue; f += `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1((2 + r() * 2) * u)}" fill="${['#fff', '#ffe36b', '#ff9ac8'][i % 3]}"/>`; }
    c.por(f);
  },
};

const pasta = path.resolve(process.argv[2] ?? 'out');
fs.mkdirSync(pasta, { recursive: true });
const FORMATOS = { l: [1600, 900], r: [900, 1600] };
for (const [nome, desenhar] of Object.entries(CENAS)) {
  for (const [sufixo, [W, H]] of Object.entries(FORMATOS)) {
    const c = fazer(W, H, nome[0] + sufixo);
    desenhar(c);
    fs.writeFileSync(path.join(pasta, `${nome}-${sufixo}.svg`), c.svg());
  }
}
/* ------------------------------------------------------------------ a primeira tela do site
   Lá a cena é montada em três peças, para o nome RONDO fazer o papel das montanhas: o céu (hero-ceu), a textura de serra
   que preenche as letras (hero-serra) e a fileira de pinheiros que passa na frente delas (hero-pinheiros). */
for (const [sufixo, [W, H]] of Object.entries(FORMATOS)) {
  const c = fazer(W, H, 'hc' + sufixo), u = c.u, retrato = H > W;
  c.ceu([[0, '#3b1c8f'], [0.3, '#8a2fd0'], [0.56, '#e0509a'], [0.8, '#ff8a5c'], [1, '#ffd27a']], 0.9);
  c.estrelas(retrato ? 30 : 46, 0.24, 11, '#fff3e0');
  c.disco(W * (retrato ? 0.72 : 0.8), H * (retrato ? 0.6 : 0.56), 84 * u, '#fff3c4', '#ffb86b', 3.4);
  c.risco(W * 0.04, H * 0.2, W * 0.34, 16 * u, '#ffb0c8', 0.7);
  c.risco(W * 0.5, H * 0.12, W * 0.42, 14 * u, '#ff9fb0', 0.6);
  c.risco(W * 0.34, H * 0.36, W * 0.46, 13 * u, '#ffd0a0', 0.7);
  c.nuvem(W * (retrato ? 0.2 : 0.56), H * 0.3, 60 * u, '#ff9fc0', 0.75, 3);
  c.nuvem(W * 0.9, H * 0.22, 80 * u, '#ffb59a', 0.8, 4);
  fs.writeFileSync(path.join(pasta, `hero-ceu-${sufixo}.svg`), c.svg());
}
{
  /* a fileira de pinheiros: uma camada só, com o chão cheio até embaixo (fundo transparente em cima) */
  const W = 1600, H = 300, c = fazer(W, H, 'hp');
  const l = c.linha(H * 0.7, 16, 5, 2.4);
  c.pinheiros(l, 40, -0.02, 1.02, 330, 640, '#1a2452', 8);
  c.serra((x) => l(x) - 14, '#1a2452');
  fs.writeFileSync(path.join(pasta, 'hero-pinheiros.svg'), c.svg().replace('preserveAspectRatio="xMidYMax slice"', 'preserveAspectRatio="none"'));
}
{
  /* a textura de serra das letras: do lilás claro do alto ao roxo fundo, com faces claras e escuras como as de uma montanha */
  const W = 1600, H = 520, c = fazer(W, H, 'hs'), r = sorteio(77);
  c.por(`<rect width="${W}" height="${H}" fill="${c.grad([[0, '#f0c0f4'], [0.28, '#c98ae8'], [0.62, '#8a52d0'], [1, '#4a2a9a']])}"/>`);
  for (const [base, alt, n, claro, escuro] of [[H * 0.5, H * 0.5, 9, 0.2, 0.16], [H * 0.78, H * 0.42, 12, 0.14, 0.2], [H * 1.02, H * 0.36, 15, 0.1, 0.22]]) {
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.2 + r() * 0.6) / n) * W, a = alt * (0.55 + r() * 0.45), w = (W / n) * (0.7 + r() * 0.5), y = base - a;
      c.por(`<path d="M${n1(x)} ${n1(y)}L${n1(x - w)} ${n1(base)}H${n1(x - w * 0.1)}Z" fill="#fff" opacity="${claro}"/><path d="M${n1(x)} ${n1(y)}L${n1(x + w)} ${n1(base)}H${n1(x - w * 0.1)}Z" fill="#1c0850" opacity="${escuro}"/>`);
    }
  }
  /* neve nos picos de cima */
  for (let i = 0; i < 16; i++) { const x = ((i + r()) / 16) * W, q = 26 + r() * 30; c.por(`<path d="M${n1(x)} 0L${n1(x - q)} ${n1(q * 1.5)}L${n1(x - q * 0.4)} ${n1(q * 1.15)}L${n1(x)} ${n1(q * 1.7)}L${n1(x + q * 0.5)} ${n1(q * 1.2)}L${n1(x + q)} ${n1(q * 1.5)}Z" fill="#fff" opacity=".55"/>`); }
  fs.writeFileSync(path.join(pasta, 'hero-serra.svg'), c.svg().replace('preserveAspectRatio="xMidYMax slice"', 'preserveAspectRatio="none"'));
}
console.log('cenas:', Object.keys(CENAS).join(', '), '→', pasta);

/* os .webp (para o app, que não desenha SVG como imagem no celular) e uma folha de conferência */
try {
  const sharp = (await import('sharp')).default;
  const folha = [];
  for (const nome of Object.keys(CENAS)) {
    for (const [sufixo, [W, H]] of Object.entries(FORMATOS)) {
      const svg = fs.readFileSync(path.join(pasta, `${nome}-${sufixo}.svg`));
      const lado = sufixo === 'l' ? { width: 1920 } : { width: 1080 };
      await sharp(svg, { density: 144 }).resize(lado).webp({ quality: 82, effort: 6 }).toFile(path.join(pasta, `${nome}-${sufixo}.webp`));
      folha.push({ input: await sharp(svg).resize({ height: 360 }).png().toBuffer(), nome: `${nome}-${sufixo}`, w: Math.round((360 * W) / H) });
    }
  }
  let x = 0; const partes = folha.map((f) => { const p = { input: f.input, left: x, top: 0 }; x += f.w + 6; return p; });
  await sharp({ create: { width: x, height: 360, channels: 3, background: '#111' } }).composite(partes).png().toFile(path.join(pasta, '_folha.png'));
  console.log('webp e folha de conferência prontos');
} catch (e) { console.log('sem sharp: só os SVG foram gerados (', e.message, ')'); }
