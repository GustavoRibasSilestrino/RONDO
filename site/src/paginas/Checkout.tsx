import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { criarAssinatura } from "../api";
import { planos } from "../planos";

export default function Checkout() {
  const { planoId } = useParams();
  const plano = planos.find((p) => p.id === planoId);
  const [estado, setEstado] = useState<"form" | "enviando" | "pendente" | "erro">("form");

  if (!plano) {
    return (
      <section className="wrap sec narrow">
        <h1 className="h2">Plano não encontrado</h1>
        <Link to="/planos" className="btn">Ver planos</Link>
      </section>
    );
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    try {
      // TODO: trocar pelo token real do Card Payment Brick (Mercado Pago) ou Stripe Elements.
      await criarAssinatura({ plano_id: plano!.id, token: "token-de-teste" });
      setEstado("pendente");
    } catch {
      setEstado("erro");
    }
  }

  if (estado === "pendente") {
    return (
      <section className="wrap sec narrow center">
        <h1 className="h2">Pagamento em análise</h1>
        <p className="lead">
          Assim que o gateway confirmar, seu {plano.nome} é liberado no app automaticamente.
        </p>
      </section>
    );
  }

  return (
    <section className="wrap sec narrow">
      <h1 className="h2">Assinar {plano.nome}</h1>
      <div className="resumo">
        <span>{plano.nome}</span>
        <b>{plano.preco}/mês</b>
      </div>

      <form onSubmit={enviar} className="form">
        <label>
          Nome
          <input required autoComplete="name" />
        </label>
        <label>
          E-mail
          <input required type="email" autoComplete="email" />
        </label>

        <div className="gateway">
          <b>Cartão ou Pix</b>
          <p>
            O formulário seguro do gateway de pagamento aparece aqui. O número do cartão nunca passa pelos nossos
            servidores.
          </p>
        </div>

        <button className="btn" disabled={estado === "enviando"}>
          {estado === "enviando" ? "Enviando..." : `Assinar por ${plano.preco}/mês`}
        </button>
        {estado === "erro" && <p className="erro">Não foi possível iniciar a assinatura. Tente novamente.</p>}
      </form>
    </section>
  );
}
