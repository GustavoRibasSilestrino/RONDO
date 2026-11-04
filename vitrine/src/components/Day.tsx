import { useEffect, useRef, useState, type ReactNode } from "react";
import { setGoMoment } from "../lib/bus";
import { onFrame } from "../lib/frame";
import { clamp, reduceMotion, STACK_QUERY, vars } from "../lib/util";
import { Spot, Title } from "./ui";

/* ---------- os momentos do dia ---------- */
function Treino() {
  const [on, setOn] = useState([true, true, false]);
  const [rest, setRest] = useState(90);
  useEffect(() => {
    const id = setInterval(() => setRest((r) => (r > 0 ? r - 1 : 90)), 1000);
    return () => clearInterval(id);
  }, []);
  const sets = [["80", "1"], ["82,5", "2"], ["82,5", "3"]];
  return (
    <div className="m-ui">
      <div><h4>Supino reto</h4><small>Última vez: 80 kg × 8 · 1RM 101 kg</small></div>
      <div className="s-card">
        <Spot />
        <div className="s-row"><b style={{ fontSize: ".85rem" }}>Séries</b><span className="chip good">PR</span></div>
        {sets.map(([kg, n], i) => (
          <div className="set" key={n}>
            <span>{n}</span><div className="f">{kg}<i>kg</i></div><div className="f">8<i>reps</i></div>
            <button className={`ok${on[i] ? " on" : ""}`} type="button" aria-label={`série ${n}`} aria-pressed={on[i]}
              onClick={() => setOn((o) => o.map((v, j) => (j === i ? !v : v)))}>✓</button>
          </div>
        ))}
        <div className="suggest">Topo da faixa batido. Próxima vez: 85 kg</div>
      </div>
      <div className="s-card s-row"><Spot /><span className="s-sub">Descanso</span><b className="mono">{String(Math.floor(rest / 60)).padStart(2, "0")}:{String(rest % 60).padStart(2, "0")}</b></div>
      <Cmp a="80 kg × 8" b="82,5 kg × 8" />
    </div>
  );
}

function Agua() {
  const [n, setN] = useState(5);
  // tocar no último copo cheio o esvazia; tocar em outro enche até ele
  const tap = (i: number) => setN(i < n && i + 1 === n ? i : i + 1);
  return (
    <div className="m-ui">
      <h4>Água</h4>
      <div><div className="big-num"><span>{n}</span><small style={{ fontSize: "1rem", color: "var(--ink-2)" }}> / 8 copos</small></div><small>Toque nos copos</small></div>
      <div className="cups">
        {Array.from({ length: 8 }, (_, i) => (
          <button key={i} className={`cup${i < n ? " on" : ""}`} type="button" aria-label={`copo ${i + 1}`} aria-pressed={i < n} onClick={() => tap(i)} />
        ))}
      </div>
      <Cmp a="4 copos" b={`${n} ${n === 1 ? "copo" : "copos"}`} />
    </div>
  );
}

const Cmp = ({ a, b }: { a: string; b: string }) => (
  <div className="m-cmp"><span>ONTEM<b>{a}</b></span><span>HOJE<b>{b}</b></span></div>
);

function Dieta() {
  return (
    <div className="m-ui">
      <h4>Dieta</h4>
      <div className="ring" style={vars({ "--p": 60 })}><b>930<small>kcal restantes</small></b></div>
      <div className="macros">
        <div><b>96 g</b>Proteína<div className="bar"><i style={{ width: "60%" }} /></div></div>
        <div><b>160 g</b>Carbo<div className="bar e"><i style={{ width: "55%" }} /></div></div>
        <div><b>38 g</b>Gordura<div className="bar g"><i style={{ width: "48%" }} /></div></div>
      </div>
      <div className="s-card">
        <Spot />
        <div className="meal"><b>Café da manhã</b><span>480</span></div>
        <div className="meal"><b>Almoço</b><span>650</span></div>
        <div className="meal"><b>Lanche</b><span>290</span></div>
      </div>
      <Cmp a="1.310 kcal" b="1.420 kcal" />
    </div>
  );
}

