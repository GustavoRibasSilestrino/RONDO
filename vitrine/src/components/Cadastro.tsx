import { useState } from "react";
import { cadastrarProfissional, criarConta, ErroApi } from "../lib/api";
import { Btn } from "./ui";

type Estado = { tipo: "ok" | "erro" | ""; texto: string };
const VAZIO: Estado = { tipo: "", texto: "" };
const mensagem = (e: unknown) => (e instanceof ErroApi ? e.message : "Não foi possível enviar agora. Tente de novo.");

const hoje = () => new Date().toISOString().slice(0, 10);
function idade(nascimento: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return null;
  const [a, m, d] = nascimento.split("-").map(Number), h = new Date();
  return h.getFullYear() - a - (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d) ? 1 : 0);
}

/* o aceite: desmarcado, obrigatório, com os documentos abrindo em outra aba (o formulário não se perde) */
function AceiteDocumentos({ id }: { id: string }) {
  return (
    <label className="aceite" htmlFor={id}>
      <input id={id} name="aceite" type="checkbox" required />
      <span>
        Li e aceito os <a href="/termos" target="_blank" rel="noopener">Termos de Uso</a> e a{" "}
        <a href="/privacidade" target="_blank" rel="noopener">Política de Privacidade</a>
        <span className="sr-only"> (abrem em nova aba)</span>, e autorizo o tratamento dos meus dados de saúde
        (treinos, alimentação, água e peso) para as funções do app.
      </span>
    </label>
  );
}

/* ---------- conta de praticante: o app entra com o e-mail e a senha criados aqui ---------- */
export function CriarConta() {
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Estado>(VAZIO);
  const [nascimento, setNascimento] = useState("");
  const anos = idade(nascimento);
  const menor = anos !== null && anos < 18;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;   // já está enviando: o segundo clique não manda de novo
    const form = e.currentTarget;
    const f = new FormData(form);
    setEnviando(true);
    setAviso(VAZIO);
    try {
      await criarConta({
        nome: String(f.get("nome")), email: String(f.get("email")), senha: String(f.get("senha")),
        nascimento, aceita_termos: f.get("aceite") === "on", aceita_privacidade: f.get("aceite") === "on",
        marketing: f.get("marketing") === "on",
        responsavel: menor
          ? { nome: String(f.get("resp_nome")), email: String(f.get("resp_email")), autoriza: f.get("resp_autoriza") === "on" }
          : null,
        origem: "site",
      });
      form.reset();
      setNascimento("");
      setAviso({ tipo: "ok", texto: "Conta criada. Entre no app com esse e-mail e a sua senha." });
    } catch (err) {
      setAviso({ tipo: "erro", texto: mensagem(err) });
    }
    setEnviando(false);
  }

  return (
    <form className="cadastro" onSubmit={enviar}>
      <label className="field">Nome<input name="nome" required minLength={2} maxLength={120} autoComplete="name" /></label>
      <label className="field">E-mail<input name="email" type="email" required autoComplete="email" /></label>
      <label className="field">Senha<input name="senha" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
      <label className="field">Data de nascimento
        <input name="nascimento" type="date" required min="1900-01-01" max={hoje()} value={nascimento} onChange={(e) => setNascimento(e.target.value)} aria-describedby="nasc-ajuda" />
      </label>
      <p id="nasc-ajuda" className="cadastro-ajuda">Só para saber se é preciso a autorização de um responsável.</p>

      {menor ? (
        <fieldset className="responsavel">
          <legend>Autorização do responsável</legend>
          <p className="cadastro-ajuda">Quem tem menos de 18 anos precisa da autorização de um dos pais ou responsável. Peça para ele preencher.</p>
          <label className="field">Nome do responsável<input name="resp_nome" required minLength={2} maxLength={120} /></label>
          <label className="field">E-mail do responsável<input name="resp_email" type="email" required /></label>
          <label className="aceite">
            <input name="resp_autoriza" type="checkbox" required />
            <span>Sou o pai, a mãe ou o responsável legal e autorizo a criação da conta e o tratamento dos dados, como descrito na Política de Privacidade.</span>
          </label>
        </fieldset>
      ) : null}

      <AceiteDocumentos id="aceite-conta" />
      <label className="aceite">
        <input name="marketing" type="checkbox" />
        <span>Quero receber e-mails de novidades do RONDO (opcional; dá para sair quando quiser).</span>
      </label>
      <Btn type="submit" disabled={enviando}>{enviando ? "Criando…" : "Criar conta"}</Btn>
      <p className={`cadastro-aviso ${aviso.tipo ? "is-" + aviso.tipo : ""}`} role="status">{aviso.texto}</p>
    </form>
  );
}

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
