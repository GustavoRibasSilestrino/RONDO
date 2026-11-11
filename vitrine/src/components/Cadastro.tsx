import { useState } from "react";
import { cadastrarProfissional, ErroApi } from "../lib/api";
import { Btn } from "./ui";

type Estado = { tipo: "ok" | "erro" | ""; texto: string };
const VAZIO: Estado = { tipo: "", texto: "" };
const mensagem = (e: unknown) => (e instanceof ErroApi ? e.message : "Não foi possível enviar agora. Tente de novo.");

/* ---------- profissional: entra como "pendente" até o registro ser conferido no conselho ---------- */
export function CadastroProfissional() {
  const [tipo, setTipo] = useState<"CRN" | "CREF">("CRN");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Estado>(VAZIO);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;   // já está enviando: o segundo clique não manda de novo
    const form = e.currentTarget;
    const f = new FormData(form);
    setEnviando(true);
    setAviso(VAZIO);
    try {
      await cadastrarProfissional({
        nome: String(f.get("nome")), email: String(f.get("email")), tipo,
        registro: String(f.get("registro")), uf: String(f.get("uf")),
        aceita_termos: f.get("aceite") === "on", aceita_privacidade: f.get("aceite") === "on",
      });
      form.reset();
      setAviso({ tipo: "ok", texto: "Recebido. Vamos conferir o seu registro no conselho e avisar por e-mail." });
    } catch (err) {
      setAviso({ tipo: "erro", texto: mensagem(err) });
    }
    setEnviando(false);
  }

  return (
    <form className="cadastro cadastro-pro" id="cadastro-profissional" onSubmit={enviar}>
      <h3>Cadastre o seu perfil</h3>
      <div className="fields">
        <label className="field">Nome<input name="nome" required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label className="field">E-mail<input name="email" type="email" required autoComplete="email" /></label>
        <label className="field">Conselho
          <select value={tipo} onChange={(e) => setTipo(e.target.value as "CRN" | "CREF")}>
            <option value="CRN">CRN (nutrição)</option>
            <option value="CREF">CREF (educação física)</option>
          </select>
        </label>
        <label className="field">Número do {tipo}<input name="registro" required maxLength={20} inputMode="numeric" /></label>
        <label className="field">UF<input name="uf" required minLength={2} maxLength={2} autoCapitalize="characters" /></label>
      </div>
      <label className="aceite" htmlFor="aceite-pro">
        <input id="aceite-pro" name="aceite" type="checkbox" required />
        <span>
          Li e aceito os <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a> e a{" "}
          <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>
          <span className="sr-only"> (abrem em nova aba)</span>.
        </span>
      </label>
      <Btn type="submit" disabled={enviando}>{enviando ? "Enviando…" : "Enviar cadastro"}</Btn>
      <p className={`cadastro-aviso ${aviso.tipo ? "is-" + aviso.tipo : ""}`} role="status">{aviso.texto}</p>
    </form>
  );
}
