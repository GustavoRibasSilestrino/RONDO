/* A tela de compra da loja, em pixel art: mostra o pacote, o preço e as chances de cada raridade; ao comprar, o pacote
   rasga devagar (o suspense), um clarão amarelo forte toma a tela e só então o browniezinho aparece, com a raridade e o
   nome dele. Na abertura e na revelação não há quadro: o pacote e o mascote ficam soltos sobre a loja, levemente desfocada.
   Hoje a compra é uma prévia: nada é cobrado (ver PRODUCT.md).
   A sequência é feita quadro a quadro: o lacre de cima é a mesma imagem do pacote recortada em duas partes, a que já
   rasgou (levanta, girando no ponto do rasgo) e a que ainda está presa. Dá para pular, e quem pede menos movimento
   vê só o resultado, sem tremor nem clarão.

   A conta (pedido do dono em 2026-11-18): comprar pede a conta do RONDO, a mesma do app (lib/conta.ts). Sem conta, o
   "Comprar" mostra o aviso "Você não está na sua conta" e o botão "Entrar ou criar conta", que leva à tela do RONDIN do
   próprio site (/entrar, components/Entrar.tsx). Depois de entrar, a pessoa volta para a loja com este mesmo pacote aberto
   de novo (`lembrarPacote`). Com conta, o servidor sorteia e o mascote já vai para a coleção; o pacote treme até a resposta
   chegar e só então rasga. */
import { useCallback, useEffect, useRef, useState } from "react";
import { PACOTES, RARIDADES, mascoteDe, porcento, preco, type Mascote as Sorteado, type Pacote, type PacoteId } from "../data/loja";
import { ErroApi, abrirPacote, type MascoteDaConta } from "../lib/api";
import { contaRecusada, rotuloDa, useConta } from "../lib/conta";
import { clarao, clique, pararSuspense, recompensa, suspense, voltarMusica } from "../lib/somLoja";
import { ENTRAR_LOJA } from "../lib/rotas";
import { reduceMotion, vars } from "../lib/util";
import { Estrelas, Mascote } from "./LojaPartes";

type Fase = "compra" | "abrindo" | "revelado";
type Aberto = Sorteado & { quantidade: number };

/* o pacote que a pessoa ia comprar quando foi entrar na conta: de volta à loja, ele abre de novo (Loja.tsx) */
const LEMBRAR = "rondo.loja.pacote";
export const lembrarPacote = (id: PacoteId) => { try { sessionStorage.setItem(LEMBRAR, id); } catch { /* sem armazenamento */ } };
export function pacoteLembrado(): PacoteId | null {
  try { const id = sessionStorage.getItem(LEMBRAR); sessionStorage.removeItem(LEMBRAR); return PACOTES.some((p) => p.id === id) ? (id as PacoteId) : null; } catch { return null; }
}

/* tempos da abertura, em ms: o tremor antes (no mínimo; dura até o servidor responder), o rasgo lento e o clarão */
const SUSPENSE = 900, RASGO = 2600, CLARAO = 950;
const DEMORA = 6000;   // sem resposta até aqui: avisa que o servidor está acordando

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

const CERTO = "M7 1h1v1H7zM6 2h1v1H6zM5 3h1v1H5zM4 4h1v1H4zM3 5h1v1H3zM2 4h1v1H2zM1 3h1v1H1z";

/* `podeComprar`: a loja está aberta para esta conta (false = fechada até a venda abrir, só o dono compra; null = ainda não
   se sabe, e o servidor confere na compra) */
