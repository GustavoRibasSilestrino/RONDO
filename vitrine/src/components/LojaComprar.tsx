/* A tela de compra de um browniezinho (desde 2026-11-27, quando a loja passou a vender cada mascote separado, sem sorteio;
   antes era a abertura de pacote, LojaAbrir.tsx). Em pixel art, como a loja: o mascote escolhido grande, com a luz amarela
   girando atrás, a raridade, o nome, o número na coleção e o preço. Ao comprar, um clarão amarelo e a fanfarra da raridade, e
   o aviso de que ele foi guardado na conta. Quem pede menos movimento vê o resultado sem clarão.

   A conta: comprar pede a conta do RONDO, a mesma do app (lib/conta.ts). Sem conta, o "Comprar" mostra o aviso "Você não
   está na sua conta" e o botão "Entrar ou criar conta", que leva à tela do RONDIN do próprio site (/entrar). Depois de
   entrar, a pessoa volta para a loja com este mesmo mascote aberto de novo (`lembrarMascote`).
   Hoje a compra está fechada para todas as contas, até a do dono (o servidor recusa e o botão vira "Em breve"). */
import { useCallback, useEffect, useRef, useState } from "react";
import { RARIDADES, TOTAL_MASCOTES, chaveDe, preco, type Mascote as Escolhido } from "../data/loja";
import { ErroApi, comprarMascote, type MascoteDaConta } from "../lib/api";
import { contaRecusada, rotuloDa, useConta } from "../lib/conta";
import { clarao, recompensa } from "../lib/somLoja";
import { ENTRAR_LOJA } from "../lib/rotas";
import { reduceMotion } from "../lib/util";
import { Estrelas, Mascote } from "./LojaPartes";

type Fase = "compra" | "comprando" | "comprado";

/* o mascote que a pessoa ia comprar quando foi entrar na conta: de volta à loja, ele abre de novo (Loja.tsx) */
const LEMBRAR = "rondo.loja.mascote";
export const lembrarMascote = (chave: string) => { try { sessionStorage.setItem(LEMBRAR, chave); } catch { /* sem armazenamento */ } };
export function mascoteLembrado(): string | null {
  try { const c = sessionStorage.getItem(LEMBRAR); sessionStorage.removeItem(LEMBRAR); return c && /^\d-\d{1,2}$/.test(c) ? c : null; } catch { return null; }
}

const CERTO = "M7 1h1v1H7zM6 2h1v1H6zM5 3h1v1H5zM4 4h1v1H4zM3 5h1v1H3zM2 4h1v1H2zM1 3h1v1H1z";
const CLARAO_MS = 700;

/* `podeComprar`: a compra de mascotes está liberada (false = fechada até a venda abrir, para todas as contas; null = ainda
   não se sabe, e o servidor confere na compra). `tem`: quantos deste a conta já tem. */
