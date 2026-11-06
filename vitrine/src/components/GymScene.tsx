import { useEffect, useRef } from "react";
import { reduceMotion } from "../lib/util";
import { Btn } from "./ui";

/* Aparelhos de academia em 3D passando pela tela, enquanto a cor da tela muda de um para o outro.
   Tudo é desenhado no próprio navegador (three.js, formas simples, nenhum arquivo de modelo). A cena é presa à rolagem:
   rolar a página empurra o próximo aparelho da direita para a esquerda. O three.js só é baixado quando a seção está perto. */

type Cena = { nome: string; linha: string; cor: string; luz: string };

const CENAS: Cena[] = [
  { nome: "Halter", linha: "Abre com a carga de ontem e sugere a de hoje.", cor: "#3b0f8c", luz: "#c4a8ff" },
  { nome: "Kettlebell", linha: "Cada série registrada, cada recorde guardado.", cor: "#1b2a9e", luz: "#9db4ff" },
  { nome: "Barra", linha: "Volume da semana comparado com a anterior.", cor: "#7a1180", luz: "#f2a8ff" },
  { nome: "Banco", linha: "Descanso cronometrado entre uma série e outra.", cor: "#0b4a63", luz: "#8fe0ff" },
];

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};
/* o fundo da página é a cor de cada cena bem escurecida */
const escuro = (c: string, t: number) => "#" + hex(c).map((v) => Math.round(v * (1 - t)).toString(16).padStart(2, "0")).join("");
const ESCURAS = CENAS.map((c) => escuro(c.cor, 0.62));
const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const ease = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

export function GymScene() {
  const wrap = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const palavras = useRef<(HTMLSpanElement | null)[]>([]);
  const etiquetas = useRef<(HTMLLIElement | null)[]>([]);
  const indice = useRef<HTMLSpanElement>(null);
  const trilha = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const secao = wrap.current, alvo = host.current;
    if (!secao || !alvo) return;
    let vivo = true;
    let limpar = () => {};

    const progresso = () => {
      const r = secao.getBoundingClientRect();
      const total = Math.max(1, r.height - window.innerHeight);
      return Math.min(1, Math.max(0, -r.top / total));
    };
    const pintar = (q: number) => {
      const i0 = Math.min(CENAS.length - 2, Math.max(0, Math.floor(q)));
      const f = smooth(q - i0);
      const c = mix(CENAS[i0].cor, CENAS[i0 + 1].cor, f);
      secao.style.setProperty("--cena", c);
      secao.style.setProperty("--cena-escura", mix(ESCURAS[i0], ESCURAS[i0 + 1], f));
      const ativa = Math.min(CENAS.length - 1, Math.max(0, Math.round(q)));
      if (indice.current) indice.current.textContent = String(ativa + 1).padStart(2, "0");
      if (trilha.current) trilha.current.style.transform = `scaleX(${(q / (CENAS.length - 1)).toFixed(4)})`;
      etiquetas.current.forEach((el, i) => el?.classList.toggle("on", i === ativa));
      palavras.current.forEach((el, i) => {
        if (!el) return;
        const d = q - i;
        el.style.opacity = String(Math.max(0, 1 - Math.abs(d) * 1.9));
        el.style.transform = "none";
      });
    };
    /* sem WebGL (ou antes de baixar o three.js): só a cor e o nome mudam */
    const aoRolar = () => pintar(progresso() * (CENAS.length - 1));
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    limpar = () => window.removeEventListener("scroll", aoRolar);

    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || !vivo) return;
      io.disconnect();
      try {
        const sceneMod = await import("./gymScene3d");
        if (!vivo) return;
        const parar = sceneMod.iniciar(alvo, secao, CENAS, progresso, pintar, reduceMotion);
        const antes = limpar;
        limpar = () => { antes(); parar(); };
      } catch {
        /* sem WebGL neste aparelho: a seção continua mudando de cor e de nome */
      }
    }, { rootMargin: "600px 0px" });
    io.observe(secao);

    return () => { vivo = false; io.disconnect(); limpar(); };
  }, []);

  return (
    <section ref={wrap} className="gym" id="aparelhos" aria-labelledby="gym-titulo">
      {/* textura de spray: ruído que desmancha a borda das letras grandes */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <filter id="gym-spray" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="ruido" />
          <feDisplacementMap in="SourceGraphic" in2="ruido" scale="9" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </svg>
      <div className="gym-stage">
        <div className="gym-words" aria-hidden="true">
          {CENAS.map((c, i) => <span key={c.nome} ref={(el) => { palavras.current[i] = el; }} className="gym-word"><span>{c.nome}</span></span>)}
        </div>
        <div className="gym-canvas" ref={host} aria-hidden="true" />
        <div className="gym-grain" aria-hidden="true" />

        <ul className="gym-etiquetas" aria-hidden="true">
          {CENAS.map((c, i) => <li key={c.nome} ref={(el) => { etiquetas.current[i] = el; }} className={i === 0 ? "on" : ""}>[ {c.nome} ]</li>)}
        </ul>
        <p className="gym-serie" aria-hidden="true">[ Série: aparelhos 04 ]</p>

        <div className="gym-base">
          <h2 id="gym-titulo" className="gym-title"><span>Carga de ontem.</span><span>Passo de hoje.</span><span>Recorde de amanhã.</span></h2>
          <div className="gym-meio">
            <a className="gym-hex" href="#cadastro" aria-label="Criar conta grátis">
              <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" /><path d="M38 62 L64 36 M44 36 H64 V56" /></svg>
            </a>
            <div><b>Criar conta grátis</b><small>Cada aparelho abre com a carga de ontem e sugere a de hoje.</small></div>
          </div>
          <div className="gym-fim" aria-hidden="true">
            <span className="gym-pager"><span ref={indice}>01</span><i><em ref={trilha} /></i><span>04</span></span>
            <span className="gym-barras" />
          </div>
        </div>
      </div>
    </section>
  );
}
