/* A loja de pacotinhos (/loja), pedido do dono em 2026-11-18. A loja é a própria barraca: os três pacotes ficam no balcão e
   cada um abre a tela de compra (LojaAbrir.tsx). Embaixo, o quadro com as chances de cada pacote, lado a lado, e a coleção
   inteira de browniezinhos por raridade.
   A compra é uma prévia: nada é cobrado e os mascotes tirados só ficam na tela enquanto a página está aberta. */
import { useCallback, useEffect, useState } from "react";
import { PACOTES, RARIDADES, TOTAL_MASCOTES, nomeDe, porcento, preco, type Mascote as Sorteado, type Pacote } from "../data/loja";
import { APP_CRIAR } from "../lib/rotas";
import { LojaAbrir } from "./LojaAbrir";
import { Barraca, Estrelas, Mascote } from "./LojaPartes";
import { Nome } from "./ui";

export default function Loja() {
  const [escolhido, setEscolhido] = useState<Pacote | null>(null);
  const [tirados, setTirados] = useState<Sorteado[]>([]);
  const fechar = useCallback(() => setEscolhido(null), []);
  const guardar = useCallback((m: Sorteado) => setTirados((t) => [m, ...t]), []);
  useEffect(() => { document.title = "Loja de pacotinhos · RONDO"; }, []);
  const tem = (linha: number, coluna: number) => tirados.some((m) => m.linha === linha && m.coluna === coluna);

  return (
    <div className="loja">
      <header className="loja-barra">
        <a className="loja-voltar" href="/" aria-label="Voltar ao site do RONDO">
          <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true"><path d="M4 1h1v1H4zM3 2h1v1H3zM2 3h1v1H2zM1 4h7v1H1zM2 5h1v1H2zM3 6h1v1H3zM4 7h1v1H4z" fill="currentColor" /></svg>
          <Nome />
        </a>
        <a className="px-btn px-btn-p" href={APP_CRIAR}>Criar conta</a>
      </header>

      <main id="conteudo">
        <Barraca aoEscolher={setEscolhido} placa={<h1 className="barraca-placa">Pacotinhos</h1>} />

        <section className="loja-faixa" aria-labelledby="loja-chances">
          <div className="loja-in">
            <h2 id="loja-chances">Cada pacotinho, um browniezinho</h2>
            <p className="loja-lead">São {TOTAL_MASCOTES} para colecionar, em cinco raridades. Quanto melhor o pacote, maior a chance de sair um raro. As chances de cada um estão aqui, sem letra miúda.</p>

            {/* o cardápio da barraca: as chances lado a lado, uma coluna por pacote */}
            <div className="loja-quadro">
              <table>
                <caption className="sr-only">Chance de cada raridade em cada pacotinho</caption>
                <thead>
                  <tr>
                    <td />
                    {PACOTES.map((p) => (
                      <th key={p.id} scope="col" data-pacote={p.id}>
                        {/* o pacote é o botão: tocar nele abre a tela de compra */}
                        <button type="button" className="loja-quadro-pacote" onClick={() => setEscolhido(p)} aria-label={`${p.nome}, ${preco(p.centavos)}. Comprar`}>
                          <img src={p.img} alt="" width={p.largura} height={p.altura} loading="lazy" decoding="async" />
                          <span>{p.nome.replace("Pacotinho ", "")}</span>
                          <b>{preco(p.centavos)}</b>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RARIDADES.map((r) => (
                    <tr key={r.id} data-r={r.id}>
                      <th scope="row"><Estrelas n={r.estrelas} /><span>{r.nome}</span></th>
                      {PACOTES.map((p) => <td key={p.id}>{porcento(p.chances[r.id])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="loja-nota">Toque num pacote para comprar. Loja em prévia: nada é cobrado e os mascotes não ficam guardados. Quando a venda abrir, a compra será só para maiores de 18 anos.</p>
          </div>
        </section>

        <section className="loja-faixa loja-colecao" aria-labelledby="loja-colecao">
          <div className="loja-in">
            <h2 id="loja-colecao">Os {TOTAL_MASCOTES} browniezinhos</h2>
            <p className="loja-lead" aria-live="polite">
              {tirados.length
                ? `Nesta visita você tirou ${new Set(tirados.map((m) => m.numero)).size} de ${TOTAL_MASCOTES}. Eles aparecem acesos aqui embaixo.`
                : "Do comum ao lendário. Abra um pacotinho na barraca e veja qual é o seu."}
            </p>
            {RARIDADES.map((r, linha) => (
              <div className="loja-raridade" key={r.id} data-r={r.id}>
                <h3><Estrelas n={r.estrelas} /><span>{r.nome}</span><small>{r.quantos} mascotes</small></h3>
                <ul>
                  {Array.from({ length: r.quantos }, (_, coluna) => (
                    <li key={coluna} data-tem={tem(linha, coluna) || undefined} title={nomeDe(linha, coluna)}>
                      <Mascote linha={linha} coluna={coluna} rotulo={`${nomeDe(linha, coluna)}, ${r.nome.toLowerCase()}${tem(linha, coluna) ? ", tirado nesta visita" : ""}`} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="loja-rodape">
        <p>Os preços são uma estimativa e podem mudar até a abertura da loja.</p>
        <p><a href="/">Voltar ao site</a><a href="/termos">Termos de Uso</a><a href="/privacidade">Privacidade</a></p>
      </footer>

      <LojaAbrir pacote={escolhido} aoFechar={fechar} aoTirar={guardar} />
    </div>
  );
}