function Corrida() {
  return (
    <div className="m-ui">
      <h4>Corrida</h4>
      <div className="route">
        <svg viewBox="0 0 260 130" fill="none">
          <defs><linearGradient id="gr" x1="0" x2="1"><stop stopColor="#6d28d9" /><stop offset="1" stopColor="#c4a8ff" /></linearGradient></defs>
          <path d="M12 108 C50 20 90 130 130 60 S210 10 248 40" stroke="url(#gr)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="248" cy="40" r="5" fill="#fff" />
        </svg>
      </div>
      <div className="macros"><div><b>5,2 km</b>Distância</div><div><b>31:08</b>Tempo</div><div><b>5'59"</b>Ritmo</div></div>
      <Cmp a={`6'12"/km`} b={`5'59"/km`} />
    </div>
  );
}

function Social() {
  return (
    <div className="m-ui">
      <div className="s-row" style={{ justifyContent: "flex-start", gap: ".7rem" }}>
        <div className="avatar" style={{ background: "var(--violet)" }}>MR</div>
        <div><b style={{ fontSize: ".85rem" }}>Marina Rocha</b><br /><small>há 12 min · Corrida de rua</small></div>
      </div>
      <p style={{ fontSize: ".82rem" }}>Primeira vez abaixo de 6'00"/km.</p>
      <div className="s-card"><Spot /><small>Novo recorde pessoal</small><br /><b>5,2 km em 31:08</b></div>
      <div className="s-card"><Spot /><small>Clube · Hipertrofia iniciantes</small><div className="bar e"><i style={{ width: "74%" }} /></div></div>
      <Cmp a="360 treinos" b="370 treinos" />
    </div>
  );
}