export function LojaComprar({ mascote, tem = 0, aoFechar, aoGuardar, podeComprar = null }: {
  mascote: Escolhido | null; tem?: number; aoFechar: () => void; aoGuardar: (m: MascoteDaConta) => void; podeComprar?: boolean | null;
}) {
  const [recusada, setRecusada] = useState(false);   // o servidor disse que a loja está fechada
  const fechada = podeComprar === false || recusada;
  const { token, conta } = useConta();
  const dialogo = useRef<HTMLDialogElement>(null);
  const principal = useRef<HTMLElement | null>(null);
  const marcarPrincipal = (el: HTMLElement | null) => { principal.current = el; };
  const [fase, setFase] = useState<Fase>("compra");
  const [atual, setAtual] = useState<Escolhido | null>(mascote);   // o último escolhido fica na tela enquanto o diálogo fecha
  const [quantos, setQuantos] = useState(0);   // depois da compra: quantos a conta tem agora
  const [clareando, setClareando] = useState(false);
  const [erro, setErro] = useState("");
  const [pedindoConta, setPedindoConta] = useState(false);   // tocou em Comprar sem estar na conta

  /* abrir e fechar junto com o mascote escolhido */
  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (mascote) {
      setAtual(mascote); setFase("compra"); setErro(""); setPedindoConta(false); setClareando(false);
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
  }, [mascote]);

  /* o foco vai para a ação principal de cada etapa */
  useEffect(() => { if (mascote) principal.current?.focus({ preventScroll: true }); }, [fase, mascote, pedindoConta]);

  const comprar = useCallback(async () => {
    const m = atual;
    if (!m || fase === "comprando") return;
    setErro("");
    if (!token) { setPedindoConta(true); return; }   // sem conta: o aviso com o botão de entrar ou criar conta
    if (fechada) return;                              // loja fechada: o botão nem aparece, mas por garantia
    setFase("comprando");
    try {
      const r = await comprarMascote(token, m.linha, m.coluna);
      aoGuardar(r);
      setQuantos(r.quantidade);
      if (!reduceMotion) { setClareando(true); clarao(); window.setTimeout(() => setClareando(false), CLARAO_MS); }
      recompensa(m.raridade);   // a fanfarra (mais longa quanto mais rara)
      setFase("comprado");
    } catch (e) {
      const err = e instanceof ErroApi ? e : null;
      setFase("compra");
      if (err?.status === 401) { contaRecusada(); setPedindoConta(true); return; }   // a sessão venceu: entra de novo
      if (err?.status === 403 && /em breve/i.test(err.message)) { setRecusada(true); return; }   // a loja está fechada
      setErro(err?.message ?? "Não deu para comprar agora. Tente de novo.");
    }
  }, [atual, fase, token, fechada, aoGuardar]);
  const fechar = () => dialogo.current?.close();

  const m = atual;
  const raridade = m ? RARIDADES[m.linha] : null;
  const rotulo = conta ? rotuloDa(conta) : "";

  return (
    <dialog
      ref={dialogo} className="abre compra" data-fase={fase} data-r={m?.raridade}
      aria-labelledby="abre-titulo" onClose={aoFechar}
      onClick={(e) => { if (e.target === e.currentTarget && fase !== "comprando") fechar(); }}
    >
      {m && raridade ? (
        <div className="abre-quadro">
          <button type="button" className="abre-fechar" aria-label="Fechar" onClick={fechar}>
            <svg viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true"><path d="M1 0h1v1h1v1h1v1h1V2h1V1h1V0h1v2H7v1H6v1H5v1h1v1h1v1h1v2H7V8H6V7H5V6H4v1H3v1H2v1H1V7h1V6h1V5h1V4H3V3H2V2H1z" fill="currentColor" /></svg>
          </button>

          {/* o palco: a luz amarela girando atrás e o mascote em cima de um chão de grama */}
          <div className="abre-palco compra-palco">
            <i className="abre-raios" aria-hidden="true" />
            <i className="compra-chao" aria-hidden="true" />
            <Mascote key={chaveDe(m.linha, m.coluna)} linha={m.linha} coluna={m.coluna} className="abre-mascote" />
            {clareando ? <i className="compra-clarao" aria-hidden="true" /> : null}
          </div>

          <div className="abre-texto">
            <p className="abre-raridade" data-r={raridade.id}><Estrelas n={raridade.estrelas} />{raridade.nome}</p>
            <h2 id="abre-titulo">{m.nome}</h2>
            <p className="compra-numero">Nº {m.numero} de {TOTAL_MASCOTES}{tem ? <span> · na sua conta: {tem}</span> : null}</p>

            {fase === "comprado" ? (
              <>
                <p className="abre-guardado" role="status">
                  <svg viewBox="0 0 9 7" shapeRendering="crispEdges" aria-hidden="true"><path d={CERTO} fill="currentColor" /></svg>
                  {quantos > 1 ? `Na sua conta: agora você tem ${quantos}` : rotulo ? `Guardado na conta ${rotulo}` : "Guardado na sua conta"}
                </p>
                <div className="abre-acoes">
                  <button type="button" className="px-btn" ref={marcarPrincipal} onClick={fechar}>Voltar à loja</button>
                </div>
              </>
            ) : (
              <>
                <p className="abre-preco"><b>{preco(m.centavos)}</b><span>na prévia: grátis</span></p>
                <p className="compra-sem-sorteio">Sem sorteio: vai para a sua conta exatamente este browniezinho.</p>
                {erro ? <p className="abre-erro" role="alert">{erro}</p> : null}
                {pedindoConta && !token ? (
                  /* sem conta: o aviso e o caminho para a tela do RONDIN do site; de volta, este mascote abre de novo */
                  <div className="abre-sem-conta" role="status">
                    <p><b>Você não está na sua conta.</b> Para levar um browniezinho, entre na sua conta do RONDO ou crie uma agora.</p>
                    <div className="abre-acoes">
                      <a className="px-btn" ref={marcarPrincipal} href={ENTRAR_LOJA} onClick={() => lembrarMascote(chaveDe(m.linha, m.coluna))}>Entrar ou criar conta</a>
                      <button type="button" className="px-btn px-btn-escuro" onClick={() => setPedindoConta(false)}>Voltar</button>
                    </div>
                  </div>
                ) : token && fechada ? (
                  /* com conta, mas a loja ainda não vende: nada de mascote de graça antes do pagamento existir */
                  <div className="abre-em-breve" role="status">
                    <p><b>A loja abre em breve.</b> Por enquanto as compras estão fechadas. Quando abrirem, é só voltar aqui e levar o seu browniezinho.</p>
                    <div className="abre-acoes">
                      <button type="button" className="px-btn" disabled>Em breve</button>
                      <button type="button" className="px-btn px-btn-escuro" ref={marcarPrincipal} onClick={fechar}>Voltar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {conta ? <p className="abre-quem">Vai para a conta <b>{rotulo}</b></p> : null}
                    <div className="abre-acoes">
                      <button type="button" className="px-btn" ref={marcarPrincipal} onClick={comprar} aria-disabled={fase === "comprando" || undefined}>
                        {fase === "comprando" ? "Comprando..." : "Comprar"}
                      </button>
                      <button type="button" className="px-btn px-btn-escuro" onClick={fechar}>Voltar</button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
