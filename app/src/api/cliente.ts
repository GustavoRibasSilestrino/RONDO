/* Chamadas à API do RONDO, já com o token da pessoa logada. A URL vem de EXPO_PUBLIC_API_URL. */
import { Alert, Platform } from 'react-native';
import { lerToken } from './sessao';

declare const process: { env: Record<string, string | undefined> };

export const URL_API = process.env.EXPO_PUBLIC_API_URL;

/* O servidor do plano grátis dorme depois de uns 15 minutos parado e leva de 30 a 60 s para acordar: era isso que fazia o primeiro
   login demorar tanto. Esta chamada, feita assim que a primeira tela abre, acorda o servidor enquanto a pessoa ainda está lendo ou
   digitando. A resposta não importa; falhar não faz mal. */
let aquecida = false;
export function aquecerApi(): void {
  if (aquecida || !URL_API) return;
  aquecida = true;
  fetch(`${URL_API}/saude`).catch(() => { aquecida = false; });
}

/* `status` 0 = sem conexão ou servidor não configurado; 401 = sessão vencida ou inválida */
export class ErroHttp extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

let banimentoAvisado = false;
function avisarBanimento(mensagem: string): void {
  if (banimentoAvisado) return;
  banimentoAvisado = true;
  if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.alert(mensagem); } else Alert.alert('Conta banida', mensagem);
  aoVencer?.();
  setTimeout(() => { banimentoAvisado = false; }, 5000);
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
    /* conta banida pela política de conteúdo: avisa uma vez e sai da conta neste aparelho */
    if (resposta.status === 403 && token && /banida/i.test(mensagem)) avisarBanimento(mensagem);
    throw new ErroHttp(resposta.status, mensagem);
  }
  return (await resposta.json()) as T;
}
