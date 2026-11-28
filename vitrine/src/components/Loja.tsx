/* A loja de browniezinhos (/loja), pedido do dono em 2026-11-18, em pixel art, com música de jogo e clique de 8 bits.
   Desde 2026-11-27 (pedido do dono) a loja vende CADA MASCOTE separado, por um preço fixo da raridade, no lugar dos pacotes
   sorteados (caixas de recompensa, proibidas pelo ECA Digital em produtos que menores usam; ver data/loja.ts). E o cenário é
   a floresta ao pôr do sol, arte do dono (assets/loja/floresta.webp), parada atrás de tudo: ao rolar, a vista desce do céu
   até o gramado. Cada mascote fica num quadro escuro com moldura e uma luz da cor da raridade atrás dele, para se destacar
   do fundo. Tocar num mascote abre a tela de compra (LojaComprar.tsx).
   Em cima, o nome da loja numa placa e os preços de cada raridade (cada um leva à prateleira dela); depois, uma prateleira
   por raridade, do comum ao lendário; no fim, o lápis de nome (LojaExtras.tsx). A troca de repetidos fica só no app.
   Comprar pede a conta do RONDO (a mesma do app); quem não está na conta entra pela tela do RONDIN do site (/entrar) e volta
   para cá com o mascote aberto de novo. Com a conta, a vitrine marca os mascotes que ela já tem, com a quantidade. Hoje a
   compra está fechada para todas as contas e nada é cobrado. */
