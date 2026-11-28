/* Peças da loja de browniezinhos usadas em mais de um lugar: o mascote (um recorte da folha), as estrelas da raridade e o
   botão da tenda que vai no cabeçalho do site. O visual é o da arte do dono, em pixel art (ver styles/loja.css).
   (A barraca com os três pacotes no balcão saiu em 2026-11-27, quando a loja passou a vender cada mascote separado.) */
import tendaIcone from "../assets/loja/tenda-icone.webp";
import { FOLHA } from "../data/loja";
import { vars } from "../lib/util";

export const LOJA = "/loja";

/* um mascote: a folha (assets/loja/mascotes.webp) entra como fundo e a célula certa é escolhida pela posição */
export function Mascote({ linha, coluna, rotulo, className = "" }: { linha: number; coluna: number; rotulo?: string; className?: string }) {
  return (
    <span
      className={`masc ${className}`.trim()} role={rotulo ? "img" : undefined} aria-label={rotulo} aria-hidden={rotulo ? undefined : true}
      style={vars({ "--mx": `${(coluna / (FOLHA.colunas - 1)) * 100}%`, "--my": `${(linha / (FOLHA.linhas - 1)) * 100}%` })}
    />
  );
}

/* estrela de pixel (9 x 9): a raridade nunca é dita só pela cor, tem nome e estrelas */
const ESTRELA = "M4 0h1v1H4zM3 1h3v2H3zM0 3h9v1H0zM1 4h7v1H1zM2 5h5v1H2zM1 6h7v1H1zM1 7h3v1H1zM5 7h3v1H5zM0 8h2v1H0zM7 8h2v1H7z";
export function Estrelas({ n }: { n: number }) {
  return (
    <span className="px-estrelas" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <svg key={i} viewBox="0 0 9 9" shapeRendering="crispEdges"><path d={ESTRELA} fill="currentColor" /></svg>)}
    </span>
  );
}

/* O botão da loja no cabeçalho: a mini tenda, com faíscas amarelas subindo o tempo todo (paradas para quem pede menos movimento) */
export function TendaBotao({ comNome = false, className = "" }: { comNome?: boolean; className?: string }) {
  return (
    <a className={`tenda-btn ${className}`.trim()} href={LOJA} aria-label="Loja de browniezinhos">
      <span className="tenda-btn-icone" aria-hidden="true">
        <img src={tendaIcone} alt="" width={384} height={350} decoding="async" />
        {Array.from({ length: 7 }, (_, i) => <i key={i} style={vars({ "--i": i })} />)}
      </span>
      {comNome ? <span className="tenda-btn-nome" aria-hidden="true">Loja</span> : null}
    </a>
  );
}
