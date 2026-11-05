import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { reduceMotion, vars } from "../lib/util";
import { Reveal, Section, Title } from "./ui";

/* Streak interativo: 12 semanas de registros.
   Clique em um quadrado: ele registra ou desfaz o dia, cresce e volta, e uma onda passa pelos vizinhos.
   A sequência é recalculada na hora: a primeira falha é folga; uma segunda em até 7 dias quebra. */
const WEEKS = 12, ROWS = 7, N = WEEKS * ROWS;
const SEED = [1,1,1,0,1,1,1, 1,1,0,1,1,1,1, 1,1,1,1,0,1,1, 1,0,1,1,1,1,1, 1,1,1,1,1,0,1, 1,1,1,1,1,1,1, 1,1,0,1,1,1,1, 1,1,1,1,1,1,0, 1,1,1,1,0,0,1, 1,1,1,1,0,1,1, 1,1,1,1,1,1,1, 1,1,1,0,1,1,1];
type S = "run" | "past" | "off" | "rest" | "restrun";
const TXT: Record<S, string> = { run: "registrado", past: "registrado", off: "sem registro", rest: "folga, não quebra a sequência", restrun: "folga, não quebra a sequência" };

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
const rel = (i: number) => { const ago = N - 1 - i; return ago === 0 ? "Hoje" : ago === 1 ? "Ontem" : `Há ${ago} dias`; };

