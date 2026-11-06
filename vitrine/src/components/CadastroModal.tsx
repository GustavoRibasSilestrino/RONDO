/* O cadastro abre numa janela, de qualquer botão "Criar conta" (eles apontam para #cadastro).
   Esc, o X ou um clique fora fecham; o foco volta para onde estava. */
import { useEffect, useRef, useState } from "react";
import { CriarConta } from "./Cadastro";

const abertoNaUrl = () => location.hash === "#cadastro";

export function CadastroModal() {
  const [aberto, setAberto] = useState(abertoNaUrl);
  const caixa = useRef<HTMLDivElement>(null);
  const antes = useRef<Element | null>(null);

  useEffect(() => {
    const ver = () => { if (abertoNaUrl()) { antes.current = document.activeElement; setAberto(true); } };
    addEventListener("hashchange", ver);
    return () => removeEventListener("hashchange", ver);
  }, []);

  const fechar = () => {
    setAberto(false);
    history.replaceState(null, "", location.pathname + location.search);
    (antes.current as HTMLElement | null)?.focus?.();
  };

  useEffect(() => {
    if (!aberto) return;
    document.body.style.overflow = "hidden";
    caixa.current?.querySelector<HTMLInputElement>("input")?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    addEventListener("keydown", esc);
    return () => { document.body.style.overflow = ""; removeEventListener("keydown", esc); };
  }, [aberto]);

  if (!aberto) return null;
  return (
    <div className="modal-fundo" onClick={(e) => { if (e.target === e.currentTarget) fechar(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cadastro-titulo" ref={caixa}>
        <button type="button" className="modal-fechar" aria-label="Fechar" onClick={fechar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <h2 id="cadastro-titulo">Criar conta</h2>
        <p className="modal-sub">É grátis. Depois, entre no app com o mesmo e-mail.</p>
        <CriarConta />
      </div>
    </div>
  );
}
