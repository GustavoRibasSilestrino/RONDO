import { useEffect, useRef, useState } from "react";
import { desenharOrbe, esfera } from "../lib/orbe";
import { APP_CRIAR } from "../lib/rotas";
import { Btn } from "./ui";

/* As pastas do treino (desde 2026-11-16, no lugar da cena dos aparelhos em 3D, a pedido do dono: "colorido, sem cara de IA").
   As três pastas são as rotinas que vêm no app (app/src/dados.ts: Peito e Tríceps, Costas e Bíceps, Pernas), com os mesmos
   exercícios, faixas de repetição e passos de carga. A carga de hoje segue a regra do app (progressão dupla, em
   app/src/lib/calc.ts): se todas as séries da última vez bateram o topo da faixa, sobe um passo; senão, mantém.
   O RONDIN fica no canto da pasta e, ao tocar num exercício, explica a carga de hoje. Sem animação de rolagem: só cor e toque. */

type Exercicio = { nome: string; faixa: [number, number]; passo: number; kg: number; reps: number[] };
type Pasta = { id: string; nome: string; minutos: number; cor: string; tinta: string; exercicios: Exercicio[] };

/* a última vez de cada exercício é um exemplo: umas séries batem o topo da faixa (a carga sobe), outras não (mantém) */
const PASTAS: Pasta[] = [
  {
    id: "a", nome: "Peito e Tríceps", minutos: 55, cor: "#ff6a3d", tinta: "#2a0d05",
    exercicios: [
      { nome: "Supino reto", faixa: [6, 8], passo: 2.5, kg: 70, reps: [8, 8, 8] },
      { nome: "Supino inclinado", faixa: [8, 10], passo: 2, kg: 24, reps: [10, 9, 8] },
      { nome: "Crucifixo", faixa: [10, 12], passo: 1, kg: 14, reps: [12, 12, 12] },
      { nome: "Tríceps corda", faixa: [10, 12], passo: 2.5, kg: 25, reps: [12, 11, 10] },
    ],
  },
  {
    id: "b", nome: "Costas e Bíceps", minutos: 50, cor: "#36c2ff", tinta: "#04202e",
    exercicios: [
      { nome: "Puxada na frente", faixa: [8, 10], passo: 2.5, kg: 55, reps: [10, 10, 10] },
      { nome: "Remada baixa", faixa: [8, 10], passo: 2.5, kg: 50, reps: [10, 10, 9] },
      { nome: "Rosca direta", faixa: [10, 12], passo: 1, kg: 14, reps: [12, 12, 12] },
    ],
  },
  {
    id: "c", nome: "Pernas", minutos: 60, cor: "#c9f03a", tinta: "#1b2203",
    exercicios: [
      { nome: "Agachamento", faixa: [6, 8], passo: 2.5, kg: 80, reps: [8, 7, 7] },
      { nome: "Leg press", faixa: [10, 12], passo: 5, kg: 160, reps: [12, 12, 12] },
      { nome: "Cadeira extensora", faixa: [12, 15], passo: 2.5, kg: 40, reps: [15, 15, 15] },
    ],
  },
];

const kg = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
const sobe = (e: Exercicio) => e.reps.every((r) => r >= e.faixa[1]);
const hoje = (e: Exercicio) => (sobe(e) ? e.kg + e.passo : e.kg);

function falaDaPasta(p: Pasta): string {
  const sobem = p.exercicios.filter(sobe).length;
  return `${p.nome}: ${p.exercicios.length} exercícios, uns ${p.minutos} minutos. Em ${sobem} deles a carga sobe hoje. Toque num exercício que eu te explico.`;
}
function falaDoExercicio(e: Exercicio): string {
  const series = e.reps.join(", ");
  return sobe(e)
    ? `Da última vez, ${e.nome} com ${kg(e.kg)}: ${series}. Você bateu ${e.faixa[1]} em todas as séries, então hoje sobe para ${kg(hoje(e))}.`
    : `Da última vez, ${e.nome} com ${kg(e.kg)}: ${series}. Ainda faltou chegar a ${e.faixa[1]} em todas. Hoje mantém ${kg(e.kg)} e busca o topo.`;
}