import { useCallback, useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";
import { alternarSom, assinarSom, clique, pararMusica, somLigado, tocarMusica } from "../lib/somLoja";
import { COLUNAS, RARIDADES, TOTAL_MASCOTES, chaveDe, mascoteDe, nomeDe, preco, type Mascote as MascoteDaLoja } from "../data/loja";
import { minhaColecao, type MascoteDaConta } from "../lib/api";
import { contaRecusada, useConta } from "../lib/conta";
import { ENTRAR_LOJA } from "../lib/rotas";
import { ContaMenu } from "./Conta";
import { LojaComprar, mascoteLembrado } from "./LojaComprar";
import { LojaLapis } from "./LojaExtras";
import { Estrelas, Mascote } from "./LojaPartes";
import { Nome } from "./ui";

/* a coleção da conta: chave do mascote -> quantos ela tem (vem do servidor; cada compra soma aqui na hora). Vem junto o que a
   conta pode comprar: podeComprar (o lápis: fechado, só o dono compra) e podeComprarMascote (os mascotes: fechados para
   todas as contas, até a do dono, até a venda abrir; sem a resposta do servidor, ficam fechados). null = ainda não se sabe. */
function useColecao() {
  const { token } = useConta();
  const [colecao, setColecao] = useState<Map<string, number>>(() => new Map());
  const [nomes, setNomes] = useState<Map<string, string>>(() => new Map());   // os nomes próprios, dados com o lápis no app
  const [podeComprar, setPodeComprar] = useState<boolean | null>(null);
  const [podeComprarMascote, setPodeComprarMascote] = useState<boolean | null>(null);
  const [lapis, setLapis] = useState(0);
  useEffect(() => {
    if (!token) { setColecao(new Map()); setNomes(new Map()); setPodeComprar(null); setPodeComprarMascote(null); setLapis(0); return; }
    let vale = true;
    minhaColecao(token)
      .then((c) => {
        if (!vale) return;
        setColecao(new Map(c.mascotes.map((m) => [chaveDe(m.linha, m.coluna), m.quantidade])));
        setNomes(new Map(c.mascotes.flatMap((m) => (m.nome ? [[chaveDe(m.linha, m.coluna), m.nome] as [string, string]] : []))));
        setPodeComprar(c.pode_comprar ?? true);
        setPodeComprarMascote(c.pode_comprar_mascote ?? false);
        setLapis(c.lapis ?? 0);
      })
      .catch((e: { status?: number }) => { if (vale && e.status === 401) contaRecusada(); });
    return () => { vale = false; };
  }, [token]);
  const somar = useCallback((m: MascoteDaConta) => setColecao((c) => new Map(c).set(chaveDe(m.linha, m.coluna), m.quantidade)), []);
  return { colecao, nomes, somar, podeComprar, podeComprarMascote, lapis, setLapis };
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

/* o som da loja (a música e os efeitos, lib/somLoja.ts): música que toca sozinha precisa de um jeito de desligar
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
  const [escolhido, setEscolhido] = useState<MascoteDaLoja | null>(null);
  const fechar = useCallback(() => setEscolhido(null), []);
  const { conta } = useConta();
  const { colecao, nomes, somar, podeComprar, podeComprarMascote, lapis, setLapis } = useColecao();
  useEffect(() => { document.title = "Loja de browniezinhos · RONDO"; }, []);

  /* de volta da tela de entrar: o mascote que a pessoa ia comprar abre de novo, já com a conta (se ela voltou sem entrar,
     o pedido é esquecido) */
  useEffect(() => {
    const chave = mascoteLembrado();
    if (chave && conta) {
      const [linha, coluna] = chave.split("-").map(Number);
      if (COLUNAS[linha]?.includes(coluna)) setEscolhido(mascoteDe(linha, coluna));
    }
    // só ao chegar na loja
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="loja" onClickCapture={clicar}>
      {/* o cenário: a floresta ao pôr do sol, parada atrás de tudo */}
      <div className="loja-cenario" aria-hidden="true" />

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
        {/* a placa com o nome da loja e o quadro com os preços: cada preço leva à prateleira da raridade */}
        <section className="loja-topo" aria-labelledby="loja-titulo">
          <div className="loja-in">
            <h1 id="loja-titulo" className="loja-placa">Browniezinhos</h1>
            <div className="loja-quadro">
              <p className="loja-lead">
                Escolha o seu, veja o preço e leve. <b>Sem sorteio:</b> vai para a sua conta exatamente o browniezinho que você
                escolheu. São {TOTAL_MASCOTES}, do comum ao lendário.
              </p>
              <nav aria-label="Preço de cada raridade">
                <ul className="loja-precos">
                  {RARIDADES.map((r) => (
                    <li key={r.id} data-r={r.id}>
                      <a href={`#r-${r.id}`}>
                        <span className="loja-precos-nome"><Estrelas n={r.estrelas} />{r.nome}</span>
                        <b>{preco(r.centavos)}</b>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <p className="loja-nota" aria-live="polite">
                {conta ? <>Na sua conta: <b>{colecao.size} de {TOTAL_MASCOTES}</b>. Os seus ficam marcados na vitrine. </> : null}
                Loja em prévia: nada é cobrado. Quando a venda abrir, a compra será só para maiores de 18 anos.
              </p>
            </div>
          </div>
        </section>

        {/* a vitrine: uma prateleira por raridade */}
        {RARIDADES.map((r, linha) => (
          <section className="loja-prateleira" id={`r-${r.id}`} key={r.id} data-r={r.id} aria-labelledby={`r-${r.id}-titulo`}>
            <div className="loja-in">
              <header className="prateleira-placa">
                <h2 id={`r-${r.id}-titulo`}><Estrelas n={r.estrelas} /><span>{r.nome}</span></h2>
                <p><b>{preco(r.centavos)}</b> cada · {r.quantos} mascotes</p>
              </header>
              <ul className="vitrine">
                {COLUNAS[linha].map((coluna) => {
                  const chave = chaveDe(linha, coluna);
                  const tem = colecao.get(chave) ?? 0;
                  const proprio = nomes.get(chave);   // o nome que a conta deu a ele com o lápis
                  const nome = nomeDe(linha, coluna);
                  const estado = tem > 1 ? `. Você tem ${tem}` : tem ? ". Já está na sua conta" : "";
                  return (
                    <li key={coluna}>
                      <button
                        type="button" className="vitrine-item" data-tem={tem ? true : undefined}
                        onClick={() => setEscolhido(mascoteDe(linha, coluna))}
                        aria-label={`${proprio ? `${proprio}, um ${nome}` : nome}, ${r.nome.toLowerCase()}, ${preco(r.centavos)}${estado}`}
                      >
                        <span className="vitrine-palco"><Mascote linha={linha} coluna={coluna} /></span>
                        <span className="vitrine-nome" data-longo={(proprio ?? nome).length >= 12 ? true : undefined}>{proprio ?? nome}</span>
                        <span className="vitrine-preco">{preco(r.centavos)}</span>
                        {tem ? <span className="vitrine-tem" aria-hidden="true">{tem > 1 ? `x${tem}` : "Seu"}</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ))}

        <LojaLapis lapis={lapis} aoComprar={setLapis} podeComprar={podeComprar} />

        <section className="loja-prateleira loja-fim" aria-label="Repetidos e trocas">
          <div className="loja-in">
            <p className="loja-quadro loja-repetido">
              <b>Comprou um que já tinha?</b> Ele vira repetido. Com um repetido, dá para propor uma troca com outra pessoa no
              app, em Perfil, Coleção: toque no mascote repetido e escolha "Propor troca".
            </p>
          </div>
        </section>
      </main>

      <footer className="loja-rodape">
        <p>Os preços são uma estimativa e podem mudar até a abertura da loja.</p>
        <p><a href="/">Voltar ao site</a><a href="/termos">Termos de Uso</a><a href="/privacidade">Privacidade</a></p>
      </footer>

      <LojaComprar
        mascote={escolhido} tem={escolhido ? colecao.get(chaveDe(escolhido.linha, escolhido.coluna)) ?? 0 : 0}
        aoFechar={fechar} aoGuardar={somar} podeComprar={podeComprarMascote}
      />
    </div>
  );
}
