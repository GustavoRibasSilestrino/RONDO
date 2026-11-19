/* O LÁPIS da loja de pacotinhos (LojaLapis), desde 2026-11-19 (pedido do dono), no mesmo pixel art da feira: um item à venda,
   como os pacotes. Dá um nome próprio a um browniezinho da coleção. Compra-se aqui, fica guardado na conta e é usado no app
   (Perfil > Coleção > o lápis): a pessoa escolhe o mascote, digita o nome e confirma. Cada lápis vale um nome. Segue a regra
   dos pacotes: pede a conta e, com a loja fechada, mostra "Em breve".
   (A troca de repetidos chegou a ter uma seção aqui; a pedido do dono ela ficou só no app, onde dá para achar a pessoa pela @
   ou entre quem a conta segue: app/src/telas/perfil/MascotePopups.tsx.) */
import { useState } from "react";
import { LAPIS, preco } from "../data/loja";
import { ErroApi, comprarLapis } from "../lib/api";
import { contaRecusada, rotuloDa, useConta } from "../lib/conta";
import { ENTRAR_LOJA } from "../lib/rotas";

/* ---------- pixel art desenhada a partir de um mapa de letras (cada letra, uma cor; ponto = vazio) ---------- */
function Pixels({ mapa, cores, className, rotulo }: { mapa: string[]; cores: Record<string, string>; className?: string; rotulo?: string }) {
  const caminhos: Record<string, string> = {};
  mapa.forEach((linha, y) => [...linha].forEach((c, x) => { if (cores[c]) caminhos[c] = `${caminhos[c] ?? ""}M${x} ${y}h1v1h-1z`; }));
  return (
    <svg className={className} viewBox={`0 0 ${mapa[0].length} ${mapa.length}`} shapeRendering="crispEdges" role={rotulo ? "img" : undefined} aria-label={rotulo} aria-hidden={rotulo ? undefined : true}>
      {Object.entries(caminhos).map(([c, d]) => <path key={c} d={d} fill={cores[c]} />)}
    </svg>
  );
}

/* o lápis: ponta de grafite embaixo à esquerda, corpo amarelo, virola de metal e borracha rosa em cima à direita.
   (o mesmo desenho está no app: app/src/componentes/LapisPixel.tsx) */
const LAPIS_MAPA = [
  "............KK..",
  "...........KPPK.",
  "..........KPPPK.",
  ".........KMPPK..",
  "........KYMMK...",
  ".......KYYyK....",
  "......KYYyK.....",
  ".....KYYyK......",
  "....KYYyK.......",
  "...KYYyK........",
  "..KWYyK.........",
  "..KWWK..........",
  ".KGWK...........",
  ".KGK............",
  ".KK.............",
  "................",
];
const LAPIS_CORES = { K: "#1b0d06", Y: "#ffc83d", y: "#d2921a", P: "#ff8fa3", M: "#c9c4da", W: "#f6dfb8", G: "#4d3489" };
export const LapisPixel = ({ className, rotulo }: { className?: string; rotulo?: string }) => <Pixels mapa={LAPIS_MAPA} cores={LAPIS_CORES} className={className} rotulo={rotulo} />;

const mensagem = (e: unknown, padrao: string) => (e instanceof ErroApi ? e.message : padrao);

/* ============================== o lápis ============================== */
export function LojaLapis({ lapis, aoComprar, podeComprar }: { lapis: number; aoComprar: (n: number) => void; podeComprar: boolean | null }) {
  const { token, conta } = useConta();
  const [comprando, setComprando] = useState(false);
  const [erro, setErro] = useState("");
  const [comprou, setComprou] = useState(false);
  const [recusada, setRecusada] = useState(false);   // o servidor disse que a loja está fechada
  const fechada = podeComprar === false || recusada;

  const comprar = async () => {
    if (!token || comprando) return;
    setErro(""); setComprando(true);
    try {
      const r = await comprarLapis(token);
      aoComprar(r.lapis); setComprou(true);
    } catch (e) {
      const status = e instanceof ErroApi ? e.status : undefined;
      if (status === 401) contaRecusada();
      else if (status === 403) setRecusada(true);
      else setErro(mensagem(e, "Não deu para comprar agora. Tente de novo."));
    } finally {
      setComprando(false);
    }
  };

  return (
    <section className="loja-faixa" aria-labelledby="loja-lapis">
      <div className="loja-in">
        <div className="lapis-cartao">
          <LapisPixel className="lapis-desenho" />
          <div className="lapis-texto">
            <h2 id="loja-lapis">{LAPIS.nome}</h2>
            <p className="loja-lead">
              Dê um nome só seu a um browniezinho. Com o lápis guardado na conta, abra o app, vá em Perfil, Coleção, toque no
              lápis, escolha o mascote e escreva o nome. Cada lápis vale um nome.
            </p>
            <p className="abre-preco"><b>{preco(LAPIS.centavos)}</b><span>na prévia: grátis</span></p>
            {erro ? <p className="abre-erro" role="alert">{erro}</p> : null}
            {!token ? (
              <div className="abre-sem-conta" role="status">
                <p><b>Você não está na sua conta.</b> O lápis fica guardado na sua conta do RONDO, a mesma do app.</p>
                <div className="abre-acoes"><a className="px-btn" href={ENTRAR_LOJA}>Entrar ou criar conta</a></div>
              </div>
            ) : fechada ? (
              <div className="abre-em-breve" role="status">
                <p><b>A loja abre em breve.</b> Por enquanto as compras estão fechadas.</p>
                <div className="abre-acoes"><button type="button" className="px-btn" disabled>Em breve</button></div>
              </div>
            ) : (
              <>
                {conta ? <p className="abre-quem">Vai para a conta <b>{rotuloDa(conta)}</b></p> : null}
                <div className="abre-acoes">
                  <button type="button" className="px-btn" onClick={comprar} aria-disabled={comprando || undefined}>{comprando ? "Comprando..." : comprou ? "Comprar outro" : "Comprar"}</button>
                </div>
              </>
            )}
            {token ? (
              <p className="lapis-tenho" role="status" aria-live="polite">
                {comprou ? "Guardado. " : ""}Na sua conta: <b>{lapis}</b> lápis{lapis ? ". Use no app, em Perfil, Coleção." : "."}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