/* o RONDIN, parado (uma imagem da esfera de pontos, a mesma do app), com o balão de fala */
function Rondin({ fala }: { fala: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current, ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const t = 72, dpr = Math.min(2, devicePixelRatio || 1);
    c.width = c.height = t * dpr;
    ctx.scale(dpr, dpr);
    desenharOrbe(ctx, esfera(190), 2.4, 0.1, t);
  }, []);
  return (
    <div className="pastas-rondin">
      <p className="pastas-fala" aria-live="polite">{fala}</p>
      <div className="pastas-orbe">
        <canvas ref={ref} width={72} height={72} aria-hidden="true" />
        <span>RONDIN</span>
      </div>
    </div>
  );
}

export function PastasTreino() {
  const [aberta, setAberta] = useState(0);
  const [escolhido, setEscolhido] = useState<number | null>(null);
  const abas = useRef<(HTMLButtonElement | null)[]>([]);
  const pasta = PASTAS[aberta];
  const fala = escolhido === null ? falaDaPasta(pasta) : falaDoExercicio(pasta.exercicios[escolhido]);

  const abrir = (i: number) => { setAberta(i); setEscolhido(null); };
  /* setas do teclado trocam de pasta, como numa lista de abas */
  const teclas = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + PASTAS.length) % PASTAS.length;
    abrir(n);
    abas.current[n]?.focus();
  };

  return (
    <section className="pastas" id="aparelhos" aria-labelledby="pastas-titulo">
      <div className="wrap pastas-grade">
        <div className="pastas-texto">
          <h2 id="pastas-titulo" className="pastas-titulo"><span>Carga de ontem.</span><span>Passo de hoje.</span><span>Recorde de amanhã.</span></h2>
          <p className="pastas-lead">Cada pasta é um treino. O app lembra a carga da última vez e sugere a de hoje: bateu o topo da faixa em todas as séries, sobe um passo; não bateu, mantém até bater.</p>
          <Btn href={APP_CRIAR}>Criar conta grátis <span className="arrow">→</span></Btn>
        </div>

        <div className="pastas-mesa" style={{ ["--cor" as string]: pasta.cor, ["--tinta" as string]: pasta.tinta }}>
          <div className="pastas-abas" role="tablist" aria-label="Pastas do treino">
            {PASTAS.map((p, i) => (
              <button
                key={p.id} ref={(el) => { abas.current[i] = el; }} type="button" role="tab" id={`aba-${p.id}`}
                aria-selected={i === aberta} aria-controls="pasta-aberta" tabIndex={i === aberta ? 0 : -1}
                className={`pastas-aba${i === aberta ? " is-aberta" : ""}`} style={{ ["--cor" as string]: p.cor, ["--tinta" as string]: p.tinta }}
                onClick={() => abrir(i)} onKeyDown={(e) => teclas(e, i)}
              >
                {p.nome}
              </button>
            ))}
          </div>

          <div className="pastas-folha" role="tabpanel" id="pasta-aberta" aria-labelledby={`aba-${pasta.id}`}>
            <div className="pastas-cabeca">
              <h3>{pasta.nome}</h3>
              <p>{pasta.minutos} min · {pasta.exercicios.length} exercícios · 3 séries cada</p>
            </div>
            <div className="pastas-colunas" aria-hidden="true"><span>Exercício</span><span>Última vez</span><span>Hoje</span></div>
            <ul className="pastas-lista">
              {pasta.exercicios.map((e, i) => (
                <li key={e.nome}>
                  <button type="button" className={`pastas-linha${escolhido === i ? " is-escolhido" : ""}`} aria-pressed={escolhido === i} onClick={() => setEscolhido(escolhido === i ? null : i)}>
                    <span className="pastas-nome">{e.nome}<small>{e.faixa[0]} a {e.faixa[1]} rep.</small></span>
                    <span className="pastas-ontem">{kg(e.kg)}<small>{e.reps.join(" · ")}</small></span>
                    <span className="pastas-hoje">
                      {kg(hoje(e))}
                      <small className={sobe(e) ? "is-sobe" : ""}>{sobe(e) ? `+${kg(e.passo)}` : "mantém"}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Rondin fala={fala} />
          </div>
        </div>
      </div>
    </section>
  );
}
