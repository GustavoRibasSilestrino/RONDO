/* Gera public/index.html: a página que o navegador mostra ANTES de o app carregar. Ela já nasce preta (sem a tela branca)
   e com o RONDIN no meio: a mesma esfera de pontos do app (lib/orbe.ts), desenhada aqui uma vez em SVG, com uma auréola e
   um respiro feitos só com CSS (sem script: a política de conteúdo do app não deixa script embutido na página).
   Quando o app termina de carregar, ele tira essa tela com um esmaecimento (src/lib/carregando.ts).

   Uso (dentro da pasta app): node --experimental-strip-types scripts/gerar-carregando.mjs
   Rode de novo se mudar o visual do orbe em lib/orbe.ts. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAMPOS, corDoPonto, esfera, quadro } from '../src/lib/orbe.ts';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = 380;                 // o maior tamanho do orbe na apresentação (telas/Apresentacao.tsx)
const N = 700;
const pts = esfera(N);
const saida = new Float32Array(N * CAMPOS);
quadro(pts, 2, 0.06, T * 0.36, T / 2, T / 2, saida);
const bolinhas = [];
for (const passe of [0, 1]) {
  for (let i = 0; i < N; i += 1) {
    const o = i * CAMPOS;
    if (saida[o + 5] !== passe) continue;
    bolinhas.push(`<circle cx="${saida[o].toFixed(1)}" cy="${saida[o + 1].toFixed(1)}" r="${Math.max(0.4, saida[o + 2] * 1.1).toFixed(2)}" fill="${corDoPonto(saida[o + 4], saida[o + 3])}" opacity="${saida[o + 3].toFixed(2)}"/>`);
  }
}

const html = `<!doctype html>
<html lang="pt-BR" style="background:#000">
  <head>
    <meta charset="utf-8" />
    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="theme-color" content="#000000" />
    <meta name="color-scheme" content="dark" />
    <title>%WEB_TITLE%</title>
    <!-- gerado por scripts/gerar-carregando.mjs: não edite à mão -->
    <style id="expo-reset">
      html, body { height: 100%; background: #000; color-scheme: dark; }
      body { overflow: hidden; margin: 0; }
      #root { display: flex; height: 100%; flex: 1; }
      /* a tela de carregamento: o RONDIN no meio, por cima de tudo, até o app tirar */
      #carregando { position: fixed; inset: 0; z-index: 2147483000; background: #000; display: flex; align-items: center; justify-content: center; transition: opacity 260ms ease-out; }
      #carregando.saindo { opacity: 0; pointer-events: none; }
      #carregando .orbe { position: relative; width: min(80vw, 46vh, 380px); aspect-ratio: 1; margin-top: -9vh; }
      #carregando .orbe::before { content: ""; position: absolute; inset: -6%; border-radius: 50%; background: radial-gradient(circle, rgba(168,110,255,0.34) 0%, rgba(124,58,237,0.14) 38%, rgba(76,29,149,0) 66%); animation: respira 2.4s ease-in-out infinite; }
      #carregando svg { position: relative; width: 100%; height: 100%; animation: gira 2.4s ease-in-out infinite; }
      @keyframes respira { 0%, 100% { opacity: 0.75; transform: scale(0.97); } 50% { opacity: 1; transform: scale(1.03); } }
      @keyframes gira { 0%, 100% { transform: scale(0.985); } 50% { transform: scale(1.015); } }
      @media (prefers-reduced-motion: reduce) { #carregando .orbe::before, #carregando svg { animation: none; } }
    </style>
  </head>

  <body style="background:#000">
    <noscript> Para usar o RONDO, ative o JavaScript. </noscript>
    <div id="carregando" aria-hidden="true">
      <div class="orbe"><svg viewBox="0 0 ${T} ${T}" xmlns="http://www.w3.org/2000/svg">${bolinhas.join('')}</svg></div>
    </div>
    <div id="root"></div>
  </body>
</html>
`;
mkdirSync(join(raiz, 'public'), { recursive: true });
writeFileSync(join(raiz, 'public', 'index.html'), html);
console.log(`public/index.html gerado (${(html.length / 1024).toFixed(1)} KB, ${N} pontos).`);
