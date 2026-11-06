/* Cliente da API do RONDO. A URL vem de VITE_API_URL (definida em .env.production). */
const API = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export class ErroApi extends Error {}

async function enviar<T>(caminho: string, corpo: unknown): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(`${API}${caminho}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi("Sem conexão. Tente de novo em instantes.");
  }
  if (resp.status === 409) throw new ErroApi("Já existe um cadastro com esses dados.");
  if (resp.status === 422) {
    // o servidor explica o que faltou (ex.: aceite dos termos, autorização do responsável)
    let msg = "Confira os dados e tente de novo.";
    try {
      const d = (await resp.json()) as { detail?: { msg?: string }[] | string };
      const m = typeof d.detail === "string" ? d.detail : d.detail?.[0]?.msg;
      if (m) msg = m.replace(/^Value error, /, "");
    } catch { /* resposta sem corpo */ }
    throw new ErroApi(msg);
  }
  if (!resp.ok) throw new ErroApi("Não foi possível enviar agora. Tente de novo.");
  return resp.json() as Promise<T>;
}

export type NovaConta = {
  nome: string; email: string; senha: string; nascimento: string;
  aceita_termos: boolean; aceita_privacidade: boolean; marketing: boolean;
  responsavel: { nome: string; email: string; autoriza: boolean } | null;
  origem: "site";
};
export const criarConta = (d: NovaConta) =>
  enviar<{ email: string; nome: string }>("/auth/cadastro", d);

export const cadastrarProfissional = (d: {
  nome: string; email: string; tipo: "CRN" | "CREF"; registro: string; uf: string; aceita_termos: boolean; aceita_privacidade: boolean;
}) =>
  enviar<{ status: string }>("/profissionais", d);

/* excluir a conta pelo site (sem o app): entra com e-mail e senha e apaga tudo no servidor */
export async function excluirConta(email: string, senha: string): Promise<void> {
  let r: Response;
  try {
    r = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, senha }) });
  } catch {
    throw new ErroApi("Sem conexão. Tente de novo em instantes.");
  }
  if (r.status === 401) throw new ErroApi("E-mail ou senha incorretos.");
  if (!r.ok) throw new ErroApi("Não foi possível entrar agora. Tente de novo.");
  const { token } = (await r.json()) as { token: string };
  try {
    r = await fetch(`${API}/me`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ senha }),
    });
  } catch {
    throw new ErroApi("Sem conexão. Tente de novo em instantes.");
  }
  if (!r.ok) throw new ErroApi("Não foi possível excluir agora. Tente de novo ou escreva para o nosso e-mail.");
}
