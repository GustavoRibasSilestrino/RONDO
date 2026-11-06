/* Entrar com a conta: chama POST {API}/auth/login no backend (FastAPI). A URL vem de EXPO_PUBLIC_API_URL.
   Não há mais modo de demonstração nem contas de mentira. A senha nunca é guardada. */
import type { Usuario } from '../tipos';
import { guardarToken } from './sessao';

declare const process: { env: Record<string, string | undefined> };


const nomeDoEmail = (email: string): string => {
  const base = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Você';
};

export async function entrar(email: string, senha: string): Promise<Usuario> {
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Digite um e-mail válido.');
  if (senha.length < 6) throw new Error('A senha tem pelo menos 6 caracteres.');

  const api = process.env.EXPO_PUBLIC_API_URL;
  if (api) {
    let resposta: Response;
    try {
      resposta = await fetch(`${api}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });
    } catch {
      throw new Error('Sem conexão. Tente de novo em instantes.');
    }
    if (resposta.status === 401 || resposta.status === 403) throw new Error('E-mail ou senha incorretos.');
    if (!resposta.ok) throw new Error('Não foi possível entrar agora. Tente de novo.');
    const dados = (await resposta.json()) as { email?: string; nome?: string; token?: string; papel?: string; verificado?: boolean; pro?: boolean; marketing?: boolean; selo?: string | null; arroba?: string | null; foto?: string | null };
    if (dados.token) await guardarToken(dados.token);
    return { email: dados.email ?? email, nome: dados.nome ?? nomeDoEmail(email), papel: dados.papel, verificado: dados.verificado, pro: dados.pro, marketing: dados.marketing, selo: dados.selo, arroba: dados.arroba ?? undefined, foto: dados.foto ?? undefined };
  }

  throw new Error('O servidor do RONDO não está configurado neste aparelho.');
}

/* Criar a conta pelo próprio app: POST {API}/auth/cadastro, com a data de nascimento, o aceite dos documentos e,
   para menores de 18 anos, a autorização do responsável. O servidor registra o aceite e devolve o token: já entra. */
export type NovaConta = {
  nome: string; email: string; senha: string; nascimento: string;   // nascimento em AAAA-MM-DD
  aceita: boolean; marketing: boolean;
  responsavel: { nome: string; email: string; autoriza: boolean } | null;
};

export async function cadastrar(d: NovaConta): Promise<Usuario> {
  const api = process.env.EXPO_PUBLIC_API_URL;
  if (!api) throw new Error('O servidor do RONDO não está configurado neste aparelho.');
  let resposta: Response;
  try {
    resposta = await fetch(`${api}/auth/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: d.nome.trim(), email: d.email.trim(), senha: d.senha, nascimento: d.nascimento,
        aceita_termos: d.aceita, aceita_privacidade: d.aceita, marketing: d.marketing,
        responsavel: d.responsavel, origem: 'app',
      }),
    });
  } catch {
    throw new Error('Sem conexão. Tente de novo em instantes.');
  }
  if (resposta.status === 409) throw new Error('Este e-mail já tem conta. Volte e entre com ele.');
  if (!resposta.ok) {
    let mensagem = 'Não foi possível criar a conta agora. Tente de novo.';
    try {
      const corpo = (await resposta.json()) as { detail?: unknown };
      const det = corpo.detail;
      if (typeof det === 'string') mensagem = det;
      else if (Array.isArray(det) && det[0] && typeof (det[0] as { msg?: unknown }).msg === 'string') mensagem = String((det[0] as { msg: string }).msg).replace(/^Value error, /, '');
    } catch { /* resposta sem corpo */ }
    throw new Error(mensagem);
  }
  const dados = (await resposta.json()) as { email: string; nome: string; token?: string; papel?: string; verificado?: boolean; pro?: boolean; marketing?: boolean; selo?: string | null; arroba?: string | null; foto?: string | null };
  if (dados.token) await guardarToken(dados.token);
  return { email: dados.email, nome: dados.nome, papel: dados.papel, verificado: dados.verificado, pro: dados.pro, marketing: dados.marketing, selo: dados.selo, arroba: dados.arroba ?? undefined, foto: dados.foto ?? undefined };
}
