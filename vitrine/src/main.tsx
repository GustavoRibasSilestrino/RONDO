import { StrictMode, useEffect, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AvisoCookies } from "./components/AvisoCookies";
import { PAGINAS_LEGAIS } from "./components/Legal";
import Entrar from "./components/Entrar";
import Loja from "./components/Loja";
import { adiantar, interceptarLinks, primeiraTela, rolagemGuardada, useRota } from "./lib/navegar";
/* fontes servidas pelo próprio site (só o alfabeto latino): nenhuma chamada ao Google, nenhum IP de visitante enviado a terceiros */
import "@fontsource-variable/bricolage-grotesque/opsz.css";
/* letras de pixel da loja de pacotinhos (só baixam onde são usadas) */
import "@fontsource-variable/pixelify-sans/index.css";
import "@fontsource/press-start-2p/latin-400.css";
import "@fontsource/press-start-2p/latin-ext-400.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/menu.css";
import "./styles/nav-mobile.css";
import "./styles/day.css";
import "./styles/recado.css";
import "./styles/fit.css";
import "./styles/streak.css";
import "./styles/mobile.css";
import "./styles/responsive.css";
import "./styles/cadastro.css";
import "./styles/legal.css";
import "./styles/hero.css";
import "./styles/acabamento.css";
import "./styles/cenas.css";
import "./styles/rondin.css";
import "./styles/botoes.css";
import "./styles/vidro.css";
import "./styles/loja.css";
import "./styles/entrar.css";
import "./styles/suporte.css";
import { acordarServidor } from "./lib/api";

/* sem zoom de pinça: o Safari do iPhone ignora o user-scalable=no do index.html, mas respeita cancelar o gesto
   (esses eventos só existem no Safari) */
for (const ev of ["gesturestart", "gesturechange"]) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });

/* as páginas legais têm endereço próprio (/privacidade, /termos...) e abrem como página comum */
const legal = PAGINAS_LEGAIS[location.pathname.replace(/\/+$/, "") || "/"];
if (legal) document.title = `${legal.titulo} · RONDO`;
const TITULO = document.title;

/* A página principal (/) e a loja (/loja) trocam entre si sem recarregar (lib/navegar.ts): a loja vem junto no mesmo
   arquivo do site (é pequena; as imagens dela são arquivos à parte), então a troca é imediata nos dois sentidos. */
function Telas() {
  const rota = useRota();
  /* ao trocar de tela: o título e a rolagem (no topo, ou onde estava, ao voltar) */
  useLayoutEffect(() => {
    if (rota === "/") document.title = TITULO;
    if (primeiraTela()) return;
    const ancora = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (ancora) ancora.scrollIntoView({ behavior: "instant", block: "start" });
    else window.scrollTo({ top: rolagemGuardada(), behavior: "instant" });
  }, [rota]);
  /* com a tela aberta e o navegador folgado, adianta as imagens da outra */
  useEffect(() => {
    const outra = rota === "/loja" ? "/" : "/loja";
    const ocioso = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1200));
    const id = ocioso(() => adiantar(outra));
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id);
  }, [rota]);
  if (rota === "/loja") return <Loja />;
  if (rota === "/entrar") return <Entrar />;   // a tela do RONDIN para entrar ou criar conta sem sair do site
  return <App />;
}

if (!legal) interceptarLinks();
acordarServidor();   // o app vai precisar dele daqui a pouco (lib/api.ts)

const raiz = document.getElementById("root")!;
const montar = () => createRoot(raiz).render(
  <StrictMode>
    <a className="pular" href="#conteudo">Pular para o conteúdo</a>
    {legal ? <legal.Comp /> : <Telas />}
    <AvisoCookies />
  </StrictMode>,
);

/* Na página principal, o index.html já pôs a casca do topo (a foto) no lugar (public/assets/casca-1.js). Montar o site leva
   uns 100 a 200 ms com a thread ocupada, e o navegador só desenha depois: sem esperar, a casca nunca chegava a aparecer e a
   tela ficava preta até o site inteiro estar pronto (medido em 2026-11-19: primeira pintura aos 300 ms, com tudo em cache).
   Por isso o site espera o navegador desenhar um quadro com a casca e só então monta. O prazo de 150 ms é para a aba aberta
   em segundo plano, onde o navegador não desenha quadros: lá o site monta do mesmo jeito. */
if (raiz.querySelector(":scope > .hero[aria-hidden]")) {
  let feito = false;
  const umaVez = () => { if (!feito) { feito = true; montar(); } };
  requestAnimationFrame(() => requestAnimationFrame(umaVez));
  setTimeout(umaVez, 150);
} else {
  montar();
}
