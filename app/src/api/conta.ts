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
    const dados = (await resposta.json()) as { email?: string; nome?: string; token?: string; papel?: string; verificado?: boolean; pro?: boolean };
    if (dados.token) await guardarToken(dados.token);
    return { email: dados.email ?? email, nome: dados.nome ?? nomeDoEmail(email), papel: dados.papel, verificado: dados.verificado, pro: dados.pro };
  }

  throw new Error('O servidor do RONDO não está configurado neste aparelho.');
}
