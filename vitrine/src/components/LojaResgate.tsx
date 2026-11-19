/* O resgate na página da loja (desde 2026-11-18): a conta no topo, a faixa com os browniezinhos que esperam resgate e o
   campo para digitar um código. Abrir um pacote não pede conta; o mascote só vai para a conta quando a pessoa resgata
   (ver LojaAbrir.tsx e backend/app/servicos/loja.py). */
import { useState, type FormEvent } from "react";
import { nomeDe } from "../data/loja";
import { ErroApi, resgatarCodigo, type MascoteDaConta } from "../lib/api";
import { contaRecusada, rotuloDa, useConta } from "../lib/conta";
import { tirarPendente, usePendentes } from "../lib/resgates";
import { APP, APP_CRIAR_LOJA, APP_ENTRAR_LOJA } from "../lib/rotas";
import { FotoDaConta } from "./Conta";
import { Mascote } from "./LojaPartes";

/* no topo da loja: a conta reconhecida (leva ao app) ou os botões de entrar e criar conta, que voltam para cá */
export function LojaConta() {
  const { conta } = useConta();
  if (conta) {
    const rotulo = rotuloDa(conta);
    return (
      <a className="loja-conta" href={APP} aria-label={`${rotulo}: abrir o app na sua conta`}>
        <FotoDaConta conta={conta} />
        <span>{rotulo}</span>
      </a>
    );
  }
  return (
    <div className="loja-barra-acoes">
      <a className="px-btn px-btn-escuro px-btn-p" href={APP_ENTRAR_LOJA}>Entrar</a>
      <a className="px-btn px-btn-p" href={APP_CRIAR_LOJA}>Criar conta</a>
    </div>
  );
}

/* resgata um código e diz o que aconteceu; códigos vencidos ou de outra conta saem da lista deste navegador */
async function resgatarUm(token: string, codigo: string): Promise<{ mascote?: MascoteDaConta; erro?: ErroApi }> {
  try {
    const mascote = await resgatarCodigo(token, codigo);
    tirarPendente(codigo);
    return { mascote };
  } catch (e) {
    const erro = e instanceof ErroApi ? e : new ErroApi("Não deu para resgatar agora. Tente de novo.");
    if (erro.status === 401) contaRecusada();
    if (erro.status === 404 || erro.status === 409) tirarPendente(codigo);
    return { erro };
  }
}