function Sono() {
  const bars = [[70, false], [82, false], [48, true], [76, false], [88, false], [80, false], [74, false]] as const;
  return (
    <div className="m-ui">
      <h4>Sono</h4>
      <div className="big-num">7h20<small style={{ fontSize: "1rem", color: "var(--ink-2)" }}> média</small></div>
      <div className="bars">{bars.map(([h, low], i) => <i key={i} className={low ? "low" : undefined} style={{ height: `${h}%` }} />)}</div>
      <div className="days">{["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => <span key={i}>{d}</span>)}</div>
      <Cmp a="6h40" b="7h20" />
    </div>
  );
}

const MINI = [3,3,2,3,0,3,3, 3,2,3,3,3,1,3, 3,3,3,0,3,3,3, 2,3,3,3,3,3,0, 3,3,2,3,3,3,3];
function Streak() {
  return (
    <div className="m-ui">
      <h4>Streak</h4>
      <div className="big-num accent">23 <small style={{ fontSize: "1rem", color: "var(--ink-2)" }}>dias</small></div>
      <div className="s-card"><Spot /><div className="heat" style={{ gridTemplateRows: "repeat(7,1fr)" }}>{MINI.map((l, i) => <i key={i} className={l === 0 ? "rest" : `l${l}`} />)}</div></div>
      <small>Tracejado: dia de folga. A sequência continua.</small>
      <Cmp a="22 dias" b="23 dias" />
    </div>
  );
}

type Moment = { id: string; time: string; name: string; title: string; text: string; ui: ReactNode };
const MOMENTS: Moment[] = [
  { id: "m-treino", time: "06:40", name: "treino", title: "Treino", text: "Abre com a última carga. Registre cada série e receba a sugestão da próxima, com recordes e alerta de estagnação.", ui: <Treino /> },
  { id: "m-agua", time: "08:10", name: "agua", title: "Hidratação", text: "Meta de água em copos, com lembretes. Um toque por copo.", ui: <Agua /> },
  { id: "m-dieta", time: "12:30", name: "dieta", title: "Dieta", text: "Meta calórica calculada, macros e refeições com a Tabela TACO. A lista de compras sai do cardápio da semana.", ui: <Dieta /> },
  { id: "m-corrida", time: "17:45", name: "corrida", title: "Corrida", text: "Ritmo e distância registrados. GPS e integração com apps de corrida chegam em versões futuras.", ui: <Corrida /> },
  { id: "m-social", time: "19:30", name: "social", title: "Comunidade", text: "Feed, clubes e desafios coletivos. Compartilhe um recorde ou o seu card Você vs. ontem.", ui: <Social /> },
  { id: "m-sono", time: "23:10", name: "sono", title: "Sono", text: "Horas dormidas registradas à mão e comparadas com a sua semana anterior.", ui: <Sono /> },
  { id: "m-streak", time: "23:59", name: "streak", title: "Streak", text: "O dia fecha e a sequência continua. Um dia de folga por semana não zera nada.", ui: <Streak /> },
];
const MINS = MOMENTS.map((m) => { const [h, mm] = m.time.split(":").map(Number); return h * 60 + mm; });

/* ---------- a linha do tempo anda na horizontal conforme você rola ---------- */
export function Day() {
  const pin = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null), clock = useRef<HTMLTimeElement>(null), bar = useRef<HTMLElement>(null);

  useEffect(() => {
    const pinEl = pin.current!, trackEl = track.current!, clockEl = clock.current!, barEl = bar.current!;
    const moments = [...trackEl.querySelectorAll<HTMLElement>(".moment")];
    const stacked = matchMedia(STACK_QUERY);
    let dist = 0, lastClock = "";
    const measure = () => { dist = Math.max(0, trackEl.offsetWidth - (trackEl.parentElement?.clientWidth ?? 0)); };
    measure();
    addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(trackEl);

    const update = () => {
      if (stacked.matches) { if (trackEl.style.transform) trackEl.style.transform = ""; return; }
      const r = pinEl.getBoundingClientRect(), total = pinEl.offsetHeight - innerHeight;
      if (r.bottom < -60 || r.top > innerHeight + 60) return;
      const p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
      trackEl.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
      barEl.style.transform = `scaleX(${p.toFixed(4)})`;
      const f = p * (moments.length - 1), i0 = Math.floor(f), i1 = Math.min(i0 + 1, moments.length - 1);
      const m = Math.round(MINS[i0] + (MINS[i1] - MINS[i0]) * (f - i0));
      const text = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      if (text !== lastClock) { lastClock = text; clockEl.textContent = text; clockEl.dateTime = text; }
      const act = Math.round(f);
      moments.forEach((el, i) => el.classList.toggle("on", i === act));
    };

    /* vai direto a um momento do dia (usado pelo menu) */
    setGoMoment((name) => {
      const i = MOMENTS.findIndex((m) => m.name === name);
      if (i < 0) return;
      const behavior = reduceMotion ? "auto" : "smooth";
      if (stacked.matches) { moments[i].scrollIntoView({ behavior, block: "start" }); return; }
      const total = pinEl.offsetHeight - innerHeight, top = pinEl.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + (i / (moments.length - 1)) * total, behavior });
    });

    let off: (() => void) | undefined;
    if (reduceMotion) { update(); addEventListener("scroll", update, { passive: true }); }
    else off = onFrame(update);
    stacked.addEventListener("change", update);
    return () => {
      removeEventListener("resize", measure); removeEventListener("scroll", update);
      stacked.removeEventListener("change", update);
      ro.disconnect(); off?.(); setGoMoment(null);
    };
  }, []);

  return (
    <section className="day" id="recursos" aria-label="Um dia inteiro no RONDO" style={vars({ "--n": MOMENTS.length })}>
      <div className="day-pin" ref={pin}>
        <div className="day-sticky">
          <div className="wrap day-head">
            <Title parts="Um dia inteiro contra o seu ontem." />
            <time className="day-clock" ref={clock} dateTime="06:40">06:40</time>
          </div>

          <div className="day-viewport">
            <div className="day-track" ref={track}>
              {MOMENTS.map((m) => (
                <article className="moment" id={m.id} key={m.id} data-time={m.time} data-name={m.name}>
                  <div className="m-text"><h3>{m.title}</h3><p>{m.text}</p></div>
                  {m.ui}
                </article>
              ))}
            </div>
          </div>

          <div className="wrap day-foot">
            <div className="day-bar">
              <i className="fill" ref={bar} />
              {MOMENTS.map((m, i) => <i key={m.id} className="tick" style={{ left: `${(i / (MOMENTS.length - 1)) * 100}%` }} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
