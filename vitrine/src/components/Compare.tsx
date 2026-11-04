import { useEffect, useRef, useState } from "react";
import { reduceMotion, vars } from "../lib/util";
import { Reveal, Section, Title } from "./ui";

const ONTEM: [string, string, string?][] = [
  ["Supino · 1RM estimado", "98", "kg"], ["Volume semanal", "11,5", "t"], ["Refeições registradas", "18", "/ 21"], ["Água por dia", "5,1", "copos"],
];
const HOJE: [string, string, string][] = [
  ["Supino · 1RM estimado", "101", "+3 kg"], ["Volume semanal", "12,4", "+8%"], ["Refeições registradas", "21", "/ 21"], ["Água por dia", "6,4", "+1,3"],
];

export function Compare() {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);

  /* ao entrar na tela, o cursor vem do lado do "hoje" até o meio */
  useEffect(() => {
    const el = box.current;
    if (reduceMotion || !el) return;
    let raf = 0;
    const io = new IntersectionObserver(([en], ob) => {
      if (!en.isIntersecting) return;
      ob.disconnect();
      let t0: number | undefined;
      const intro = (t: number) => {
        t0 ??= t;
        const k = Math.min((t - t0) / 1400, 1);
        setPos(92 - 42 * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(intro);
      };
      raf = requestAnimationFrame(intro);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  return (
    <Section id="compare" ecg={0}>
      <div className="wrap">
        <Reveal className="section-head">
          <Title parts="Seu ontem, lado a lado com o seu hoje." />
          <p className="lead">O card Você vs. ontem compara a sua semana com a anterior: treinos, volume, refeições, água e sono. É o que você compartilha nos stories. Arraste para ver.</p>
        </Reveal>
        <Reveal className="cmp" style={vars({ "--pos": `${pos}%` })} aria-label="Comparação entre ontem e hoje">
            <div className="cmp-layer cmp-ontem" aria-hidden="true" ref={box}>
              <header><span className="cmp-tag">ONTEM</span><span className="chip">semana passada</span></header>
              <div className="cmp-rows">
                {ONTEM.map(([k, v, u]) => <div className="cmp-row" key={k}><small>{k}</small><b>{v}<em>{u}</em></b></div>)}
              </div>
            </div>
            <div className="cmp-layer cmp-hoje">
              <header><span className="cmp-tag">HOJE</span><span className="chip good">+12% no geral</span></header>
              <div className="cmp-rows">
                {HOJE.map(([k, v, u]) => <div className="cmp-row" key={k}><small>{k}</small><b>{v}<em className="up">{u}</em></b></div>)}
              </div>
            </div>
            <input type="range" className="cmp-range" min={0} max={100} value={pos} onChange={(e) => setPos(+e.target.value)} aria-label="Arraste para comparar ontem e hoje" />
            <div className="cmp-handle" aria-hidden="true" />
            <span className="cmp-hint">ARRASTE</span>
        </Reveal>
      </div>
    </Section>
  );
}
