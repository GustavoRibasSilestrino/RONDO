/* A divulgação da lojinha na página inicial (desde 2026-11-18, no lugar das pastas do treino, a pedido do dono).
   De um lado o convite; do outro, desde 2026-11-27 (quando a loja passou a vender cada mascote separado), uma janela para a
   feirinha da loja (o cenário deitado) com cinco browniezinhos no caminho, um de cada raridade, cada um com o preço (a cena inteira leva para
   /loja). Antes era a barraca com os três pacotes no balcão. Fora da tela, os mascotes param de pular. */
import { useEffect, useRef } from "react";
import { MAIS_BARATO, RARIDADES, TOTAL_MASCOTES, nomeDe, preco } from "../data/loja";
import { reduceMotion, vars } from "../lib/util";
import { LOJA, Mascote } from "./LojaPartes";

/* um de cada raridade: o Browsapo, o Browdino, o Browfogo, o Browninja e o Browdragão */
const NO_GRAMADO: [number, number][] = [[0, 11], [1, 13], [2, 4], [3, 11], [4, 4]];

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
          <p>{TOTAL_MASCOTES} browniezinhos para colecionar, do comum ao lendário. Você escolhe o seu, vê o preço e leva para a sua conta, sem sorteio.</p>
          <a className="px-btn" href={LOJA}>Entrar na loja</a>
          <p className="lojinha-nota">A partir de {preco(MAIS_BARATO)}. Loja em prévia: por enquanto nada é cobrado.</p>
        </div>
        <a className="lojinha-cena" href={LOJA} aria-label="Abrir a loja de browniezinhos" tabIndex={-1}>
          <ul className="lojinha-gramado" aria-hidden="true">
            {NO_GRAMADO.map(([linha, coluna], i) => (
              <li key={i} data-r={RARIDADES[linha].id} style={vars({ "--i": i })}>
                <Mascote linha={linha} coluna={coluna} />
                <span className="lojinha-etiqueta"><b>{nomeDe(linha, coluna)}</b><i>{preco(RARIDADES[linha].centavos)}</i></span>
              </li>
            ))}
          </ul>
        </a>
      </div>
    </section>
  );
}
