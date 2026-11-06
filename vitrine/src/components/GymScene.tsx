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
const smooth = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
const ease = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

export function GymScene() {
  const wrap = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const palavras = useRef<(HTMLSpanElement | null)[]>([]);

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
      palavras.current.forEach((el, i) => {
        if (!el) return;
        const d = q - i;
        el.style.opacity = String(Math.max(0, 1 - Math.abs(d) * 1.9));
        el.style.transform = `translate3d(${(-d * 16).toFixed(2)}vw,0,0)`;
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
      <div className="gym-stage">
        <div className="gym-words" aria-hidden="true">
          {CENAS.map((c, i) => <span key={c.nome} ref={(el) => { palavras.current[i] = el; }} className="gym-word">{c.nome}</span>)}
        </div>
        <div className="gym-canvas" ref={host} aria-hidden="true" />
        <div className="gym-copy wrap">
          <h2 id="gym-titulo" className="gym-title">Cada aparelho, com a carga de ontem.</h2>
          <ul className="gym-lista">
            {CENAS.map((c) => <li key={c.nome}><b>{c.nome}</b> {c.linha}</li>)}
          </ul>
          <Btn href="#cadastro">Criar conta grátis</Btn>
        </div>
      </div>
    </section>
  );
}