export function LojaAbrir({ pacote, aoFechar, aoGuardar, podeComprar = null }: { pacote: Pacote | null; aoFechar: () => void; aoGuardar: (m: MascoteDaConta) => void; podeComprar?: boolean | null }) {
  const [recusada, setRecusada] = useState(false);   // o servidor disse que a loja está fechada
  const fechada = podeComprar === false || recusada;
  const { token, conta } = useConta();
  const dialogo = useRef<HTMLDialogElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const principal = useRef<HTMLElement | null>(null);
  const marcarPrincipal = (el: HTMLElement | null) => { principal.current = el; };
  const [fase, setFase] = useState<Fase>("compra");
  const [mascote, setMascote] = useState<Aberto | null>(null);
  const [atual, setAtual] = useState<Pacote>(PACOTES[0]);   // o último pacote escolhido fica na tela enquanto o diálogo fecha
  const [erro, setErro] = useState("");
  const [demorando, setDemorando] = useState(false);
  const [pedindoConta, setPedindoConta] = useState(false);   // tocou em Comprar sem estar na conta
  const resultado = useRef<Aberto | null>(null);   // a resposta do servidor (a animação espera por ela)
  const pularPedido = useRef(false);

  /* abrir e fechar junto com o pacote escolhido */
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (pacote) {
      setAtual(pacote); setFase("compra"); setMascote(null); setErro(""); setPedindoConta(false);
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
  }, [pacote]);

  useEffect(() => () => pararSuspense(), []);   // saiu da loja no meio da abertura: o suspense para junto

  /* o foco vai para a ação principal de cada etapa */
  useEffect(() => { if (pacote) principal.current?.focus({ preventScroll: true }); }, [fase, pacote, pedindoConta]);

  /* o mascote aparece; a coleção da página acende junto (ele já está guardado na conta) */
  const revelar = useCallback((m: Aberto) => {
    setMascote(m); setFase("revelado");
    recompensa(m.raridade);   // a fanfarra (mais longa quanto mais rara)
    aoGuardar({ linha: m.linha, coluna: m.coluna, raridade: m.raridade, quantidade: m.quantidade });
  }, [aoGuardar]);

  /* ---------- a abertura, quadro a quadro ---------- */
  useEffect(() => {
    const el = palco.current;
    if (fase !== "abrindo" || !el) return;
    const inicio = performance.now();
    let quadro = 0;
    const demora = window.setTimeout(() => { if (!resultado.current) setDemorando(true); }, DEMORA);
    const parar = () => { cancelAnimationFrame(quadro); clearTimeout(demora); };
    if (reduceMotion) {
      /* sem tremor nem clarão: o resultado aparece assim que chega (e nunca antes de um instante) */
      const esperar = () => {
        const m = resultado.current;
        if (m && (pularPedido.current || performance.now() - inicio >= 450)) { revelar(m); return; }
        quadro = requestAnimationFrame(esperar);
      };
      quadro = requestAnimationFrame(esperar);
      return parar;
    }
    const r = atual.rasgo;
    const presa = el.querySelector<HTMLElement>(".abre-presa")!, solta = el.querySelector<HTMLElement>(".abre-solta")!, soltaImg = solta.querySelector<HTMLElement>("img")!;
    let etapa = "", inicioRasgo = 0;
    const rasgar = (p: number) => {
      presa.style.clipPath = lacre(p, 1, r);
      soltaImg.style.clipPath = lacre(0, p, r);
      solta.style.transformOrigin = `${(p * 100).toFixed(2)}% ${(altura(p, r) * 100).toFixed(2)}%`;
      solta.style.transform = `rotate(${(4 + 15 * p).toFixed(2)}deg)`;
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--py", altura(p, r).toFixed(4));
    };
    const passo = (agora: number) => {
      const m = resultado.current;
      if (m && pularPedido.current) { revelar(m); return; }
      /* o rasgo só começa com o mascote em mãos: até lá, o pacote treme */
      if (!inicioRasgo && m && agora - inicio >= SUSPENSE) inicioRasgo = agora;
      let nova = "suspense";
      if (inicioRasgo) {
        const t = agora - inicioRasgo;
        if (t >= RASGO + CLARAO) { revelar(m!); return; }
        if (t >= RASGO) nova = "clarao";
        else {
          nova = "rasgo";
          const u = t / RASGO;
          /* devagar no começo e no fim, com pequenos trancos no meio: é o suspense */
          const suave = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
          rasgar(Math.min(1, Math.max(0, suave + 0.012 * Math.sin(u * 44) * (1 - u))));
        }
      }
      if (nova !== etapa) { etapa = nova; el.dataset.etapa = nova; if (nova === "suspense") rasgar(0); if (nova === "clarao") { rasgar(1); clarao(); } }
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return parar;
  }, [fase, atual, revelar]);

  const comprar = async () => {
    const p = atual;
    setErro("");
    if (!token) { setPedindoConta(true); return; }   // sem conta: o aviso com o botão de entrar ou criar conta
    if (fechada) return;                              // loja fechada: o botão nem aparece, mas por garantia
    setDemorando(false);
    resultado.current = null; pularPedido.current = false;
    setFase("abrindo");
    suspense();   // o rufar e a nota que sobe, até o clarão
    try {
      const m = await abrirPacote(token, p.id);
      resultado.current = { ...mascoteDe(m.linha, m.coluna), quantidade: m.quantidade };
    } catch (e) {
      const err = e instanceof ErroApi ? e : null;
      setFase("compra");
      pararSuspense();
      voltarMusica();
      if (err?.status === 401) { contaRecusada(); setPedindoConta(true); return; }   // a sessão venceu: entra de novo
      if (err?.status === 403 && /em breve/i.test(err.message)) { setRecusada(true); return; }   // a loja está fechada
      setErro(err?.message ?? "Não deu para abrir agora. Tente de novo.");
    }
  };
  const pular = () => { pularPedido.current = true; };
  const abrirOutro = () => { setMascote(null); setFase("compra"); };
  const fechar = () => dialogo.current?.close();

  const raridade = mascote ? RARIDADES[mascote.linha] : null;
  const rotulo = conta ? rotuloDa(conta) : "";

  return (
    <dialog
      ref={dialogo} className="abre" data-fase={fase} data-pacote={atual.id} data-r={mascote && fase === "revelado" ? mascote.raridade : undefined}
      aria-labelledby="abre-titulo" onClose={aoFechar}
      onCancel={(e) => { if (fase === "abrindo") { e.preventDefault(); pular(); } }}
      onClick={(e) => { if (e.target === e.currentTarget && fase !== "abrindo") fechar(); }}
      /* o clique de 8 bits em qualquer botão desta tela (pedido do dono em 2026-11-19; só aqui, não no resto da loja) */
      onClickCapture={(e) => { const alvo = (e.target as Element).closest("button, a"); if (alvo && !alvo.matches(":disabled")) clique(); }}
    >
      <div className="abre-quadro">
        <button type="button" className="abre-fechar" aria-label="Fechar" onClick={fechar}>
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
              {/* com o aviso de conta ou de "em breve" na tela, a nota sai (ele já diz o essencial e a tela cabe no celular) */}
              {(pedindoConta && !token) || (token && fechada) ? null : (
                <p className="abre-nota">
                  Loja em prévia: nada é cobrado. O browniezinho vai direto para a sua conta do RONDO, a mesma do app. Quando a
                  venda abrir, a compra será só para maiores de 18 anos.
                </p>
              )}
              {erro ? <p className="abre-erro" role="alert">{erro}</p> : null}
              {pedindoConta && !token ? (
                /* sem conta: o aviso e o caminho para a tela do RONDIN do site; de volta, este pacote abre de novo */
                <div className="abre-sem-conta" role="status">
                  <p><b>Você não está na sua conta.</b> Para adotar um browniezinho, entre na sua conta do RONDO ou crie uma agora.</p>
                  <div className="abre-acoes">
                    <a className="px-btn" ref={marcarPrincipal} href={ENTRAR_LOJA} onClick={() => lembrarPacote(atual.id)}>Entrar ou criar conta</a>
                    <button type="button" className="px-btn px-btn-escuro" onClick={() => setPedindoConta(false)}>Voltar</button>
                  </div>
                </div>
              ) : token && fechada ? (
                /* com conta, mas a loja ainda não vende: nada de mascote de graça antes do pagamento existir */
                <div className="abre-em-breve" role="status">
                  <p><b>A loja abre em breve.</b> Por enquanto as compras estão fechadas. Quando abrirem, é só voltar aqui e adotar o seu browniezinho.</p>
                  <div className="abre-acoes">
                    <button type="button" className="px-btn" disabled>Em breve</button>
                    <button type="button" className="px-btn px-btn-escuro" ref={marcarPrincipal} onClick={fechar}>Voltar</button>
                  </div>
                </div>
              ) : (
                <>
                  {conta ? <p className="abre-quem">Vai para a conta <b>{rotulo}</b></p> : null}
                  <div className="abre-acoes">
                    <button type="button" className="px-btn" ref={marcarPrincipal} onClick={comprar}>Comprar</button>
                    <button type="button" className="px-btn px-btn-escuro" onClick={fechar}>Voltar</button>
                  </div>
                </>
              )}
            </>
          ) : fase === "abrindo" ? (
            <>
              <h2 id="abre-titulo" className="abre-suspense">Abrindo<i aria-hidden="true">...</i></h2>
              {demorando ? <p className="abre-demora" role="status">O servidor está acordando. Só mais um instante.</p> : null}
              <div className="abre-acoes"><button type="button" className="px-btn px-btn-escuro" ref={marcarPrincipal} onClick={pular}>Pular</button></div>
            </>
          ) : mascote && raridade ? (
            <>
              <p className="abre-raridade" data-r={raridade.id}><Estrelas n={raridade.estrelas} />{raridade.nome}</p>
              <h2 id="abre-titulo">{mascote.nome}</h2>
              <p className="abre-guardado" role="status">
                <svg viewBox="0 0 9 7" shapeRendering="crispEdges" aria-hidden="true"><path d={CERTO} fill="currentColor" /></svg>
                {mascote.quantidade > 1 ? `Na sua conta: agora você tem ${mascote.quantidade}` : rotulo ? `Guardado na conta ${rotulo}` : "Guardado na sua conta"}
              </p>
              <div className="abre-acoes">
                <button type="button" className="px-btn" ref={marcarPrincipal} onClick={abrirOutro}>Abrir outro</button>
                <button type="button" className="px-btn px-btn-escuro" onClick={fechar}>Voltar à loja</button>
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