export function Constancia() {
  const [days, setDays] = useState<number[]>(() => Array.from({ length: N }, (_, i) => SEED[i] ?? 1));
  const { count, start } = useMemo(() => streakOf(days), [days]);
  const span = N - 1 - start;
  const states = useMemo(() => days.map((_, i) => stateOf(days, i, start)), [days, start]);

  const board = useRef<HTMLElement>(null);
  const heat = useRef<HTMLDivElement>(null);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const countEl = useRef<HTMLElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [focusIdx, setFocusIdx] = useState(N - 1);
  const [phase, setPhase] = useState<"" | "arm" | "go">("");

  /* ---------- número que sobe ---------- */
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  const raf = useRef(0);
  const showCount = useCallback((n: number, instant = false) => {
    cancelAnimationFrame(raf.current);
    if (reduceMotion || instant) { shownRef.current = n; setShown(n); return; }
    const from = shownRef.current;
    if (n === from) { setShown(n); return; }
    const t0 = performance.now(), dur = Math.min(900, 300 + Math.abs(n - from) * 22);
    const step = (t: number) => {
      const k = Math.min((t - t0) / dur, 1);
      shownRef.current = Math.round(from + (n - from) * (1 - Math.pow(1 - k, 3)));
      setShown(shownRef.current);
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    const el = countEl.current;
    if (el) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  /* ---------- dica flutuante ---------- */
  const [tipI, setTipI] = useState(N - 1);
  const [tipOn, setTipOn] = useState(false);
  const [tipHold, setTipHold] = useState(0);
  const tipTimer = useRef(0), holdUntil = useRef(0);
  const showTip = (i: number, hold = 0) => {
    clearTimeout(tipTimer.current);
    setTipI(i); setTipOn(true); setTipHold(hold);
    holdUntil.current = hold ? performance.now() + hold : 0;
    if (hold) tipTimer.current = window.setTimeout(() => setTipOn(false), hold);
  };
  const hideUnlessHeld = () => { if (performance.now() > holdUntil.current) setTipOn(false); };
  useLayoutEffect(() => {   // posiciona depois de o texto da dica existir, para medir a largura
    const t = tip.current, b = cells.current[tipI], bd = board.current;
    if (!tipOn || !t || !b || !bd) return;
    const half = t.offsetWidth / 2;
    t.style.left = `${Math.min(bd.clientWidth - half - 8, Math.max(half + 8, b.offsetLeft + b.offsetWidth / 2))}px`;
    t.style.top = `${b.offsetTop - (tipHold ? b.offsetHeight * 0.15 : 0) - 8}px`;   // com o quadrado ampliado, a dica sobe junto
  }, [tipI, tipOn, tipHold, states]);

  /* ---------- clique: cresce, volta, e a onda passa ---------- */
  const restart = (b: HTMLElement, cls: string, anim: string) => {
    b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls);
    const done = (e: AnimationEvent) => {
      if (e.animationName !== anim) return;
      b.classList.remove(cls); b.removeEventListener("animationend", done);
    };
    b.addEventListener("animationend", done);
  };
  const burst = (i: number) => {
    if (reduceMotion) return;
    const wi = Math.floor(i / ROWS), di = i % ROWS;
    cells.current.forEach((b, j) => {
      if (!b) return;
      if (j === i) { restart(b, "c-pop", "cellPop"); return; }
      const dist = Math.hypot(Math.floor(j / ROWS) - wi, (j % ROWS) - di);
      if (dist > 3.3) return;
      b.style.setProperty("--rs", (1 + 0.08 / dist).toFixed(3));   // quanto mais perto, mais cresce (de leve)
      b.style.setProperty("--rd", `${Math.round(dist * 60)}ms`);   // e mais cedo
      restart(b, "c-wave", "cellWave");
    });
  };
  const toggle = (i: number) => {
    const next = days.map((v, j) => (j === i ? (v ? 0 : 1) : v));
    setDays(next);
    showCount(streakOf(next).count);
    burst(i);
    showTip(i, 1800);
  };

  /* ---------- início: os quadrados chegam em diagonal quando a grade entra na tela ---------- */
  useEffect(() => {
    const el = heat.current!;
    if (reduceMotion || !("IntersectionObserver" in window)) { showCount(streakOf(days).count, true); return; }
    setPhase("arm");
    let t1 = 0, t2 = 0;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      t1 = window.setTimeout(() => {
        setPhase("go");
        showCount(streakOf(days).count);
        t2 = window.setTimeout(() => setPhase(""), 1700);
      }, 250);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(t1); clearTimeout(t2); };
    // só na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const i = cells.current.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const step = ({ ArrowRight: ROWS, ArrowLeft: -ROWS, ArrowDown: 1, ArrowUp: -1 } as Record<string, number>)[e.key];
    const j = step !== undefined ? i + step : e.key === "Home" ? 0 : e.key === "End" ? N - 1 : -1;
    if (j < 0 || j >= N) return;
    e.preventDefault();
    cells.current[j]?.focus();
  };

  return (
    <Section id="constancia" ecg={3}>
      <div className="wrap streak-wrap">
        <Reveal>
          <Title parts="Falhar um dia não zera tudo." echo={false} style={{ margin: "0 0 1.2rem" }} />
          <p className="lead">O streak tem um dia de folga por semana. Clique nos quadrados ao lado e veja a sequência reagir: duas falhas na mesma semana quebram, uma só não.</p>
          <ul className="points">
            <li>Treino registrado <b>+30</b></li>
            <li>Refeições registradas <b>+20</b></li>
            <li>Check-in com foto <b>+10</b></li>
            <li>Meta de água <b>+5</b></li>
          </ul>
        </Reveal>
        <Reveal className="streak-board" innerRef={board}>
            <div className="streak-count">
              <svg className="flame" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5C9 10 10 10.5 11 10c0-3 1-5 1-7Z" /></svg>
              <b className="grad" ref={countEl}>{shown}</b>
              <span className="s-sub" style={{ fontSize: ".95rem" }}>dias seguidos</span>
            </div>
            <div className={`heat${phase ? ` ${phase}` : ""}`} ref={heat} role="group" aria-label="Calendário de registros" onKeyDown={onKey}
              onPointerLeave={hideUnlessHeld} onBlur={hideUnlessHeld}>
              {states.map((s, i) => (
                <button
                  key={i} type="button" data-s={s} ref={(el) => { cells.current[i] = el; }}
                  className={`c${i === N - 1 ? " today" : ""}`}
                  tabIndex={i === focusIdx ? 0 : -1}
                  style={vars({ "--d": `${(Math.floor(i / ROWS) + (i % ROWS)) * 24}ms`, ...(s === "run" ? { "--k": (span > 0 ? (i - start) / span : 1).toFixed(3) } : {}) })}
                  aria-pressed={!!days[i]} aria-label={`${rel(i)}: ${TXT[s]}`}
                  onClick={() => toggle(i)}
                  onPointerEnter={(e) => { if (e.pointerType === "mouse") showTip(i); }}
                  onFocus={() => { setFocusIdx(i); showTip(i); }}
                />
              ))}
            </div>
            <div className="legend"><span><i className="sw st-run" />na sequência</span><span><i className="sw st-past" />antes da sequência</span><span><i className="sw st-off" />sem registro</span><span><i className="sw st-rest" />folga que não quebra</span></div>
            <span className="sr-only" role="status">{count} {count === 1 ? "dia seguido" : "dias seguidos"}</span>
            <div className={`heat-tip${tipOn ? " on" : ""}`} ref={tip} aria-hidden="true">
              <b>{rel(tipI)}</b> · {TXT[states[tipI]]}
            </div>
        </Reveal>
      </div>
    </Section>
  );
}
