/* Peças da loja de pacotinhos usadas em mais de um lugar: o mascote (um recorte da folha), as estrelas da raridade,
   a barraca (a cena em que os pacotes ficam no balcão) e o botão da tenda que vai no cabeçalho do site.
   O visual é o da arte do dono: feira em pixel art (ver styles/loja.css). */
import type { ReactNode } from "react";
import tendaIcone from "../assets/loja/tenda-icone.webp";
import tenda from "../assets/loja/tenda.webp";
import { FOLHA, PACOTES, preco, type Pacote } from "../data/loja";
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

/* A barraca. Os três pacotes ficam em pé no balcão; com `aoEscolher`, cada pacote é um botão que abre a tela de compra
   (na página da loja). Sem ele, é só a vitrine (na divulgação da página inicial, onde a cena inteira é um link).
   As posições são frações da imagem da tenda (1672 x 941): o balcão está a 71% da altura e a placa de cima vai de 31% a 69%. */
const NOME_CURTO: Record<Pacote["id"], string> = { roxo: "Roxo", prata: "Prata", ouro: "Ouro" };

export function Barraca({ aoEscolher, placa }: { aoEscolher?: (p: Pacote) => void; placa: ReactNode }) {
  return (
    <div className="barraca">
      <div className="barraca-cena">
        <img className="barraca-fundo" src={tenda} alt="" width={1672} height={941} fetchPriority={aoEscolher ? "high" : "auto"} loading={aoEscolher ? "eager" : "lazy"} />
        {placa}
        <ul className="barraca-balcao">
          {PACOTES.map((p, i) => {
            const [e, , d, b] = p.caixa;
            const estilo = vars({
              "--x": `${36 + i * 14}%`,
              "--w": `${(11.5 / (d - e)).toFixed(2)}cqw`,
              "--cx": `${(((e + d) / 2) * 100).toFixed(2)}%`,          // o meio do pacote dentro da imagem
              "--folga": `${((1 - b) * 100).toFixed(2)}%`,              // a sobra de brilho abaixo do pacote
              "--base": `${(b * 100).toFixed(2)}%`,
              "--i": i,
            });
            const miolo = (
              <>
                <img src={p.img} alt="" width={p.largura} height={p.altura} />
                <span className="barraca-etiqueta" aria-hidden="true"><b>{NOME_CURTO[p.id]}</b><i>{preco(p.centavos)}</i></span>
              </>
            );
            return (
              <li key={p.id} style={estilo}>
                {aoEscolher
                  ? <button type="button" className="barraca-pacote" onClick={() => aoEscolher(p)} aria-label={`${p.nome}, ${preco(p.centavos)}. Ver as chances e comprar`}>{miolo}</button>
                  : <span className="barraca-pacote">{miolo}</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* O botão da loja no cabeçalho: a mini tenda, com faíscas amarelas subindo o tempo todo (paradas para quem pede menos movimento) */
export function TendaBotao({ comNome = false, className = "" }: { comNome?: boolean; className?: string }) {
  return (
    <a className={`tenda-btn ${className}`.trim()} href={LOJA} aria-label="Loja de pacotinhos">
      <span className="tenda-btn-icone" aria-hidden="true">
        <img src={tendaIcone} alt="" width={384} height={350} decoding="async" />
        {Array.from({ length: 7 }, (_, i) => <i key={i} style={vars({ "--i": i })} />)}
      </span>
      {comNome ? <span className="tenda-btn-nome" aria-hidden="true">Loja</span> : null}
    </a>
  );
}
