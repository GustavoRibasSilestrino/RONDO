/* A tela de compra da loja, em pixel art: mostra o pacote, o preço e as chances de cada raridade; ao comprar, o pacote
   rasga devagar (o suspense), um clarão amarelo forte toma a tela e só então o browniezinho aparece, com a raridade e o
   nome dele. Na abertura e na revelação não há quadro: o pacote e o mascote ficam soltos sobre a loja, levemente desfocada.
   Hoje a compra é uma prévia: nada é cobrado e o mascote não fica guardado (ver PRODUCT.md).
   A sequência é feita quadro a quadro: o lacre de cima é a mesma imagem do pacote recortada em duas partes, a que já
   rasgou (levanta, girando no ponto do rasgo) e a que ainda está presa. Dá para pular, e quem pede menos movimento
   vê só o resultado, sem tremor nem clarão. */
import { useCallback, useEffect, useRef, useState } from "react";
import { PACOTES, RARIDADES, porcento, preco, sortear, type Mascote as Sorteado, type Pacote } from "../data/loja";
import { reduceMotion, vars } from "../lib/util";
import { Estrelas, Mascote } from "./LojaPartes";

type Fase = "compra" | "abrindo" | "revelado";

/* tempos da abertura, em ms: o tremor antes, o rasgo lento, o lacre voando e o clarão */
const SUSPENSE = 900, RASGO = 2600, CLARAO = 950;

/* ---------- a linha do rasgo: um zigue-zague de uma borda à outra, logo abaixo do lacre ---------- */
const DENTES = 13, AMP = 0.011;
const altura = (x: number, r: [number, number]) => {
  const k = x * DENTES, i = Math.floor(k), f = k - i;
  const a = i % 2 ? AMP : -AMP, b = (i + 1) % 2 ? AMP : -AMP;
  return r[0] + (r[1] - r[0]) * x + a + (b - a) * f;
};
/* os pontos da linha entre x0 e x1 (os dois extremos e cada dente no meio) */
function linha(x0: number, x1: number, r: [number, number]): [number, number][] {
  const pts: [number, number][] = [[x0, altura(x0, r)]];
  for (let i = Math.floor(x0 * DENTES) + 1; i / DENTES < x1; i++) pts.push([i / DENTES, altura(i / DENTES, r)]);
  pts.push([x1, altura(x1, r)]);
  return pts;
}
const poligono = (pts: [number, number][]) => `polygon(${pts.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(",")})`;
const lacre = (x0: number, x1: number, r: [number, number]) => poligono([[x0, 0], [x1, 0], ...linha(x0, x1, r).reverse()]);
const corpo = (r: [number, number]) => poligono([...linha(0, 1, r), [1, 1], [0, 1]]);

function Chances({ pacote }: { pacote: Pacote }) {
  return (
    <ul className="abre-chances" aria-label={`Chances do ${pacote.nome}`}>
      {RARIDADES.map((r) => (
        <li key={r.id} data-r={r.id}>
          <span className="abre-chances-nome"><Estrelas n={r.estrelas} />{r.nome}</span>
          <span className="abre-chances-barra" aria-hidden="true"><i style={vars({ "--v": pacote.chances[r.id] / 1000 })} /></span>
          <span className="abre-chances-num">{porcento(pacote.chances[r.id])}</span>
        </li>
      ))}
    </ul>
  );
}

