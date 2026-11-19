import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AvisoCookies } from "./components/AvisoCookies";
import { PAGINAS_LEGAIS } from "./components/Legal";
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
import { acordarServidor } from "./lib/api";

/* sem zoom de pinça: o Safari do iPhone ignora o user-scalable=no do index.html, mas respeita cancelar o gesto
   (esses eventos só existem no Safari) */
for (const ev of ["gesturestart", "gesturechange"]) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });

/* as páginas legais têm endereço próprio (/privacidade, /termos...); o resto é a página principal */
const rota = location.pathname.replace(/\/+$/, "") || "/";
const legal = PAGINAS_LEGAIS[rota];
if (legal) document.title = `${legal.titulo} · RONDO`;
/* a loja de pacotinhos também tem endereço próprio (/loja) e só é baixada por quem entra nela */
const naLoja = rota === "/loja";
const Loja = lazy(() => import("./components/Loja"));

acordarServidor();   // o app vai precisar dele daqui a pouco (lib/api.ts)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <a className="pular" href="#conteudo">Pular para o conteúdo</a>
    {legal ? <legal.Comp /> : naLoja ? <Suspense fallback={null}><Loja /></Suspense> : <App />}
    <AvisoCookies />
  </StrictMode>,
);
