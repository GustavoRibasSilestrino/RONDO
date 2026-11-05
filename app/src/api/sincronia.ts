/* O que o app guarda no servidor: os dados pessoais (por chave), o perfil e a senha.
   `xpExtra` e `pro` ficam de fora de propósito: quem define é o servidor. */
import type { Estado } from '../tipos';
import { chamar } from './cliente';

export const CHAVES_SINCRONIZADAS = [
  'perfil', 'treinos', 'treinoAtual', 'rotinasProprias', 'refeicoes', 'agua', 'checkins', 'pesos',
  'perfilSocial',
  'recados', 'notificacoes', 'profissionais', 'storiesVistos', 'tema', 'nivelAvisado', 'medalhasAvisadas',
] as const satisfies readonly (keyof Estado)[];

export type ChaveSincronizada = (typeof CHAVES_SINCRONIZADAS)[number];

export const baixarDados = async (): Promise<Record<string, unknown>> =>
  (await chamar<{ itens: Record<string, unknown> }>('GET', '/me/dados')).itens;

export const enviarDados = (itens: Record<string, unknown>) => chamar<{ itens: Record<string, unknown> }>('PUT', '/me/dados', { itens });

export const salvarPerfilNoServidor = (dados: { nome?: string; arroba?: string; bio?: string }) =>
  chamar<{ nome: string; arroba: string | null; bio: string }>('PATCH', '/me/perfil', dados);

export const trocarSenhaNoServidor = (atual: string, nova: string) => chamar<{ status: string }>('POST', '/auth/senha', { atual, nova });
