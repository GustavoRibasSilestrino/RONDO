import { useEffect, useRef, useState, type ReactNode } from "react";
import { setGoMoment } from "../lib/bus";
import { reduceMotion, vars } from "../lib/util";
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
/* ---------- um dia inteiro: abas com os horários e um momento por vez ----------
   Nada prende a rolagem da página: as abas (ou o deslizar, no celular) trocam o momento. */
const SETA = { ant: "M15 6l-6 6 6 6", prox: "M9 6l6 6-6 6" };

export function Day() {
  const [atual, setAtual] = useState(0);
  const track = useRef<HTMLDivElement>(null), abas = useRef<HTMLDivElement>(null);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const atualRef = useRef(0);
  atualRef.current = atual;

  /* o momento para onde o palco está indo por uma seta ou aba (null: ninguém mandou, a rolagem é do dedo) */
  const indoPara = useRef<number | null>(null);
  const soltarEm = useRef(0);

  /* mostra o momento i: rola o palco de lado (só ele; a página fica onde está) */
  const ir = (i: number, suave = true) => {
    const t = track.current;
    const n = Math.max(0, Math.min(MOMENTS.length - 1, i));
    /* Enquanto a rolagem suave anda, ela passa pelos momentos do meio. Antes, cada um deles virava o "atual" por um instante
       e o relógio voltava ao horário anterior e pulava de novo (o tranco nos números). Agora a rolagem pedida não mexe no
       momento atual até chegar; quem manda é o destino. */
    indoPara.current = n;
    window.clearTimeout(soltarEm.current);
    soltarEm.current = window.setTimeout(() => { indoPara.current = null; }, 1200);   // garantia, se o navegador não avisar o fim
    setAtual(n);
    t?.scrollTo({ left: n * t.clientWidth, behavior: suave && !reduceMotion ? "smooth" : "auto" });
  };

  /* deslizou o palco com o dedo: a aba acompanha */
  useEffect(() => {
    const t = track.current!;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const destino = indoPara.current;
        if (destino !== null) {   // rolagem pedida por seta ou aba: só libera quando chegar
          if (Math.abs(t.scrollLeft - destino * t.clientWidth) < 2) indoPara.current = null;
          return;
        }
        const i = Math.round(t.scrollLeft / Math.max(1, t.clientWidth));
        if (i !== atualRef.current) setAtual(i);
      });
    };
    const fim = () => { indoPara.current = null; };
    const dedo = () => { indoPara.current = null; window.clearTimeout(soltarEm.current); };   // a pessoa pegou o palco: volta a mandar
    // girar o aparelho ou mudar o tamanho da janela: o palco continua no mesmo momento
    const ro = new ResizeObserver(() => { t.scrollLeft = atualRef.current * t.clientWidth; });
    ro.observe(t);
    t.addEventListener("scroll", onScroll, { passive: true });
    t.addEventListener("scrollend", fim);
    t.addEventListener("pointerdown", dedo, { passive: true });
    t.addEventListener("wheel", dedo, { passive: true });
    return () => {
      t.removeEventListener("scroll", onScroll); t.removeEventListener("scrollend", fim);
      t.removeEventListener("pointerdown", dedo); t.removeEventListener("wheel", dedo);
      ro.disconnect(); cancelAnimationFrame(raf); window.clearTimeout(soltarEm.current);
    };
  }, []);

  /* a aba escolhida fica à vista na faixa de abas (rola só a faixa, nunca a página) */
  useEffect(() => {
    const faixa = abas.current, b = botoes.current[atual];
    if (!faixa || !b) return;
    const esq = b.offsetLeft - faixa.offsetLeft, dir = esq + b.offsetWidth;
    if (esq < faixa.scrollLeft + 16 || dir > faixa.scrollLeft + faixa.clientWidth - 16) {
      faixa.scrollTo({ left: esq - (faixa.clientWidth - b.offsetWidth) / 2, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }, [atual]);

  /* vai direto a um momento do dia (usado pelo menu) */
  useEffect(() => {
    setGoMoment((name) => {
      const i = MOMENTS.findIndex((m) => m.name === name);
      if (i < 0) return;
      document.getElementById("recursos")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      ir(i, false);
    });
    return () => setGoMoment(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* teclado nas abas: setas andam, Home e End vão às pontas */
  const onKey = (e: React.KeyboardEvent) => {
    const passo = ({ ArrowRight: 1, ArrowLeft: -1 } as Record<string, number>)[e.key];
    const alvo = passo !== undefined ? atual + passo : e.key === "Home" ? 0 : e.key === "End" ? MOMENTS.length - 1 : -1;
    if (alvo < 0 || alvo >= MOMENTS.length) return;
    e.preventDefault();
    ir(alvo);
    botoes.current[alvo]?.focus();
  };

  const m = MOMENTS[atual];
  return (
    <section className="day" id="recursos" aria-label="Um dia inteiro no RONDO">
      <div className="wrap">
        <div className="day-head">
          <Title parts="Um dia inteiro contra o seu ontem." />
          {/* o horário novo entra deslizando de leve (a chave troca o elemento, e a animação roda uma vez) */}
          <time key={m.time} className="day-clock" dateTime={m.time} aria-live="polite">{m.time}</time>
        </div>

        <div className="day-tabs" ref={abas} role="tablist" aria-label="Horários do dia" onKeyDown={onKey}>
          {MOMENTS.map((x, i) => (
            <button
              key={x.id} ref={(el) => { botoes.current[i] = el; }} type="button" role="tab" id={`aba-${x.name}`}
              className="day-tab" aria-selected={i === atual} aria-controls={x.id} tabIndex={i === atual ? 0 : -1}
              onClick={() => ir(i)}
            >
              <small>{x.time}</small><b>{x.title}</b>
            </button>
          ))}
        </div>

        {/* o palco com uma seta de cada lado, na altura do meio */}
        <div className="day-stage">
          <button type="button" className="day-seta ant" aria-label="Momento anterior" disabled={atual === 0} onClick={() => ir(atual - 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={SETA.ant} /></svg>
          </button>
          <div className="day-track" ref={track}>
            {MOMENTS.map((x) => (
              <article className="moment" id={x.id} key={x.id} role="tabpanel" aria-labelledby={`aba-${x.name}`} data-name={x.name}>
                <div className="m-text"><h3>{x.title}</h3><p>{x.text}</p></div>
                {x.ui}
              </article>
            ))}
          </div>
          <button type="button" className="day-seta prox" aria-label="Próximo momento" disabled={atual === MOMENTS.length - 1} onClick={() => ir(atual + 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={SETA.prox} /></svg>
          </button>
        </div>
        <p className="illustr">Telas ilustrativas do app, com nomes e números fictícios.</p>
      </div>
    </section>
  );
}
