import { useEffect, useMemo, useRef, useState } from "react";
import { vars } from "../lib/util";
import { Reveal, Section, Title } from "./ui";

const QUESTIONS = [
  "Do que você tem orgulho esta semana?",
  "Por que você está começando agora?",
  "O que te tirou do sério hoje?",
  "Qual treino você quase pulou e fez mesmo assim?",
  "Como você quer se sentir daqui a 90 dias?",
];
const WHEN = [["30", "30 dias"], ["90", "90 dias"], ["180", "6 meses"], ["365", "1 ano"]] as const;
const IDLE = "Aperte o microfone para simular uma gravação.";
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const dateIn = (days: number) => {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

/* ondas de áudio */
function Wave({ n }: { n: number }) {
  const bars = useMemo(() => Array.from({ length: n }, (_, i) => {
    const h = 18 + Math.abs(Math.sin(i * 1.7) * 52) + ((i * 37) % 22);
    return vars({ "--h": `${Math.min(h, 100)}%`, "--d": `${(i % 9) * 0.11}s` });
  }), [n]);
  return <div className="wave big" aria-hidden="true">{bars.map((s, i) => <i key={i} style={s} />)}</div>;
}

/* gravador de recado (simulação, sem acessar o microfone) */
function Recorder() {
  const [qi, setQi] = useState(0);
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const [when, setWhen] = useState("30");
  const [msg, setMsg] = useState<React.ReactNode>(IDLE);
  const state = useRef({ secs: 0, when: "30" });
  state.current.when = when;

  useEffect(() => {
    if (!rec) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [rec]);

  const stop = (s: number, auto: boolean, days: string) => {
    setRec(false);
    setMsg(s === 0 ? IDLE : <>Recado de {fmt(s)} guardado{auto ? " (limite de 1 minuto)" : ""}. Ele chega a você em <b>{dateIn(+days)}</b>.</>);
  };
  useEffect(() => { state.current.secs = secs; if (rec && secs >= 60) stop(secs, true, state.current.when); }, [secs, rec]);

  const toggle = () => {
    if (rec) return stop(secs, false, when);
    setSecs(0); setRec(true); setMsg("Gravando… fale com o seu eu do futuro.");
  };
  const pick = (v: string) => { setWhen(v); if (!rec && secs > 0) stop(secs, false, v); };

  return (
    <Reveal className={`recorder${rec ? " on" : ""}`}>
      <div className="rec-q">
        <h3>{QUESTIONS[qi]}</h3>
        <button className="link" type="button" onClick={() => setQi((q) => (q + 1) % QUESTIONS.length)}>Outra pergunta →</button>
      </div>
      <Wave n={54} />
      <div className="rec-ctrl">
        <button className="mic lg" type="button" aria-pressed={rec} aria-label="Gravar recado" onClick={toggle}><span /></button>
        <div className="timer"><b className="mono">{fmt(secs)}</b><small>máx. 1:00</small></div>
      </div>
      <fieldset className="when">
        <legend>Entregar a mim em</legend>
        {WHEN.map(([v, label]) => (
          <label key={v}><input type="radio" name="when" value={v} checked={when === v} onChange={() => pick(v)} /><span>{label}</span></label>
        ))}
      </fieldset>
      <div className="rec-result" role="status">{msg}</div>
    </Reveal>
  );
}

export function Recado() {
  return (
    <Section id="recado" tone="tint-2" ecg={1}>
      <div className="wrap">
        <Reveal className="section-head">
          <Title parts={["Fale com quem você ", { t: "vai ser.", cls: "grad" }]} />
          <p className="lead">No primeiro dia, grave um áudio sobre por que você está começando. O app guarda no seu aparelho e entrega para você daqui a 90 dias. Ouvir a própria voz do passado é o jeito mais honesto de competir com quem você foi.</p>
        </Reveal>
        <div className="recado-grid">
          <Recorder />
          <div className="recado-side">
            <Reveal as="article" className="mini">
              <h3>Nada de página em branco.</h3>
              <p>Todo dia o app traz uma pergunta simples. Você responde falando, como num áudio de WhatsApp.</p>
            </Reveal>
            <Reveal as="article" className="mini">
              <h3>Retrospectiva para compartilhar.</h3>
              <p>O app resume o seu ano: quantos recados, quanto tempo de voz e a pergunta que você mais respondeu. O card vai para os stories só com os números, nunca com o conteúdo dos áudios.</p>
            </Reveal>
            <Reveal as="article" className="mini priv">
              <h3>Seu áudio é só seu.</h3>
              <p>Os áudios ficam só no seu aparelho: não vão para o nosso servidor. Nada é público e você apaga tudo quando quiser. É um diário, não um serviço de terapia.</p>
            </Reveal>
          </div>
        </div>
      </div>
    </Section>
  );
}