export function LojaAbrir({ pacote, aoFechar, aoTirar }: { pacote: Pacote | null; aoFechar: () => void; aoTirar: (m: Sorteado) => void }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const principal = useRef<HTMLButtonElement>(null);
  const [fase, setFase] = useState<Fase>("compra");
  const [mascote, setMascote] = useState<Sorteado | null>(null);
  const [atual, setAtual] = useState<Pacote>(PACOTES[0]);   // o último pacote escolhido fica na tela enquanto o diálogo fecha

  /* abrir e fechar junto com o pacote escolhido */
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (pacote) { setAtual(pacote); setFase("compra"); setMascote(null); if (!d.open) d.showModal(); }
    else if (d.open) d.close();
  }, [pacote]);

  /* o foco vai para a ação principal de cada etapa */
  useEffect(() => { if (pacote) principal.current?.focus({ preventScroll: true }); }, [fase, pacote]);

  const revelar = useCallback((m: Sorteado) => { setFase("revelado"); aoTirar(m); }, [aoTirar]);

  /* ---------- a abertura, quadro a quadro ---------- */
  useEffect(() => {
    const el = palco.current;
    if (fase !== "abrindo" || !mascote || !el) return;
    if (reduceMotion) { const t = window.setTimeout(() => revelar(mascote), 450); return () => clearTimeout(t); }
    const r = atual.rasgo;
    const presa = el.querySelector<HTMLElement>(".abre-presa")!, solta = el.querySelector<HTMLElement>(".abre-solta")!, soltaImg = solta.querySelector<HTMLElement>("img")!;
    let quadro = 0, etapa = "";
    const inicio = performance.now();
    const rasgar = (p: number) => {
      presa.style.clipPath = lacre(p, 1, r);
      soltaImg.style.clipPath = lacre(0, p, r);
      solta.style.transformOrigin = `${(p * 100).toFixed(2)}% ${(altura(p, r) * 100).toFixed(2)}%`;
      solta.style.transform = `rotate(${(4 + 15 * p).toFixed(2)}deg)`;
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--py", altura(p, r).toFixed(4));
    };
    const passo = (agora: number) => {
      const t = agora - inicio;
      let nova = "suspense";
      if (t >= SUSPENSE + RASGO + CLARAO) { revelar(mascote); return; }
      if (t >= SUSPENSE + RASGO) nova = "clarao";
      else if (t >= SUSPENSE) {
        nova = "rasgo";
        const u = (t - SUSPENSE) / RASGO;
        /* devagar no começo e no fim, com pequenos trancos no meio: é o suspense */
        const suave = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
        rasgar(Math.min(1, Math.max(0, suave + 0.012 * Math.sin(u * 44) * (1 - u))));
      }
      if (nova !== etapa) { etapa = nova; el.dataset.etapa = nova; if (nova === "suspense") rasgar(0); if (nova === "clarao") rasgar(1); }
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [fase, mascote, atual, revelar]);

  const comprar = () => { setMascote(sortear(atual)); setFase("abrindo"); };
  const pular = () => { if (mascote) revelar(mascote); };
  const raridade = mascote ? RARIDADES[mascote.linha] : null;

  return (
    <dialog
      ref={dialogo} className="abre" data-fase={fase} data-pacote={atual.id} data-r={mascote && fase === "revelado" ? mascote.raridade : undefined}
      aria-labelledby="abre-titulo" onClose={aoFechar}
      onCancel={(e) => { if (fase === "abrindo") { e.preventDefault(); pular(); } }}
      onClick={(e) => { if (e.target === e.currentTarget && fase !== "abrindo") dialogo.current?.close(); }}
    >
      <div className="abre-quadro">
        <button type="button" className="abre-fechar" aria-label="Fechar" onClick={() => dialogo.current?.close()}>
          <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true"><path d="M1 0h1v1h1v1h1v1h1V2h1V1h1V0h1v2H7v1H6v1H5v1h1v1h1v1h1v2H7V8H6V7H5V6H4v1H3v1H2v1H1V7h1V6h1V5h1V4H3V3H2V2H1z" fill="currentColor" /></svg>
        </button>

        {/* o palco: o pacote (parado na compra, rasgando na abertura) e, por cima, o clarão e o mascote */}
        <div className="abre-palco" ref={palco} data-etapa={fase === "abrindo" ? "suspense" : undefined}>
          <i className="abre-raios" aria-hidden="true" />
          <div className="abre-pacote" style={vars({ "--prop": `${atual.largura} / ${atual.altura}`, "--ang": `${(Math.atan2((atual.rasgo[1] - atual.rasgo[0]) * atual.altura, atual.largura) * 180 / Math.PI).toFixed(2)}deg`, "--y0": atual.rasgo[0] })}>
            <img className="abre-corpo" src={atual.img} alt="" width={atual.largura} height={atual.altura} style={fase === "compra" ? undefined : { clipPath: corpo(atual.rasgo) }} />
            {fase !== "compra" ? (
              <>
                <i className="abre-luz" aria-hidden="true" />
                <img className="abre-presa" src={atual.img} alt="" width={atual.largura} height={atual.altura} style={{ clipPath: lacre(0, 1, atual.rasgo) }} />
                <span className="abre-solta"><img src={atual.img} alt="" width={atual.largura} height={atual.altura} style={{ clipPath: lacre(0, 0, atual.rasgo) }} /></span>
                <i className="abre-faisca" aria-hidden="true"><b /><b /><b /><b /><b /></i>
              </>
            ) : null}
          </div>
          <i className="abre-clarao" aria-hidden="true" />
          <i className="abre-banho" aria-hidden="true" />
          {mascote && fase === "revelado" ? <Mascote linha={mascote.linha} coluna={mascote.coluna} className="abre-mascote" /> : null}
        </div>

        <div className="abre-texto">
          {fase === "compra" ? (
            <>
              <h2 id="abre-titulo">{atual.nome}</h2>
              <p className="abre-frase">{atual.frase}</p>
              <p className="abre-preco"><b>{preco(atual.centavos)}</b><span>na prévia: grátis</span></p>
              <Chances pacote={atual} />
              <p className="abre-nota">Loja em prévia. Nada é cobrado e o mascote não fica guardado. Quando a venda abrir, a compra será só para maiores de 18 anos.</p>
              <div className="abre-acoes">
                <button type="button" className="px-btn" ref={principal} onClick={comprar}>Comprar</button>
                <button type="button" className="px-btn px-btn-escuro" onClick={() => dialogo.current?.close()}>Voltar</button>
              </div>
            </>
          ) : fase === "abrindo" ? (
            <>
              <h2 id="abre-titulo" className="abre-suspense">Abrindo<i aria-hidden="true">...</i></h2>
              <div className="abre-acoes"><button type="button" className="px-btn px-btn-escuro" ref={principal} onClick={pular}>Pular</button></div>
            </>
          ) : mascote && raridade ? (
            <>
              <p className="abre-raridade" data-r={raridade.id}><Estrelas n={raridade.estrelas} />{raridade.nome}</p>
              <h2 id="abre-titulo">{mascote.nome}</h2>
              <div className="abre-acoes">
                <button type="button" className="px-btn" ref={principal} onClick={() => { setMascote(null); setFase("compra"); }}>Abrir outro</button>
                <button type="button" className="px-btn px-btn-escuro" onClick={() => dialogo.current?.close()}>Voltar à loja</button>
              </div>
            </>
          ) : null}
        </div>
        {/* quem usa leitor de tela ouve o resultado sem depender da animação */}
        <p className="sr-only" aria-live="polite">{fase === "revelado" && mascote && raridade ? `Você tirou o ${mascote.nome}, raridade ${raridade.nome}.` : ""}</p>
      </div>
    </dialog>
  );
}
