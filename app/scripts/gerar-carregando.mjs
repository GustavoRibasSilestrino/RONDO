/* Gera public/index.html: a página que o navegador mostra ANTES de o app carregar. Ela já nasce preta (sem a tela branca) e com o
   nome RONDO em branco no meio, igual à abertura do app (componentes/Abertura.tsx): quem entra vê sempre a tela preta com
   "RONDO" e, depois dela, o RONDIN. Sem script (a política de conteúdo do app não deixa script embutido na página).
   Quando o app termina de carregar, ele tira essa tela com um esmaecimento (src/lib/carregando.ts) e a abertura do app
   assume no mesmo lugar, com o mesmo nome, sem piscar.

   Uso (dentro da pasta app): node scripts/gerar-carregando.mjs
   Rode de novo se mudar o visual da abertura. */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

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
      /* a tela de carregamento: preta, com o nome RONDO no meio, por cima de tudo, até o app tirar */
      #carregando { position: fixed; inset: 0; z-index: 2147483000; background: #000; display: flex; align-items: center; justify-content: center; transition: opacity 260ms ease-out; }
      #carregando.saindo { opacity: 0; pointer-events: none; }
      #carregando .marca { margin: 0; font: 300 30px/1.3 Poppins, "Segoe UI Light", "Helvetica Neue", "Segoe UI", Arial, sans-serif; letter-spacing: 10px; color: #f4f1fb; }
    </style>
  </head>

  <body style="background:#000">
    <noscript> Para usar o RONDO, ative o JavaScript. </noscript>
    <div id="carregando" aria-hidden="true"><p class="marca">RONDO</p></div>
    <div id="root"></div>
  </body>
</html>
`;
mkdirSync(join(raiz, 'public'), { recursive: true });
writeFileSync(join(raiz, 'public', 'index.html'), html);
console.log(`public/index.html gerado (${(html.length / 1024).toFixed(1)} KB).`);
