/* Segurança da conta: alterar a senha. O app valida os campos e o servidor confere a senha atual (POST /auth/senha). */
import { guardarToken } from './sessao';
import { trocarSenhaNoServidor } from './sincronia';

export const SENHA_MIN = 8;          // senha nova: pelo menos 8 caracteres (o servidor confere também)
const SENHA_MIN_ANTIGA = 6;          // contas criadas antes podem ter senha de 6 ou 7: a senha atual é aceita assim

export function validarNovaSenha(atual: string, nova: string, repetida: string): { atual?: string; nova?: string; repetida?: string } {
  const erros: { atual?: string; nova?: string; repetida?: string } = {};
  if (atual.length < SENHA_MIN_ANTIGA) erros.atual = 'Digite a sua senha atual.';
  if (nova.length < SENHA_MIN) erros.nova = `A nova senha tem pelo menos ${SENHA_MIN} caracteres.`;
  else if (nova === atual) erros.nova = 'A nova senha precisa ser diferente da atual.';
  if (repetida !== nova) erros.repetida = 'As senhas não são iguais.';
  return erros;
}

export async function alterarSenha(atual: string, nova: string): Promise<void> {
  /* ao trocar a senha, o servidor invalida todos os tokens antigos (outros aparelhos saem) e devolve um novo para este */
  const r = await trocarSenhaNoServidor(atual, nova);
  if (r?.token) await guardarToken(r.token);
}
