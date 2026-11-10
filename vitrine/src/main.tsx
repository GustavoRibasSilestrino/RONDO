import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AvisoCookies } from "./components/AvisoCookies";
import { PAGINAS_LEGAIS } from "./components/Legal";
/* fontes servidas pelo próprio site (só o alfabeto latino): nenhuma chamada ao Google, nenhum IP de visitante enviado a terceiros */
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/menu.css";
import "./styles/nav-mobile.css";
import "./styles/day.css";
import "./styles/gym.css";
import "./styles/fit.css";
import "./styles/streak.css";
import "./styles/mobile.css";
import "./styles/responsive.css";
import "./styles/cadastro.css";
import "./styles/legal.css";
import "./styles/hero.css";
import "./styles/acabamento.css";

/* sem zoom de pinça: o Safari do iPhone ignora o user-scalable=no do index.html, mas respeita cancelar o gesto
   (esses eventos só existem no Safari) */
for (const ev of ["gesturestart", "gesturechange"]) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });

/* as páginas legais têm endereço próprio (/privacidade, /termos...); o resto é a página principal */
const rota = location.pathname.replace(/\/+$/, "") || "/";
const legal = PAGINAS_LEGAIS[rota];
if (legal) document.title = `${legal.titulo} · RONDO`;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <a className="pular" href="#conteudo">Pular para o conteúdo</a>
    {legal ? <legal.Comp /> : <App />}
    <AvisoCookies />
  </StrictMode>,
);
