/* Duas partes da loja de pacotinhos que chegaram em 2026-11-19 (pedido do dono), no mesmo pixel art da feira:

   O LÁPIS (LojaLapis): um item à venda, como os pacotes. Dá um nome próprio a um browniezinho da coleção. Compra-se aqui,
   fica guardado na conta e é usado no app (Perfil > Coleção > o lápis): a pessoa escolhe o mascote, digita o nome e
   confirma. Cada lápis vale um nome. Segue a regra dos pacotes: pede a conta e, com a loja fechada, mostra "Em breve".

   A TROCA DE REPETIDOS (LojaTrocas): um pacotinho pode trazer um mascote que a conta já tem. Com um repetido, a pessoa
   propõe uma troca: oferece um repetido seu, acha outra pessoa pelo nome ou pela @ e pede um repetido dela. Só repetidos
   entram, dos dois lados (ninguém fica sem um mascote que tinha). Quem recebe aceita ou recusa aqui; quem propôs pode
   cancelar. O servidor confere tudo de novo na hora do aceite (backend/app/servicos/loja.py). */
import { useCallback, useEffect, useRef, useState } from "react";
import { LAPIS, RARIDADES, chaveDe, nomeDe, preco } from "../data/loja";
import {
  ErroApi, buscarPessoas, comprarLapis, minhasTrocas, proporTroca, repetidosDe, responderTroca,
  type Casa, type MascoteDaConta, type PessoaDaTroca, type Troca,
} from "../lib/api";
import { contaRecusada, rotuloDa, useConta } from "../lib/conta";
import { ENTRAR_LOJA } from "../lib/rotas";
import { Estrelas, Mascote } from "./LojaPartes";

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
const arroba = (p: { nome: string; arroba: string | null }) => (p.arroba ? `@${p.arroba}` : p.nome);

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

/* ============================== a troca de repetidos ============================== */
function Brownie({ casa, legenda }: { casa: Casa; legenda: string }) {
  const r = RARIDADES[casa.linha];
  return (
    <span className="troca-brownie" data-r={r.id}>
      <Mascote linha={casa.linha} coluna={casa.coluna} />
      <span><small>{legenda}</small><b>{nomeDe(casa.linha, casa.coluna)}</b><i><Estrelas n={r.estrelas} />{r.nome}</i></span>
    </span>
  );
}

const ESTADO: Record<Troca["estado"], string> = { pendente: "Esperando resposta", aceita: "Troca feita", recusada: "Recusada", cancelada: "Cancelada" };

type Etapa = "pessoa" | "mascote" | "confirmar" | "feito";

