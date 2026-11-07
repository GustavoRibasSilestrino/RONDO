/* Entrar com Google ou Apple. O provedor entrega um "id_token"; o servidor confere e responde de dois jeitos:
   a pessoa já tem conta (entra direto) ou é a primeira vez (falta a data de nascimento e o aceite dos documentos: segunda etapa). */
import type { Usuario } from '../tipos';
import { guardarToken } from './sessao';

declare const process: { env: Record<string, string | undefined> };

type LoginBruto = { email?: string; nome?: string; token?: string; papel?: string; verificado?: boolean; pro?: boolean; marketing?: boolean; selo?: string | null; arroba?: string | null; foto?: string | null };

export type ResultadoSocial =
  | { precisaCadastro: false; usuario: Usuario }
  | { precisaCadastro: true; tokenSocial: string; nome?: string; email: string };

async function usuarioDe(d: LoginBruto): Promise<Usuario> {
  if (d.token) await guardarToken(d.token);
  return { email: d.email ?? '', nome: d.nome ?? 'Você', papel: d.papel, verificado: d.verificado, pro: d.pro, marketing: d.marketing, selo: d.selo, arroba: d.arroba ?? undefined, foto: d.foto ?? undefined };
}

async function enviar(caminho: string, corpo: unknown): Promise<Response> {
  const api = process.env.EXPO_PUBLIC_API_URL;
  if (!api) throw new Error('O servidor do RONDO não está configurado neste aparelho.');
  try {
    return await fetch(`${api}${caminho}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  } catch {
    throw new Error('Sem conexão. Tente de novo em instantes.');
  }
}

async function erroDe(r: Response, padrao: string): Promise<Error> {
  if (r.status === 429) return new Error('Muitas tentativas em pouco tempo. Espere um minuto e tente de novo.');
  try {
    const d = (await r.json()) as { detail?: unknown };
    if (typeof d.detail === 'string') return new Error(d.detail);
  } catch { /* sem corpo legível */ }
  return new Error(padrao);
}

export async function entrarComProvedor(provedor: 'google' | 'apple', idToken: string): Promise<ResultadoSocial> {
  const r = await enviar(`/auth/${provedor}`, { id_token: idToken });
  if (!r.ok) throw await erroDe(r, 'Não foi possível entrar agora. Tente de novo.');
  const d = (await r.json()) as { precisa_cadastro: boolean; login: LoginBruto | null; token_social: string | null; nome: string | null; email: string | null };
  if (d.precisa_cadastro && d.token_social) return { precisaCadastro: true, tokenSocial: d.token_social, nome: d.nome ?? undefined, email: d.email ?? '' };
  if (!d.login) throw new Error('Não foi possível entrar agora. Tente de novo.');
  return { precisaCadastro: false, usuario: await usuarioDe(d.login) };
}

export type CadastroSocial = {
  tokenSocial: string; nascimento: string; marketing: boolean;   // nascimento em AAAA-MM-DD
  responsavel: { nome: string; email: string; autoriza: boolean } | null;
};

export async function concluirCadastroSocial(d: CadastroSocial): Promise<Usuario> {
  const r = await enviar('/auth/social/cadastro', {
    token_social: d.tokenSocial, nascimento: d.nascimento, aceita_termos: true, aceita_privacidade: true, marketing: d.marketing, responsavel: d.responsavel, origem: 'app',
  });
  if (!r.ok) throw await erroDe(r, 'Não foi possível criar a conta agora. Tente de novo.');
  return usuarioDe((await r.json()) as LoginBruto);
}
