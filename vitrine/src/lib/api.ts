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
  if (resp.status === 422) throw new ErroApi("Confira os dados e tente de novo.");
  if (!resp.ok) throw new ErroApi("Não foi possível enviar agora. Tente de novo.");
  return resp.json() as Promise<T>;
}

export const criarConta = (d: { nome: string; email: string; senha: string }) =>
  enviar<{ email: string; nome: string }>("/auth/cadastro", d);

export const cadastrarProfissional = (d: { nome: string; email: string; tipo: "CRN" | "CREF"; registro: string; uf: string }) =>
  enviar<{ status: string }>("/profissionais", d);
