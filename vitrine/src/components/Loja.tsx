/* A loja de pacotinhos (/loja), pedido do dono em 2026-11-18. A loja é a própria barraca: os três pacotes ficam no balcão e
   cada um abre a tela de compra (LojaAbrir.tsx). Embaixo, o quadro com as chances de cada pacote, lado a lado, e a coleção
   inteira de browniezinhos por raridade.
   A compra é uma prévia: nada é cobrado. Qualquer pessoa abre um pacote; o mascote vai para a conta do RONDO (a mesma do app)
   quando a pessoa o resgata (LojaResgate.tsx). Com a conta reconhecida, a coleção acende os mascotes que ela já tem. */
import { useCallback, useEffect, useState } from "react";
import { PACOTES, RARIDADES, TOTAL_MASCOTES, chaveDe, nomeDe, porcento, preco, type Pacote } from "../data/loja";
import { minhaColecao, type MascoteDaConta } from "../lib/api";
import { contaRecusada, useConta } from "../lib/conta";
import { usePendentes } from "../lib/resgates";
import { LojaAbrir } from "./LojaAbrir";
import { Barraca, Estrelas, Mascote } from "./LojaPartes";
import { EsperandoResgate, LojaConta, ResgatarCodigo } from "./LojaResgate";
import { Nome } from "./ui";

/* a coleção da conta: chave do mascote -> quantos ela tem (vem do servidor; cada resgate soma aqui na hora) */
function useColecao() {
  const { token } = useConta();
  const [colecao, setColecao] = useState<Map<string, number>>(() => new Map());
  useEffect(() => {
    setColecao(new Map());
    if (!token) return;
    let vale = true;
    minhaColecao(token)
      .then((c) => { if (vale) setColecao(new Map(c.mascotes.map((m) => [chaveDe(m.linha, m.coluna), m.quantidade]))); })
      .catch((e: { status?: number }) => { if (vale && e.status === 401) contaRecusada(); });
    return () => { vale = false; };
  }, [token]);
  const somar = useCallback((m: MascoteDaConta) => setColecao((c) => new Map(c).set(chaveDe(m.linha, m.coluna), m.quantidade)), []);
  return [colecao, somar] as const;
}

export default function Loja() {
  const [escolhido, setEscolhido] = useState<Pacote | null>(null);
  const fechar = useCallback(() => setEscolhido(null), []);
  const { conta } = useConta();
  const [colecao, somar] = useColecao();
  const pendentes = usePendentes();
  useEffect(() => { document.title = "Loja de pacotinhos · RONDO"; }, []);
  const esperando = new Set(pendentes.map((p) => chaveDe(p.linha, p.coluna)));

  return (
    <div className="loja">
      <header className="loja-barra">
        <a className="loja-voltar" href="/" aria-label="Voltar ao site do RONDO">
          <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true"><path d="M4 1h1v1H4zM3 2h1v1H3zM2 3h1v1H2zM1 4h7v1H1zM2 5h1v1H2zM3 6h1v1H3zM4 7h1v1H4z" fill="currentColor" /></svg>
          <Nome />
        </a>
        <LojaConta />
      </header>

      <main id="conteudo">
        <EsperandoResgate aoResgatar={somar} />
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
            <p className="loja-nota">
              Toque num pacote para abrir. O browniezinho que sair você resgata para a sua conta do RONDO, a mesma do app. Loja em
              prévia: nada é cobrado. Quando a venda abrir, a compra será só para maiores de 18 anos.
            </p>
          </div>
        </section>

        <section className="loja-faixa loja-colecao" aria-labelledby="loja-colecao">
          <div className="loja-in">
            <h2 id="loja-colecao">Os {TOTAL_MASCOTES} browniezinhos</h2>
            <p className="loja-lead" aria-live="polite">
              {conta
                ? `Na sua conta: ${colecao.size} de ${TOTAL_MASCOTES}. Os seus aparecem acesos aqui embaixo.`
                : "Do comum ao lendário. Abra um pacotinho, veja qual saiu e resgate para a sua conta do RONDO."}
            </p>
            <ResgatarCodigo aoResgatar={somar} />
            {RARIDADES.map((r, linha) => (
              <div className="loja-raridade" key={r.id} data-r={r.id}>
                <h3><Estrelas n={r.estrelas} /><span>{r.nome}</span><small>{r.quantos} mascotes</small></h3>
                <ul>
                  {Array.from({ length: r.quantos }, (_, coluna) => {
                    const k = chaveDe(linha, coluna), tem = colecao.get(k) ?? 0, espera = !tem && esperando.has(k);
                    const nome = nomeDe(linha, coluna);
                    const estado = tem ? (tem > 1 ? `, você tem ${tem}` : ", na sua conta") : espera ? ", esperando resgate" : "";
                    return (
                      <li key={coluna} data-tem={tem ? true : undefined} data-espera={espera || undefined} title={nome}>
                        <Mascote linha={linha} coluna={coluna} rotulo={`${nome}, ${r.nome.toLowerCase()}${estado}`} />
                        {tem > 1 ? <b className="loja-qtd" aria-hidden="true">x{tem}</b> : null}
                      </li>
                    );
                  })}
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

      <LojaAbrir pacote={escolhido} aoFechar={fechar} aoResgatar={somar} />
    </div>
  );
}
