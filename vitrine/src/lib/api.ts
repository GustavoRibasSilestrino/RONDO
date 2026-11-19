/* Cliente da API do RONDO. A URL vem de VITE_API_URL (definida em .env.production). */
import type { PacoteId, Raridade } from "../data/loja";

export const API = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export class ErroApi extends Error {
  readonly status: number;   // a resposta do servidor (0 = sem resposta)
  constructor(mensagem: string, status = 0) { super(mensagem); this.status = status; }
}

/* O servidor do plano grátis do Render dorme depois de 15 minutos parado e leva de 30 a 60 s para acordar: era isso que deixava
   o "Entrar" do app tão lento (2026-11-17). O site o acorda assim que a página abre: enquanto a pessoa lê o site e assiste à
   apresentação do RONDIN, ele já está ligando. A resposta não importa; falhar não faz mal. */
export function acordarServidor(): void {
  try { void fetch(`${API}/saude`, { cache: "no-store" }).catch(() => {}); } catch { /* sem rede: nada a fazer */ }
}

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

/* ---------- loja de pacotinhos (backend/app/rotas/loja.py) ----------
   Abrir não pede conta e devolve um código de resgate; resgatar e ver a coleção pedem a conta do app (o token que o app
   guardou no navegador; ver lib/conta.ts). */
export type MascoteDaConta = { linha: number; coluna: number; raridade: Raridade; quantidade: number };
export type PacoteAberto = { linha: number; coluna: number; raridade: Raridade; codigo: string; expira_em: string };

async function loja<T>(metodo: "GET" | "POST", caminho: string, token: string | null, corpo?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${API}${caminho}`, {
      method: metodo,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo ? { "Content-Type": "application/json" } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi("Sem conexão. Tente de novo em instantes.");
  }
  if (r.ok) return r.json() as Promise<T>;
  let msg = "Não deu agora. Tente de novo em instantes.";
  if (r.status === 401) msg = "A sua sessão venceu. Entre de novo na sua conta.";
  else if (r.status === 429) msg = "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  else if (r.status === 403 || r.status === 404 || r.status === 409) {
    try { const d = (await r.json()) as { detail?: unknown }; if (typeof d.detail === "string") msg = d.detail; } catch { /* sem corpo */ }
  }
  throw new ErroApi(msg, r.status);
}

/* abre um pacote: o servidor sorteia o mascote e devolve o código para resgatá-lo (vale 7 dias) */
export const abrirPacote = (pacote: PacoteId) => loja<PacoteAberto>("POST", "/loja/abrir", null, { pacote });
/* põe o mascote do código na conta */
export const resgatarCodigo = (token: string, codigo: string) => loja<MascoteDaConta>("POST", "/loja/resgatar", token, { codigo });
export const minhaColecao = (token: string) => loja<{ total: number; mascotes: MascoteDaConta[] }>("GET", "/loja/colecao", token);
