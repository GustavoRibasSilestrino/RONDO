import { FormEvent, useState } from "react";
import { cadastrarProfissional } from "../api";

export default function CadastroProfissional() {
  const [tipo, setTipo] = useState<"CRN" | "CREF">("CRN");
  const [aceite, setAceite] = useState(false);
  const [estado, setEstado] = useState<"form" | "enviando" | "ok" | "erro">("form");

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEstado("enviando");
    try {
      await cadastrarProfissional({
        nome: String(f.get("nome")),
        email: String(f.get("email")),
        tipo,
        registro: String(f.get("registro")),
        uf: String(f.get("uf")),
      });
      setEstado("ok");
    } catch {
      setEstado("erro");
    }
  }

  if (estado === "ok") {
    return (
      <section className="wrap sec narrow center">
        <h1 className="h2">Cadastro recebido</h1>
        <p className="lead">
          Vamos conferir seu registro na consulta pública do conselho. Depois disso, seu perfil ganha o selo
          "Registro conferido".
        </p>
      </section>
    );
  }

  return (
    <section className="wrap sec narrow">
      <h1 className="h2">Cadastro de profissionais</h1>
      <p className="lead">
        Nutricionistas (CRN) e profissionais de Educação Física (CREF). Sem selo, o perfil não aparece na busca.
      </p>

      <form onSubmit={enviar} className="form">
        <div className="seg">
          {(["CRN", "CREF"] as const).map((t) => (
            <button type="button" key={t} className={tipo === t ? "on" : ""} onClick={() => setTipo(t)}>
              {t === "CRN" ? "Nutricionista (CRN)" : "Educação Física (CREF)"}
            </button>
          ))}
        </div>
        <label>Nome completo<input name="nome" required /></label>
        <label>E-mail<input name="email" type="email" required /></label>
        <div className="duo">
          <label>Número do {tipo}<input name="registro" required /></label>
          <label>UF<input name="uf" required maxLength={2} /></label>
        </div>

        <label className="check">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span>
            Li e aceito as regras de divulgação: sem fotos de antes e depois de clientes e sem promessas de resultado.
          </span>
        </label>

        <button className="btn" disabled={!aceite || estado === "enviando"}>
          {estado === "enviando" ? "Enviando..." : "Enviar cadastro"}
        </button>
        {estado === "erro" && <p className="erro">Não foi possível enviar. Tente novamente.</p>}
      </form>
    </section>
  );
}
