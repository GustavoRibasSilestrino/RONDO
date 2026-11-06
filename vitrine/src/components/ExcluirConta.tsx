/* Excluir a conta pelo site, sem precisar do app (exigência do Google Play e direito do titular na LGPD).
   Pede e-mail e senha, confirma e apaga tudo no servidor. */
import { useState } from "react";
import { ErroApi, excluirConta } from "../lib/api";
import { CONTATO, Pagina } from "./Legal";

export function ExcluirConta() {
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "erro">("");
  const [msg, setMsg] = useState("");

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEstado("enviando"); setMsg("");
    try {
      await excluirConta(String(f.get("email")).trim(), String(f.get("senha")));
      setEstado("ok");
      setMsg("Conta excluída. Todos os seus dados foram apagados do servidor.");
    } catch (err) {
      setEstado("erro");
      setMsg(err instanceof ErroApi ? err.message : "Não foi possível excluir agora.");
    }
  }

  return (
    <Pagina titulo="Excluir conta">
      <p>Aqui você exclui a sua conta do RONDO sem precisar do app. Também dá para fazer no app, em Configurações, Conta e segurança, Apagar conta.</p>
      <h2>O que é apagado</h2>
      <ul>
        <li>A conta: nome, e-mail, senha, data de nascimento e os registros de aceite.</li>
        <li>Os dados do app: treinos, dieta, água, peso e o resto que estava sincronizado.</li>
        <li>Publicações, fotos, comentários, cheers, stories, quem você segue e quem segue você, e os clubes que você criou.</li>
      </ul>
      <p>
        A exclusão é imediata e não dá para desfazer. Cópias de segurança do provedor do banco podem manter dados por um
        curto período, até serem substituídas. Os recados de voz ficam só no seu aparelho: apague o app para removê-los.
      </p>
      <h2>Excluir agora</h2>
      {estado === "ok" ? (
        <p className="legal-destaque" role="status">{msg}</p>
      ) : (
        <form className="cadastro excluir" onSubmit={enviar}>
          <label className="field">E-mail da conta<input name="email" type="email" required autoComplete="email" /></label>
          <label className="field">Senha<input name="senha" type="password" required autoComplete="current-password" /></label>
          <label className="aceite">
            <input type="checkbox" required />
            <span>Entendo que a conta e todos os dados serão apagados e que isso não pode ser desfeito.</span>
          </label>
          <button type="submit" className="btn btn-perigo" disabled={estado === "enviando"}>{estado === "enviando" ? "Excluindo…" : "Excluir minha conta"}</button>
          <p className={`cadastro-aviso ${estado === "erro" ? "is-erro" : ""}`} role="status">{estado === "erro" ? msg : ""}</p>
        </form>
      )}
      <p>
        Esqueceu a senha ou não consegue entrar? Escreva para <a href={`mailto:${CONTATO}?subject=Excluir%20minha%20conta`}>{CONTATO}</a>{" "}
        do e-mail da conta, pedindo a exclusão. Respondemos em até 15 dias.
      </p>
    </Pagina>
  );
}
