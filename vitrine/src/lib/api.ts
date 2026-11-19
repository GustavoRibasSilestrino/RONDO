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

/* ---------- chamadas com a resposta do servidor em português ----------
   O servidor explica o que deu errado em `detail` (texto, ou a lista do Pydantic quando um campo não passa). */
const CAMPO: Record<string, string> = {
  email: "Confira o e-mail.",
  senha: "A senha precisa ter pelo menos 8 caracteres.",
  nome: "O nome precisa ter pelo menos 2 letras.",
  nascimento: "Confira a data de nascimento.",
};

async function chamar<T>(metodo: "GET" | "POST", caminho: string, corpo?: unknown, token?: string | null): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${API}${caminho}`, {
      method: metodo,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo ? { "Content-Type": "application/json" } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi("Sem conexão. Confira a internet e tente de novo.");
  }
  if (r.ok) return r.json() as Promise<T>;
  let msg = "Não deu agora. Tente de novo em instantes.";
  try {
    const d = (await r.json()) as { detail?: string | { loc?: (string | number)[]; msg?: string }[] };
    if (typeof d.detail === "string") msg = d.detail;
    else if (Array.isArray(d.detail) && d.detail[0]) {
      const loc = d.detail[0].loc ?? [];
      const campo = String(loc[loc.length - 1] ?? "");
      msg = CAMPO[campo] ?? (d.detail[0].msg ?? msg).replace(/^Value error, /, "");
    }
  } catch { /* resposta sem corpo */ }
  if (r.status === 429 && msg.startsWith("Não deu")) msg = "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  if (r.status === 503) msg = "Esse jeito de entrar ainda não está disponível. Use o e-mail e a senha.";
  throw new ErroApi(msg, r.status);
}

/* ---------- entrar e criar conta pelo site (a tela do RONDIN, components/Entrar.tsx) ---------- */
export type ContaLogada = { email: string; nome: string; arroba: string | null; foto: string | null; papel?: string; pro?: boolean; token: string };
export type Responsavel = { nome: string; email: string; autoriza: boolean };
export type DadosDoCadastro = { nascimento: string; aceita_termos: boolean; aceita_privacidade: boolean; marketing: boolean; responsavel: Responsavel | null };

export const entrarComSenha = (email: string, senha: string) => chamar<ContaLogada>("POST", "/auth/login", { email, senha });
export const cadastrarPeloSite = (d: DadosDoCadastro & { nome: string; email: string; senha: string }) =>
  chamar<ContaLogada>("POST", "/auth/cadastro", { ...d, origem: "site" });

/* Google: quem já tem conta entra direto; na primeira vez, falta a data de nascimento e o aceite (segunda etapa) */
export type RespostaGoogle = { precisa_cadastro: boolean; login: ContaLogada | null; token_social: string | null; nome: string | null; email: string | null };
export const entrarComGoogle = (idToken: string) => chamar<RespostaGoogle>("POST", "/auth/google", { id_token: idToken });
export const concluirCadastroGoogle = (d: DadosDoCadastro & { token_social: string; nome: string | null }) =>
  chamar<ContaLogada>("POST", "/auth/social/cadastro", { ...d, origem: "site" });

/* ---------- loja de pacotinhos (backend/app/rotas/loja.py) ----------
   Comprar e ver a coleção pedem a conta (o token da sessão, o mesmo do app; ver lib/conta.ts). */
export type MascoteDaConta = { linha: number; coluna: number; raridade: Raridade; quantidade: number };

/* compra (abre) um pacote: o servidor sorteia o mascote e ele já vai para a conta */
export const abrirPacote = (token: string, pacote: PacoteId) => chamar<MascoteDaConta>("POST", "/loja/abrir", { pacote }, token);
export const minhaColecao = (token: string) => chamar<{ total: number; mascotes: MascoteDaConta[] }>("GET", "/loja/colecao", undefined, token);
