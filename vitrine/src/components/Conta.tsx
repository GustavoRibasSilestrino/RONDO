/* A conta do RONDO no site (lib/conta.ts): a foto (ou a inicial) e o @ de quem está entrado, no lugar de "Entrar" e
   "Criar conta". Tocar abre um menu pequeno com "Abrir o app" e "Sair da conta", como nos sites profissionais
   (padrão de divulgação: botão com aria-expanded e a lista logo abaixo; Esc ou um toque fora fecham). */
import { useEffect, useId, useRef, useState } from "react";
import { rotuloDa, sair, useConta, type Conta } from "../lib/conta";
import { APP } from "../lib/rotas";

/* a foto da conta; sem foto (ou se ela não carregar), a inicial do nome */
export function FotoDaConta({ conta, className = "" }: { conta: Conta; className?: string }) {
  const [falhou, setFalhou] = useState<string | null>(null);
  const foto = conta.foto && falhou !== conta.foto ? conta.foto : null;
  return (
    <span className={`conta-foto ${className}`.trim()} aria-hidden="true">
      {foto ? <img src={foto} alt="" width={64} height={64} decoding="async" referrerPolicy="no-referrer" onError={() => setFalhou(foto)} /> : conta.nome.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/* `variante`: "site" (o botão de vidro do topo do site) ou "loja" (o quadro de pixel do topo da loja) */
export function ContaMenu({ variante = "site" }: { variante?: "site" | "loja" }) {
  const { conta } = useConta();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setAberto(false); botao.current?.focus(); } };
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener("keydown", tecla);
    document.addEventListener("pointerdown", fora);
    return () => { document.removeEventListener("keydown", tecla); document.removeEventListener("pointerdown", fora); };
  }, [aberto]);

  if (!conta) return null;
  const rotulo = rotuloDa(conta);
  return (
    <div className={`conta-menu conta-menu-${variante}`} ref={raiz}>
      <button
        ref={botao} type="button" className={variante === "site" ? "btn btn-ghost btn-sm conta-chip" : "loja-conta"}
        aria-expanded={aberto} aria-controls={id} onClick={() => setAberto((a) => !a)}
        aria-label={`Sua conta, ${rotulo}`}
      >
        <FotoDaConta conta={conta} />
        <span className="conta-chip-nome">{rotulo}</span>
        <svg className="conta-seta" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div className="conta-menu-lista" id={id} hidden={!aberto}>
        <p className="conta-menu-quem"><b>{conta.nome}</b>{conta.arroba ? <span>@{conta.arroba}</span> : null}</p>
        <a href={APP} onClick={() => setAberto(false)}>Abrir o app</a>
        <button type="button" onClick={() => { setAberto(false); sair(); }}>Sair da conta</button>
      </div>
    </div>
  );
}
