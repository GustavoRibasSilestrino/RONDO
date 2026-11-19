/* A loja de pacotinhos (/loja), pedido do dono em 2026-11-18. A loja é a própria barraca: os três pacotes ficam no balcão e
   cada um abre a tela de compra (LojaAbrir.tsx). Embaixo, o quadro com as chances de cada pacote, lado a lado, e a coleção
   inteira de browniezinhos por raridade.
   A compra é uma prévia: nada é cobrado. Comprar pede a conta do RONDO (a mesma do app); quem não está na conta entra pela
   tela do RONDIN do site (/entrar) e volta para cá com o pacote aberto de novo. Com a conta, a coleção acende os mascotes
   que ela já tem, com a quantidade. */
import { useCallback, useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";
import { alternarSom, assinarSom, clique, pararMusica, somLigado, tocarMusica } from "../lib/somLoja";
import { COLUNAS, PACOTES, RARIDADES, TOTAL_MASCOTES, chaveDe, nomeDe, porcento, preco, type Pacote } from "../data/loja";
import { minhaColecao, type MascoteDaConta } from "../lib/api";
import { contaRecusada, useConta } from "../lib/conta";
import { ENTRAR_LOJA } from "../lib/rotas";
import { ContaMenu } from "./Conta";
import { LojaAbrir, pacoteLembrado } from "./LojaAbrir";
import { Barraca, Estrelas, Mascote } from "./LojaPartes";
import { Nome } from "./ui";

/* a coleção da conta: chave do mascote -> quantos ela tem (vem do servidor; cada compra soma aqui na hora). Vem junto se a
   loja está aberta para esta conta: fechada (até a venda abrir), a compra mostra "Em breve" (null = ainda não se sabe) */
function useColecao() {
  const { token } = useConta();
  const [colecao, setColecao] = useState<Map<string, number>>(() => new Map());
  const [podeComprar, setPodeComprar] = useState<boolean | null>(null);
  useEffect(() => {
    setColecao(new Map());
    setPodeComprar(null);
    if (!token) return;
    let vale = true;
    minhaColecao(token)
      .then((c) => {
        if (!vale) return;
        setColecao(new Map(c.mascotes.map((m) => [chaveDe(m.linha, m.coluna), m.quantidade])));
        setPodeComprar(c.pode_comprar ?? true);
      })
      .catch((e: { status?: number }) => { if (vale && e.status === 401) contaRecusada(); });
    return () => { vale = false; };
  }, [token]);
  const somar = useCallback((m: MascoteDaConta) => setColecao((c) => new Map(c).set(chaveDe(m.linha, m.coluna), m.quantidade)), []);
  return [colecao, somar, podeComprar] as const;
}

/* no topo da loja: a conta (com o menu de abrir o app e sair) ou um "Entrar" discreto, para quem quer entrar antes de
   escolher (e ver a própria coleção). Criar conta fica dentro da tela do RONDIN, que tem as duas abas; quem toca em Comprar
   sem conta já recebe o aviso com o botão (pedido do dono em 2026-11-18: dois botões grandes no topo eram redundância). */
function ContaNoTopo() {
  const { conta, token } = useConta();
  if (conta) return <ContaMenu variante="loja" />;
  if (token) return null;   // conferindo a conta: um instante, sem piscar o botão
  return (
    <a className="loja-entrar" href={ENTRAR_LOJA}>
      <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true"><path d="M3 0h3v1h1v3H6v1H3V4H2V1h1zM1 6h7v1h1v2H0V7h1z" fill="currentColor" /></svg>
      Entrar
    </a>
  );
}

/* o som da loja (a música e os efeitos da abertura, lib/somLoja.ts): música que toca sozinha precisa de um jeito de desligar
   (WCAG 1.4.2), então fica uma nota musical de pixel no topo; a escolha fica guardada neste navegador */
const NOTA = "M5 0h3v1h1v2H8V2H6v5H5v1H4v1H1V8H0V6h1V5h4z";
const RISCO = "M0 0h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1H8V8H7V7H6V6H5V5H4V4H3V3H2V2H1V1H0z";
function BotaoSom() {
  const ligado = useSyncExternalStore(assinarSom, somLigado);
  return (
    <button type="button" className="loja-som" onClick={alternarSom} aria-pressed={ligado} aria-label="Música e sons da loja" title={ligado ? "Desligar o som" : "Ligar o som"}>
      <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
        <path d={NOTA} fill="currentColor" />
        {ligado ? null : <path d={RISCO} fill="#e0524f" />}
      </svg>
    </button>
  );
}

/* o clique de 8 bits em qualquer botão ou link da loja, inclusive na tela de compra (pedido do dono em 2026-11-19: primeiro
   só na tela de compra, depois em todo botão clicável dentro da loja). Um só ouvinte, na loja inteira; o botão apagado
   ("Em breve") não faz som. No botão do som, ligar faz o clique e desligar já sai mudo. */
function clicar(e: MouseEvent) {
  const alvo = (e.target as Element).closest("button, a, [role='button']");
  if (alvo && !alvo.matches(":disabled, [aria-disabled='true']")) clique();
}

export default function Loja() {
  /* a música de jogo toca enquanto a pessoa está na loja (pedido do dono em 2026-11-19) */
  useEffect(() => { tocarMusica(); return () => pararMusica(); }, []);
  const [escolhido, setEscolhido] = useState<Pacote | null>(null);
  const fechar = useCallback(() => setEscolhido(null), []);
  const { conta } = useConta();
  const [colecao, somar, podeComprar] = useColecao();
  useEffect(() => { document.title = "Loja de pacotinhos · RONDO"; }, []);

  /* de volta da tela de entrar: o pacote que a pessoa ia comprar abre de novo, já com a conta (se ela voltou sem entrar,
     o pedido é esquecido) */
  useEffect(() => {
    const id = pacoteLembrado();
    if (id && conta) setEscolhido(PACOTES.find((p) => p.id === id) ?? null);
    // só ao chegar na loja
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="loja" onClickCapture={clicar}>
      <header className="loja-barra">
        <a className="loja-voltar" href="/" aria-label="Voltar ao site do RONDO">
          <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true"><path d="M4 1h1v1H4zM3 2h1v1H3zM2 3h1v1H2zM1 4h7v1H1zM2 5h1v1H2zM3 6h1v1H3zM4 7h1v1H4z" fill="currentColor" /></svg>
          <Nome />
        </a>
        <div className="loja-barra-dir">
          <BotaoSom />
          <ContaNoTopo />
        </div>
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
            <p className="loja-nota">
              Toque num pacote para comprar. Para comprar, é preciso estar na sua conta do RONDO, a mesma do app: o
              browniezinho vai direto para ela. Loja em prévia: nada é cobrado. Quando a venda abrir, a compra será só para
              maiores de 18 anos.
            </p>
          </div>
        </section>

        <section className="loja-faixa loja-colecao" aria-labelledby="loja-colecao">
          <div className="loja-in">
            <h2 id="loja-colecao">Os {TOTAL_MASCOTES} browniezinhos</h2>
            <p className="loja-lead" aria-live="polite">
              {conta
                ? `Na sua conta: ${colecao.size} de ${TOTAL_MASCOTES}. Os seus aparecem acesos aqui embaixo.`
                : "Do comum ao lendário. Entre na sua conta para comprar e guardar os seus."}
            </p>
            {RARIDADES.map((r, linha) => (
              <div className="loja-raridade" key={r.id} data-r={r.id}>
                <h3><Estrelas n={r.estrelas} /><span>{r.nome}</span><small>{r.quantos} mascotes</small></h3>
                <ul>
                  {COLUNAS[linha].map((coluna) => {
                    const tem = colecao.get(chaveDe(linha, coluna)) ?? 0;
                    const nome = nomeDe(linha, coluna);
                    const estado = tem > 1 ? `, você tem ${tem}` : tem ? ", na sua conta" : "";
                    return (
                      <li key={coluna} data-tem={tem ? true : undefined} title={nome}>
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

      <LojaAbrir pacote={escolhido} aoFechar={fechar} aoGuardar={somar} podeComprar={podeComprar} />
    </div>
  );
}