function PropostaDialogo({ ofereco, aoFechar, aoEnviar }: { ofereco: Casa | null; aoFechar: () => void; aoEnviar: () => void }) {
  const { token } = useConta();
  const dialogo = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const [etapa, setEtapa] = useState<Etapa>("pessoa");
  const [busca, setBusca] = useState("");
  const [pessoas, setPessoas] = useState<PessoaDaTroca[] | null>(null);
  const [pessoa, setPessoa] = useState<PessoaDaTroca | null>(null);
  const [repetidos, setRepetidos] = useState<MascoteDaConta[] | null>(null);
  const [peco, setPeco] = useState<Casa | null>(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [dada, setDada] = useState<Casa>({ linha: 0, coluna: 0 });   // o último oferecido fica na tela enquanto o diálogo fecha

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (ofereco) {
      setDada(ofereco); setEtapa("pessoa"); setBusca(""); setPessoas(null); setPessoa(null); setRepetidos(null); setPeco(null); setErro("");
      if (!d.open) d.showModal();
      campo.current?.focus({ preventScroll: true });
    } else if (d.open) d.close();
  }, [ofereco]);

  /* a busca de pessoas: espera a pessoa parar de digitar (sem busca, o servidor sugere gente) */
  useEffect(() => {
    if (!ofereco || !token || etapa !== "pessoa") return;
    let vale = true;
    const id = setTimeout(() => {
      buscarPessoas(token, busca.trim())
        .then((r) => { if (vale) { setPessoas(r.itens); setErro(""); } })
        .catch((e) => { if (vale) setErro(mensagem(e, "Não deu para buscar agora.")); });
    }, busca ? 320 : 0);
    return () => { vale = false; clearTimeout(id); };
  }, [busca, ofereco, token, etapa]);

  const escolherPessoa = async (p: PessoaDaTroca) => {
    if (!token) return;
    setPessoa(p); setRepetidos(null); setErro(""); setEtapa("mascote");
    try {
      const r = await repetidosDe(token, p.id);
      setRepetidos(r.mascotes.filter((m) => !(m.linha === dada.linha && m.coluna === dada.coluna)));
    } catch (e) {
      setErro(mensagem(e, "Não deu para ver os repetidos dessa pessoa.")); setRepetidos([]);
    }
  };

  const enviar = async () => {
    if (!token || !pessoa || !peco || enviando) return;
    setErro(""); setEnviando(true);
    try {
      await proporTroca(token, pessoa.id, dada, peco);
      setEtapa("feito"); aoEnviar();
    } catch (e) {
      setErro(mensagem(e, "Não deu para enviar a proposta agora."));
    } finally {
      setEnviando(false);
    }
  };
  const fechar = () => dialogo.current?.close();

  return (
    <dialog ref={dialogo} className="abre troca" aria-labelledby="troca-titulo" onClose={aoFechar} onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <div className="abre-quadro troca-quadro">
        <button type="button" className="abre-fechar" aria-label="Fechar" onClick={fechar}>
          <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true"><path d="M1 0h1v1h1v1h1v1h1V2h1V1h1V0h1v2H7v1H6v1H5v1h1v1h1v1h1v2H7V8H6V7H5V6H4v1H3v1H2v1H1V7h1V6h1V5h1V4H3V3H2V2H1z" fill="currentColor" /></svg>
        </button>
        <h2 id="troca-titulo">{etapa === "feito" ? "Proposta enviada" : "Propor troca"}</h2>
        <Brownie casa={dada} legenda="Você dá" />
        {erro ? <p className="abre-erro" role="alert">{erro}</p> : null}

        {etapa === "pessoa" ? (
          <>
            <label className="troca-campo">
              <span>Com quem você quer trocar?</span>
              <input ref={campo} type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou @ da pessoa" autoComplete="off" maxLength={60} />
            </label>
            <ul className="troca-pessoas" aria-label="Pessoas" aria-busy={pessoas === null}>
              {pessoas === null ? <li className="troca-vazio">Buscando...</li> : pessoas.length === 0 ? <li className="troca-vazio">Ninguém com esse nome.</li> : pessoas.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => escolherPessoa(p)}><b>{p.nome}</b>{p.arroba ? <span>@{p.arroba}</span> : null}</button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {etapa === "mascote" && pessoa ? (
          <>
            <p className="troca-passo">Os repetidos de <b>{arroba(pessoa)}</b>. Escolha o que você quer receber.</p>
            {repetidos === null ? <p className="troca-vazio">Carregando...</p> : repetidos.length === 0 ? (
              <p className="troca-vazio">Essa pessoa não tem repetidos para trocar agora.</p>
            ) : (
              <ul className="troca-grade">
                {repetidos.map((m) => (
                  <li key={chaveDe(m.linha, m.coluna)} data-r={m.raridade}>
                    <button type="button" onClick={() => { setPeco({ linha: m.linha, coluna: m.coluna }); setEtapa("confirmar"); }} aria-label={`${nomeDe(m.linha, m.coluna)}, ${RARIDADES[m.linha].nome}, ela tem ${m.quantidade}`}>
                      <Mascote linha={m.linha} coluna={m.coluna} />
                      <span>{nomeDe(m.linha, m.coluna)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="abre-acoes"><button type="button" className="px-btn px-btn-escuro" onClick={() => setEtapa("pessoa")}>Outra pessoa</button></div>
          </>
        ) : null}

        {etapa === "confirmar" && pessoa && peco ? (
          <>
            <Brownie casa={peco} legenda={`Você recebe de ${arroba(pessoa)}`} />
            <p className="troca-passo">Os dois continuam com um de cada. A troca só acontece se {arroba(pessoa)} aceitar.</p>
            <div className="abre-acoes">
              <button type="button" className="px-btn" onClick={enviar} aria-disabled={enviando || undefined}>{enviando ? "Enviando..." : "Propor troca"}</button>
              <button type="button" className="px-btn px-btn-escuro" onClick={() => setEtapa("mascote")}>Voltar</button>
            </div>
          </>
        ) : null}

        {etapa === "feito" && pessoa && peco ? (
          <>
            <Brownie casa={peco} legenda={`Você pediu a ${arroba(pessoa)}`} />
            <p className="troca-passo" role="status">{arroba(pessoa)} recebe um aviso no app e responde aqui na loja. A proposta fica em "Suas propostas".</p>
            <div className="abre-acoes"><button type="button" className="px-btn" onClick={fechar}>Voltar à loja</button></div>
          </>
        ) : null}
      </div>
    </dialog>
  );
}

export function LojaTrocas({ colecao, aoMudar }: { colecao: Map<string, number>; aoMudar: () => void }) {
  const { token } = useConta();
  const [trocas, setTrocas] = useState<Troca[] | null>(null);
  const [ofereco, setOfereco] = useState<Casa | null>(null);
  const [erro, setErro] = useState("");
  const [ocupada, setOcupada] = useState<number | null>(null);
  const fechar = useCallback(() => setOfereco(null), []);

  const carregar = useCallback(() => {
    if (!token) { setTrocas(null); return; }
    minhasTrocas(token).then((r) => setTrocas(r.trocas)).catch((e: { status?: number }) => { if (e.status === 401) contaRecusada(); else setTrocas([]); });
  }, [token]);
  useEffect(() => { carregar(); }, [carregar]);

  const responder = async (t: Troca, acao: "aceitar" | "recusar" | "cancelar") => {
    if (!token || ocupada !== null) return;
    setErro(""); setOcupada(t.id);
    try {
      await responderTroca(token, t.id, acao);
      if (acao === "aceitar") aoMudar();   // os mascotes mudaram de conta: a coleção da página lê de novo
    } catch (e) {
      setErro(mensagem(e, "Não deu agora. Tente de novo."));
      if (acao === "aceitar") aoMudar();
    } finally {
      setOcupada(null); carregar();
    }
  };

  const repetidos = [...colecao].filter(([, q]) => q >= 2).map(([chave, q]) => { const [linha, coluna] = chave.split("-").map(Number); return { linha, coluna, q }; });
  const pendentes = (trocas ?? []).filter((t) => t.estado === "pendente");
  const resolvidas = (trocas ?? []).filter((t) => t.estado !== "pendente");

  return (
    <section className="loja-faixa loja-trocas" id="loja-trocas" aria-labelledby="loja-trocas-titulo">
      <div className="loja-in">
        <h2 id="loja-trocas-titulo">Veio repetido? Troque</h2>
        <p className="loja-lead">
          Um pacotinho pode trazer um browniezinho que você já tem. Ofereça o repetido a outra pessoa e peça um repetido dela:
          os dois continuam com um de cada, e ninguém perde nada.
        </p>

        {!token ? (
          <div className="abre-sem-conta troca-entrar" role="status">
            <p><b>Você não está na sua conta.</b> Entre para ver os seus repetidos e propor trocas.</p>
            <div className="abre-acoes"><a className="px-btn" href={ENTRAR_LOJA}>Entrar ou criar conta</a></div>
          </div>
        ) : (
          <>
            <h3 className="troca-sub">Seus repetidos</h3>
            {repetidos.length === 0 ? (
              <p className="troca-vazio">Você ainda não tem repetidos. Quando um pacotinho trouxer um que você já tem, ele aparece aqui.</p>
            ) : (
              <ul className="troca-grade">
                {repetidos.map((m) => (
                  <li key={chaveDe(m.linha, m.coluna)} data-r={RARIDADES[m.linha].id}>
                    <button type="button" onClick={() => setOfereco({ linha: m.linha, coluna: m.coluna })} aria-label={`${nomeDe(m.linha, m.coluna)}, você tem ${m.q}. Propor troca`}>
                      <Mascote linha={m.linha} coluna={m.coluna} />
                      <span>{nomeDe(m.linha, m.coluna)}</span>
                      <b className="loja-qtd" aria-hidden="true">x{m.q}</b>
                      <i>Propor troca</i>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="troca-sub">Suas propostas</h3>
            {erro ? <p className="abre-erro" role="alert">{erro}</p> : null}
            {trocas === null ? <p className="troca-vazio">Carregando...</p> : pendentes.length + resolvidas.length === 0 ? (
              <p className="troca-vazio">Nenhuma proposta ainda. As que você fizer e as que receber aparecem aqui.</p>
            ) : (
              <ul className="troca-lista" aria-live="polite">
                {[...pendentes, ...resolvidas].map((t) => (
                  <li key={t.id} data-estado={t.estado}>
                    <p className="troca-quem">
                      {t.recebida ? <><b>{arroba(t.pessoa)}</b> quer trocar com você</> : <>Você propôs a <b>{arroba(t.pessoa)}</b></>}
                      <span>{ESTADO[t.estado]}</span>
                    </p>
                    <div className="troca-par">
                      <Brownie casa={t.dou} legenda={t.estado === "aceita" ? "Você deu" : "Você dá"} />
                      <svg className="troca-seta" viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true"><path d="M0 2h6V1h1v1h1v1h1v1H0zM0 5h9v1H3v1H2V6H1V5z" fill="currentColor" /></svg>
                      <Brownie casa={t.recebo} legenda={t.estado === "aceita" ? "Você recebeu" : "Você recebe"} />
                    </div>
                    {t.estado === "pendente" ? (
                      <div className="abre-acoes">
                        {t.recebida ? (
                          <>
                            <button type="button" className="px-btn px-btn-p" onClick={() => responder(t, "aceitar")} aria-disabled={ocupada === t.id || undefined}>Aceitar</button>
                            <button type="button" className="px-btn px-btn-p px-btn-escuro" onClick={() => responder(t, "recusar")} aria-disabled={ocupada === t.id || undefined}>Recusar</button>
                          </>
                        ) : (
                          <button type="button" className="px-btn px-btn-p px-btn-escuro" onClick={() => responder(t, "cancelar")} aria-disabled={ocupada === t.id || undefined}>Cancelar proposta</button>
                        )}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <PropostaDialogo ofereco={ofereco} aoFechar={fechar} aoEnviar={carregar} />
    </section>
  );
}
