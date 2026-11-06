import { useEffect, useRef } from "react";
import { onFrame } from "../lib/frame";
import { reduceMotion, vars } from "../lib/util";
import { Btn, useCountUp } from "./ui";

const SAMPLES = 240, VB_W = 560, VB_H = 330;
const wrap1 = (v: number) => ((v % 1) + 1) % 1;
const shortest = (a: number, b: number) => { const d = wrap1(a) - wrap1(b); return d > 0.5 ? d - 1 : d < -0.5 ? d + 1 : d; };   // menor caminho entre duas posições

/* a bolinha e o rastro de eco logo atrás dela */
const TRAIL = [
  { r: 7, cls: "head" }, { r: 6.2, o: 0.5 }, { r: 5.4, o: 0.36 }, { r: 4.6, o: 0.24 }, { r: 3.8, o: 0.15 }, { r: 3.1, o: 0.08 },
];
const Runner = ({ id, cls }: { id: string; cls: string }) => (
  <g id={id} className={cls}>
    {TRAIL.map((c, i) => <circle key={i} r={c.r} className={c.cls ?? "t"} style={c.o ? vars({ "--o": c.o }) : undefined} />)}
  </g>
);

function Delta() {
  const v = useCountUp(12, !reduceMotion, 700, 1500, 4);
  return <output className="delta">+{v}%</output>;
}

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /* pista com você e, logo atrás, o seu ontem; o mouse perto da pista chama o corredor */
  useEffect(() => {
    const hero = heroRef.current, svg = svgRef.current;
    if (!hero || !svg) return;
    const pathYou = svg.querySelector<SVGPathElement>("#pathYou")!, pathGhost = svg.querySelector<SVGPathElement>("#pathGhost")!;
    const lenYou = pathYou.getTotalLength(), lenGhost = pathGhost.getTotalLength();
    const youDots = [...svg.querySelectorAll("#trailYou circle")], ghostDots = [...svg.querySelectorAll("#trailGhost circle")];
    const samples = Array.from({ length: SAMPLES }, (_, i) => pathYou.getPointAtLength((i / SAMPLES) * lenYou));
    const run = { you: 0.18, ghost: 0.06, chase: null as number | null, visible: true };   // posições na volta: 0 a 1

    const place = (dots: Element[], path: SVGPathElement, length: number, t: number) => {
      dots.forEach((c, k) => {
        const p = path.getPointAtLength(wrap1(t - k * 0.0065) * length);
        c.setAttribute("cx", p.x.toFixed(1));
        c.setAttribute("cy", p.y.toFixed(1));
      });
    };
    const paint = (dt: number) => {
      if (run.chase === null) run.you = wrap1(run.you + 0.00183 * dt);                                  // corre sozinho: cerca de 9 s por volta
      else run.you = wrap1(run.you + shortest(run.chase, run.you) * (1 - Math.pow(0.91, dt)));          // persegue o mouse pelo menor caminho
      run.ghost = wrap1(run.ghost + shortest(run.you - 0.12, run.ghost) * (1 - Math.pow(0.96, dt)));   // o ontem fica cerca de 12% da volta atrás
      place(youDots, pathYou, lenYou, run.you);
      place(ghostDots, pathGhost, lenGhost, run.ghost);
    };
    paint(0);   // posição inicial (vale também para quem prefere menos movimento)

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = svg.getBoundingClientRect();
      const near = r.width && e.clientX > r.left - 160 && e.clientX < r.right + 160 && e.clientY > r.top - 160 && e.clientY < r.bottom + 160;
      if (!near) { run.chase = null; return; }
      const x = ((e.clientX - r.left) / r.width) * VB_W, y = ((e.clientY - r.top) / r.height) * VB_H;
      let best = 0, bestD = Infinity;
      samples.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bestD) { bestD = d; best = i; } });
      run.chase = best / SAMPLES;
    };
    const onLeave = () => { run.chase = null; };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    /* a corrida só anda com o hero na tela; fora dela, o laço para (e a página não gasta nada com ela) */
    let off: (() => void) | null = null;
    const io = new IntersectionObserver(([en]) => {
      run.visible = en.isIntersecting;
      if (reduceMotion) return;
      if (run.visible && !off) off = onFrame((_, dt) => paint(dt));
      else if (!run.visible && off) { off(); off = null; }
    });
    io.observe(hero);
    return () => { hero.removeEventListener("pointermove", onMove); hero.removeEventListener("pointerleave", onLeave); io.disconnect(); off?.(); };
  }, []);

  return (
    <section className="hero" id="inicio" ref={heroRef}>
      <div className="wrap hero-in">
        <div className="hero-top">
          <h1 className="display hero-title" aria-label="Vença o você de ontem.">
            <span className="ln">Vença o</span>
            <span className="ln">você de</span>
            <span className="ln trail">ontem.</span>
          </h1>
          <div className="hero-art">
            <svg className="track" ref={svgRef} viewBox="0 0 560 330" role="img" aria-label="Pista de corrida: você, na frente, e o seu ontem logo atrás">
              <path className="ln o" d="M165 1H395A164 164 0 0 1 395 329H165A164 164 0 0 1 165 1Z" />
              <path className="ln" d="M165 37H395A128 128 0 0 1 395 293H165A128 128 0 0 1 165 37Z" />
              <path className="ln" d="M165 73H395A92 92 0 0 1 395 257H165A92 92 0 0 1 165 73Z" />
              <path className="start" d="M165 1V73" />
              <path id="pathGhost" className="guide" d="M165 19H395A146 146 0 0 1 395 311H165A146 146 0 0 1 165 19Z" />
              <path id="pathYou" className="guide" d="M165 55H395A110 110 0 0 1 395 275H165A110 110 0 0 1 165 55Z" />
              <Runner id="trailGhost" cls="ghost" />
              <Runner id="trailYou" cls="you" />
            </svg>
            <Delta />
            <p className="key" aria-hidden="true"><span><i className="k you" />HOJE</span><span><i className="k ghost" />ONTEM</span></p>
          </div>
        </div>

        <div className="hero-bottom">
          <p className="lead">Treino, dieta, constância e comunidade em um só app, e recados de voz para o seu eu do futuro.</p>
          <div className="hero-cta">
            <Btn href="#entrar">Quero entrar primeiro <span className="arrow">→</span></Btn>
            <Btn href="#recursos" kind="ghost">Ver o dia inteiro</Btn>
          </div>
        </div>
      </div>
    </section>
  );
}
