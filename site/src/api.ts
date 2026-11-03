const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function post<T>(caminho: string, corpo: unknown): Promise<T> {
  const resp = await fetch(`${API}${caminho}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!resp.ok) throw new Error(`Erro ${resp.status}`);
  return resp.json();
}

// O cartão nunca passa por aqui: só o token gerado pelo gateway no navegador.
export const criarAssinatura = (dados: { plano_id: string; token: string }) =>
  post<{ status: string }>("/assinaturas", dados);

export const cadastrarProfissional = (dados: {
  nome: string;
  email: string;
  tipo: "CRN" | "CREF";
  registro: string;
  uf: string;
}) => post<{ status: string }>("/profissionais", dados);
