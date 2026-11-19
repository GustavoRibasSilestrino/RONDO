/* A conta do app aparecendo no site (lib/conta.ts): a foto (ou a inicial) e o @ de quem já entrou no app, no lugar de
   "Entrar" e "Criar conta". Tocar leva para o app, já dentro da conta. */
import { useState } from "react";
import { rotuloDa, useConta, type Conta } from "../lib/conta";
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

export function ContaChip({ className = "" }: { className?: string }) {
  const { conta } = useConta();
  if (!conta) return null;
  const rotulo = rotuloDa(conta);
  return (
    <a className={`btn btn-ghost btn-sm conta-chip ${className}`.trim()} href={APP} aria-label={`${rotulo}: abrir o app na sua conta`}>
      <FotoDaConta conta={conta} />
      <span className="conta-chip-nome">{rotulo}</span>
    </a>
  );
}
