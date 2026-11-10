import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reduceMotion, vars } from "../lib/util";
import { Reveal, Section, Title } from "./ui";

/* Streak: 12 semanas de registros, só para olhar (os quadrados não respondem a clique).
   A sequência é calculada dos registros: a primeira falha é folga; uma segunda em até 7 dias quebra. */
const WEEKS = 12, ROWS = 7, N = WEEKS * ROWS;
const SEED = [1,1,1,0,1,1,1, 1,1,0,1,1,1,1, 1,1,1,1,0,1,1, 1,0,1,1,1,1,1, 1,1,1,1,1,0,1, 1,1,1,1,1,1,1, 1,1,0,1,1,1,1, 1,1,1,1,1,1,0, 1,1,1,1,0,0,1, 1,1,1,1,0,1,1, 1,1,1,1,1,1,1, 1,1,1,0,1,1,1];
type S = "run" | "past" | "off" | "rest" | "restrun";

function streakOf(days: number[]) {
  let count = 0, start = N, lastMiss: number | null = null;
  for (let i = N - 1; i >= 0; i--) {
    if (days[i]) { count++; start = i; continue; }
    if (lastMiss !== null && lastMiss - i < 7) break;
    lastMiss = i;
  }
  return { count, start };   // start: primeiro dia que ainda conta na sequência
}
/* falta isolada (sem outra na mesma janela de 7 dias) é folga e não quebra a sequência */
const missIsRest = (days: number[], i: number) => {
  const from = Math.max(0, i - 6);
  return !days.slice(from, i + 7).some((v, k) => !v && from + k !== i);
};
const stateOf = (days: number[], i: number, start: number): S =>
  days[i] ? (i >= start ? "run" : "past") : missIsRest(days, i) ? (i > start ? "restrun" : "rest") : "off";

const DAYS = Array.from({ length: N }, (_, i) => SEED[i] ?? 1);

export function Constancia() {
  const { count, start } = useMemo(() => streakOf(DAYS), []);
  const span = N - 1 - start;
  const states = useMemo(() => DAYS.map((_, i) => stateOf(DAYS, i, start)), [start]);

  const heat = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"" | "arm" | "go">("");

  /* ---------- número que sobe ---------- */
  const [shown, setShown] = useState(0);
  const raf = useRef(0);
  const showCount = useCallback((n: number, instant = false) => {
    cancelAnimationFrame(raf.current);
    if (reduceMotion || instant) { setShown(n); return; }
    const t0 = performance.now(), dur = Math.min(900, 300 + n * 22);
    const step = (t: number) => {
      const k = Math.min((t - t0) / dur, 1);
      setShown(Math.round(n * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /* ---------- início: os quadrados chegam em diagonal quando a grade entra na tela ---------- */
  useEffect(() => {
    const el = heat.current!;
    if (reduceMotion || !("IntersectionObserver" in window)) { showCount(count, true); return; }
    setPhase("arm");
    let t1 = 0, t2 = 0;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      t1 = window.setTimeout(() => {
        setPhase("go");
        showCount(count);
        t2 = window.setTimeout(() => setPhase(""), 1700);
      }, 250);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(t1); clearTimeout(t2); };
  }, [count, showCount]);

  return (
    <Section id="constancia">
      <div className="wrap streak-wrap">
        <Reveal>
          <Title parts="Falhar um dia não zera tudo." echo={false} style={{ margin: "0 0 1.2rem" }} />
          <p className="lead">O streak tem um dia de folga por semana: uma falha isolada não quebra a sequência, duas na mesma semana quebram.</p>
          <ul className="points">
            <li>Treino registrado <b>+30</b></li>
            <li>Refeições registradas <b>+20</b></li>
            <li>Check-in com foto <b>+10</b></li>
            <li>Meta de água <b>+5</b></li>
          </ul>
        </Reveal>
        <Reveal className="streak-board">
          <div className="streak-count">
            <svg className="flame" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5C9 10 10 10.5 11 10c0-3 1-5 1-7Z" /></svg>
            <b className="grad">{shown}</b>
            <span className="s-sub" style={{ fontSize: ".95rem" }}>dias seguidos</span>
          </div>
          <div className={`heat${phase ? ` ${phase}` : ""}`} ref={heat} role="img" aria-label={`Calendário de 12 semanas: ${count} dias seguidos`}>
            {states.map((s, i) => (
              <i
                key={i} data-s={s}
                className={`c${i === N - 1 ? " today" : ""}`}
                style={vars({ "--d": `${(Math.floor(i / ROWS) + (i % ROWS)) * 24}ms`, ...(s === "run" ? { "--k": (span > 0 ? (i - start) / span : 1).toFixed(3) } : {}) })}
              />
            ))}
          </div>
          <div className="legend"><span><i className="sw st-run" />na sequência</span><span><i className="sw st-past" />antes da sequência</span><span><i className="sw st-off" />sem registro</span><span><i className="sw st-rest" />folga que não quebra</span></div>
          <span className="sr-only" role="status">{count} {count === 1 ? "dia seguido" : "dias seguidos"}</span>
        </Reveal>
      </div>
    </Section>
  );
}
