/* A divulgação da lojinha na página inicial (desde 2026-11-18, no lugar das pastas do treino, a pedido do dono).
   De um lado o convite, do outro a própria barraca com os três pacotes no balcão (a cena inteira leva para /loja), e
   embaixo um desfile de browniezinhos. O desfile para quando sai da tela e para quem pede menos movimento. */
import { useEffect, useRef } from "react";
import { PACOTES, TOTAL_MASCOTES, preco } from "../data/loja";
import { reduceMotion } from "../lib/util";
import { Barraca, LOJA, Mascote } from "./LojaPartes";

/* quem desfila: um pouco de cada raridade (linha e coluna na folha de mascotes) */
const DESFILE: [number, number][] = [[0, 0], [1, 3], [2, 4], [0, 2], [3, 2], [1, 4], [4, 4], [0, 8], [2, 9], [1, 8], [3, 9], [4, 0], [0, 12], [2, 13], [1, 13], [4, 8]];
const MAIS_BARATO = Math.min(...PACOTES.map((p) => p.centavos));

export function LojaPromo() {
  const raiz = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = raiz.current;
    if (!el || reduceMotion || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle("is-off", !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="lojinha" id="loja" ref={raiz} aria-labelledby="lojinha-titulo">
      <div className="lojinha-in">
        <div className="lojinha-texto">
          <h2 id="lojinha-titulo">A lojinha do RONDO abriu as portas.</h2>
          <p>Três pacotinhos no balcão e {TOTAL_MASCOTES} browniezinhos para colecionar, do comum ao lendário. Você escolhe o pacote, ele rasga e o seu aparece.</p>
          <a className="px-btn" href={LOJA}>Entrar na loja</a>
          <p className="lojinha-nota">A partir de {preco(MAIS_BARATO)}. Loja em prévia: por enquanto nada é cobrado.</p>
        </div>
        <a className="lojinha-cena" href={LOJA} aria-label="Abrir a loja de pacotinhos" tabIndex={-1}>
          <Barraca placa={<p className="barraca-placa" aria-hidden="true">Pacotinhos</p>} />
        </a>
      </div>
      <div className="lojinha-desfile" aria-hidden="true">
        <div>
          {[...DESFILE, ...DESFILE].map(([l, c], i) => <Mascote key={i} linha={l} coluna={c} />)}
        </div>
      </div>
    </section>
  );
}
