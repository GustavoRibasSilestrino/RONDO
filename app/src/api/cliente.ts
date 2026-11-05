/* Chamadas à API do RONDO, já com o token da pessoa logada. A URL vem de EXPO_PUBLIC_API_URL. */
import { lerToken } from './sessao';

declare const process: { env: Record<string, string | undefined> };

export const URL_API = process.env.EXPO_PUBLIC_API_URL;

/* `status` 0 = sem conexão ou servidor não configurado; 401 = sessão vencida ou inválida */
export class ErroHttp extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

/* quem cuida da sessão (a loja) se registra aqui: qualquer chamada que volte 401 com token derruba a sessão vencida */
let aoVencer: (() => void) | null = null;
export const registrarSessaoVencida = (f: (() => void) | null) => { aoVencer = f; };

export async function chamar<T>(metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', caminho: string, corpo?: unknown): Promise<T> {
  if (!URL_API) throw new ErroHttp(0, 'O servidor do RONDO não está configurado neste aparelho.');
  const token = await lerToken();
  let resposta: Response;
  try {
    resposta = await fetch(`${URL_API}${caminho}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroHttp(0, 'Sem conexão. Tente de novo em instantes.');
  }
  if (resposta.status === 401 && token) aoVencer?.();
  if (!resposta.ok) {
    let mensagem = 'Não foi possível concluir agora. Tente de novo.';
    try {
      const d = (await resposta.json()) as { detail?: unknown };
      if (typeof d.detail === 'string') mensagem = d.detail;
      else if (Array.isArray(d.detail) && d.detail[0] && typeof (d.detail[0] as { msg?: unknown }).msg === 'string') mensagem = String((d.detail[0] as { msg: string }).msg).replace(/^Value error, /, '');
    } catch { /* corpo sem JSON: fica a mensagem padrão */ }
    throw new ErroHttp(resposta.status, mensagem);
  }
  return (await resposta.json()) as T;
}
