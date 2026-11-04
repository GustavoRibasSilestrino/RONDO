import { useRef, useState } from "react";
import { clamp } from "../lib/util";
import { Reveal, Section, Spot, Title } from "./ui";

/* campo numérico com duas setas próprias (segurar repete), no lugar do seletor do navegador */
type NumProps = { label: string; value: string; onChange: (v: string) => void; min: number; max?: number; step?: number };
function NumberField({ label, value, onChange, min, max = Infinity, step = 1 }: NumProps) {
  const hold = useRef<{ wait?: number; rep?: number }>({});
  const latest = useRef(value);
  latest.current = value;
  const decimals = (String(step).split(".")[1] ?? "").length;
  const bump = (dir: 1 | -1) => {
    const next = clamp((parseFloat(latest.current) || 0) + dir * step, min, max);
    latest.current = next.toFixed(decimals);
    onChange(latest.current);
  };
  const stop = () => { clearTimeout(hold.current.wait); clearInterval(hold.current.rep); };
  const arrow = (dir: 1 | -1, label: string, d: string) => (
    <button
      type="button" className={dir === 1 ? "up" : "down"} aria-label={label} tabIndex={-1}
      onPointerDown={(e) => {
        e.preventDefault();
        bump(dir);
        hold.current.wait = window.setTimeout(() => { hold.current.rep = window.setInterval(() => bump(dir), 70); }, 380);
      }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
    >
      <svg viewBox="0 0 12 12" aria-hidden="true"><path d={d} /></svg>
    </button>
  );
  return (
    <label className="field">{label}
      <span className="num">
        <input type="number" value={value} min={min} max={max === Infinity ? undefined : max} step={step} onChange={(e) => onChange(e.target.value)} />
        <span className="num-btns">{arrow(1, "Aumentar", "M2.5 7.5 6 4l3.5 3.5")}{arrow(-1, "Diminuir", "M2.5 4.5 6 8l3.5-3.5")}</span>
      </span>
    </label>
  );
}

const num = (s: string) => parseFloat(s) || 0;

function Forca() {
  const [carga, setCarga] = useState("80");
  const [reps, setReps] = useState("8");
  const rm = num(carga) * (1 + Math.max(1, num(reps)) / 30);
  const next = (Math.round(num(carga) * 1.04 * 2) / 2).toString().replace(".", ",");
  return (
    <Reveal as="form" className="tool" id="f1rm" onSubmit={(e: React.FormEvent) => e.preventDefault()}>
      <Spot />
      <h3>Força estimada (1RM)</h3>
      <p>Fórmula de Epley: carga × (1 + repetições ÷ 30). Compare 80 kg × 8 com 85 kg × 5 na mesma escala.</p>
      <div className="fields">
        <NumberField label="CARGA (KG)" value={carga} onChange={setCarga} min={1} step={0.5} />
        <NumberField label="REPETIÇÕES" value={reps} onChange={setReps} min={1} max={30} />
      </div>
      <div className="result">
        <div><b>{Math.round(rm)}</b><small>1RM estimado (kg)</small></div>
        <div><b>{next}</b><small>próxima carga (kg)</small></div>
        <p className="wide">Se você completar todas as séries no topo da faixa, o app sugere subir de 2 a 5%.</p>
      </div>
    </Reveal>
  );
}

function Calorias() {
  const [f, setF] = useState({ sexo: "m", idade: "28", peso: "78", altura: "178", ativ: "1.55", obj: "1" });
  const set = (k: keyof typeof f) => (v: string) => setF((o) => ({ ...o, [k]: v }));
  const m = f.sexo === "m", peso = num(f.peso);
  const tmb = 10 * peso + 6.25 * num(f.altura) - 5 * num(f.idade) + (m ? 5 : -161);
  const kcal = Math.max(m ? 1500 : 1200, Math.round(tmb * num(f.ativ) * num(f.obj)));
  const select = (label: string, k: keyof typeof f, opts: [string, string][]) => (
    <label className="field">{label}
      <select value={f[k]} onChange={(e) => set(k)(e.target.value)}>{opts.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
    </label>
  );
  return (
    <Reveal as="form" className="tool" id="fkcal" onSubmit={(e: React.FormEvent) => e.preventDefault()}>
      <Spot />
      <h3>Meta calórica</h3>
      <p>Mifflin-St Jeor × nível de atividade, ajustado ao objetivo e com piso de segurança.</p>
      <div className="fields">
        {select("SEXO", "sexo", [["m", "Masculino"], ["f", "Feminino"]])}
        <NumberField label="IDADE" value={f.idade} onChange={set("idade")} min={14} max={90} />
        <NumberField label="PESO (KG)" value={f.peso} onChange={set("peso")} min={30} max={250} step={0.1} />
        <NumberField label="ALTURA (CM)" value={f.altura} onChange={set("altura")} min={120} max={230} />
        {select("ATIVIDADE", "ativ", [["1.2", "Sedentário"], ["1.375", "Leve"], ["1.55", "Moderado"], ["1.725", "Intenso"]])}
        {select("OBJETIVO", "obj", [["0.85", "Perder"], ["1", "Manter"], ["1.1", "Ganhar"]])}
      </div>
      <div className="result">
        <div><b>{kcal.toLocaleString("pt-BR")}</b><small>kcal por dia</small></div>
        <div><b>{Math.round(peso * 2)}</b><small>g de proteína (2 g/kg)</small></div>
        <p className="wide">Estimativa para organização, não prescrição. Para um plano individual, procure um nutricionista.</p>
      </div>
    </Reveal>
  );
}

export function Tools() {
  return (
    <Section id="ferramentas" tone="tint" ecg={2}>
      <div className="wrap">
        <Reveal className="section-head">
          <Title parts="A matemática do app, aberta para você testar." />
          <p className="lead">Nada de mágica: a avaliação é cálculo sobre o que você registra. Teste as mesmas fórmulas que o app usa.</p>
        </Reveal>
        <div className="tools"><Forca /><Calorias /></div>
      </div>
    </Section>
  );
}