/* a faixa logo abaixo do topo: os browniezinhos abertos neste navegador que ainda não foram para conta nenhuma */
export function EsperandoResgate({ aoResgatar }: { aoResgatar: (m: MascoteDaConta) => void }) {
  const pendentes = usePendentes();
  const { token, conta } = useConta();
  const [indo, setIndo] = useState(false);
  const [aviso, setAviso] = useState("");
  if (!pendentes.length) return aviso ? <p className="loja-espera-aviso" role="status">{aviso}</p> : null;

  const n = pendentes.length;
  const resgatarTodos = async () => {
    if (!token || indo) return;
    setIndo(true); setAviso("");
    let foram = 0, perdidos = 0, falha = "";
    for (const p of [...pendentes]) {
      const r = await resgatarUm(token, p.codigo);
      if (r.mascote) { foram++; aoResgatar(r.mascote); continue; }
      if (r.erro?.status === 404 || r.erro?.status === 409) { perdidos++; continue; }
      falha = r.erro?.message ?? ""; break;
    }
    setIndo(false);
    const partes = [];
    if (foram) partes.push(foram === 1 ? "1 browniezinho foi para a sua conta." : `${foram} browniezinhos foram para a sua conta.`);
    if (perdidos) partes.push(perdidos === 1 ? "1 código já tinha vencido ou sido resgatado." : `${perdidos} códigos já tinham vencido ou sido resgatados.`);
    if (falha) partes.push(falha);
    setAviso(partes.join(" "));
  };

  return (
    <section className="loja-espera" aria-labelledby="loja-espera-titulo">
      <div className="loja-espera-in">
        <ul className="loja-espera-lista" aria-label="Esperando resgate">
          {pendentes.slice(0, 6).map((p) => (
            <li key={p.codigo}><Mascote linha={p.linha} coluna={p.coluna} rotulo={nomeDe(p.linha, p.coluna)} /></li>
          ))}
          {n > 6 ? <li className="loja-espera-mais" aria-label={`e mais ${n - 6}`}>+{n - 6}</li> : null}
        </ul>
        <div className="loja-espera-texto">
          <h2 id="loja-espera-titulo">{n === 1 ? `${nomeDe(pendentes[0].linha, pendentes[0].coluna)} está esperando resgate` : `${n} browniezinhos esperando resgate`}</h2>
          <p>
            {conta
              ? <>Resgate para a conta <b>{rotuloDa(conta)}</b> e {n === 1 ? "ele entra" : "eles entram"} na sua coleção.</>
              : "Entre na sua conta (ou crie uma) para resgatar. Até lá, ficam guardados neste navegador por 7 dias."}
          </p>
        </div>
        <div className="loja-espera-acoes">
          {conta ? (
            <button type="button" className="px-btn" onClick={resgatarTodos} aria-disabled={indo}>
              {indo ? "Resgatando..." : n === 1 ? "Resgatar" : "Resgatar todos"}
            </button>
          ) : (
            <>
              <a className="px-btn" href={APP_ENTRAR_LOJA}>Entrar e resgatar</a>
              <a className="px-btn px-btn-escuro" href={APP_CRIAR_LOJA}>Criar conta</a>
            </>
          )}
        </div>
      </div>
      {aviso ? <p className="loja-espera-aviso" role="status">{aviso}</p> : null}
    </section>
  );
}

/* digitar um código de resgate (aberto em outro aparelho, ou anotado) */
export function ResgatarCodigo({ aoResgatar }: { aoResgatar: (m: MascoteDaConta) => void }) {
  const { token, conta } = useConta();
  const [codigo, setCodigo] = useState("");
  const [indo, setIndo] = useState(false);
  const [resposta, setResposta] = useState<{ ok: boolean; texto: string } | null>(null);
  if (!conta || !token) {
    return (
      <p className="loja-codigo-sem-conta">
        Tem um código de resgate? <a href={APP_ENTRAR_LOJA}>Entre na sua conta</a> para resgatar.
      </p>
    );
  }
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const limpo = codigo.trim();
    if (indo) return;
    if (limpo.replace(/[^0-9a-z]/gi, "").length !== 10) { setResposta({ ok: false, texto: "O código tem 10 letras e números, como ABCDE-FGHJK." }); return; }
    setIndo(true); setResposta(null);
    const r = await resgatarUm(token, limpo);
    setIndo(false);
    if (r.mascote) {
      aoResgatar(r.mascote);
      setCodigo("");
      setResposta({ ok: true, texto: `${nomeDe(r.mascote.linha, r.mascote.coluna)} foi para a sua conta.` });
    } else setResposta({ ok: false, texto: r.erro?.message ?? "Não deu para resgatar agora." });
  };
  return (
    <form className="loja-codigo" onSubmit={enviar} noValidate>
      <label htmlFor="loja-codigo-campo">Tem um código de resgate?</label>
      <div className="loja-codigo-linha">
        <input
          id="loja-codigo-campo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="ABCDE-FGHJK" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={24}
          aria-invalid={resposta && !resposta.ok ? true : undefined} aria-describedby="loja-codigo-resposta"
        />
        <button type="submit" className="px-btn px-btn-p" aria-disabled={indo}>{indo ? "Resgatando..." : "Resgatar"}</button>
      </div>
      <p id="loja-codigo-resposta" className="loja-codigo-resposta" data-certo={resposta?.ok || undefined} role="status">{resposta?.texto ?? ""}</p>
    </form>
  );
}
