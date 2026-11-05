/* Segurança da conta: alterar a senha. O app valida os campos e o servidor confere a senha atual (POST /auth/senha). */
import { trocarSenhaNoServidor } from './sincronia';

export const SENHA_MIN = 6;

export function validarNovaSenha(atual: string, nova: string, repetida: string): { atual?: string; nova?: string; repetida?: string } {
  const erros: { atual?: string; nova?: string; repetida?: string } = {};
  if (atual.length < SENHA_MIN) erros.atual = 'Digite a sua senha atual.';
  if (nova.length < SENHA_MIN) erros.nova = `A nova senha tem pelo menos ${SENHA_MIN} caracteres.`;
  else if (nova === atual) erros.nova = 'A nova senha precisa ser diferente da atual.';
  if (repetida !== nova) erros.repetida = 'As senhas não são iguais.';
  return erros;
}

export async function alterarSenha(atual: string, nova: string): Promise<void> {
  await trocarSenhaNoServidor(atual, nova);
}
