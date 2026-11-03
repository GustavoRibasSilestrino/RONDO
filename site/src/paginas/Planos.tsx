import { Link } from "react-router-dom";
import { Plano, planos } from "../planos";

function Cartao({ p }: { p: Plano }) {
  return (
    <article className={"plano" + (p.destaque ? " destaque" : "")}>
      {p.destaque && <span className="pill ember">Mais escolhido</span>}
      <h3>{p.nome}</h3>
      <div className="preco">
        {p.preco}
        <span>/mês</span>
      </div>
      <ul>
        {p.itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <Link to={`/checkout/${p.id}`} className={"btn" + (p.destaque ? "" : " ghost")}>
        Assinar {p.nome}
      </Link>
    </article>
  );
}

export default function Planos() {
  return (
    <section className="wrap sec">
      <h1 className="h2 center">Planos</h1>
      <p className="lead center">O app é grátis. Assine para desbloquear mais.</p>

      <h3 className="grupo">Para você</h3>
      <div className="grid3">
        {planos.filter((p) => p.publico === "usuario").map((p) => <Cartao key={p.id} p={p} />)}
      </div>

      <h3 className="grupo">Para profissionais</h3>
      <div className="grid3">
        {planos.filter((p) => p.publico === "profissional").map((p) => <Cartao key={p.id} p={p} />)}
      </div>

      <p className="nota center">Valores sugeridos, sujeitos a confirmação antes do lançamento.</p>
    </section>
  );
}
