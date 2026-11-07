/* GSAP (animações) com o ScrollTrigger, registrado uma vez só. Quem precisa importa daqui, nunca direto do pacote. */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });   // a barra do navegador do celular sumindo não deve refazer as contas

/* as fontes carregam depois da página e mudam a altura das seções: recalcula onde cada gatilho fica */
if (typeof document !== "undefined" && document.fonts) void document.fonts.ready.then(() => ScrollTrigger.refresh());

export { gsap, ScrollTrigger };
