/* Segurança da conta: alterar a senha.
   O servidor ainda não tem a rota de troca de senha (hoje só há cadastro, entrada e /auth/eu), então o app valida os campos
   e avisa com clareza. Quando a rota existir, é só trocar o corpo de alterarSenha por uma chamada a ela. */
export const SENHA_MIN = 6;

export function validarNovaSenha(atual: string, nova: string, repetida: string): { atual?: string; nova?: string; repetida?: string } {
  const erros: { atual?: string; nova?: string; repetida?: string } = {};
  if (atual.length < SENHA_MIN) erros.atual = 'Digite a sua senha atual.';
  if (nova.length < SENHA_MIN) erros.nova = `A nova senha tem pelo menos ${SENHA_MIN} caracteres.`;
  else if (nova === atual) erros.nova = 'A nova senha precisa ser diferente da atual.';
  if (repetida !== nova) erros.repetida = 'As senhas não são iguais.';
  return erros;
}

export async function alterarSenha(_atual: string, _nova: string): Promise<void> {
  throw new Error('A troca de senha ainda não está disponível: o servidor ainda não tem essa função.');
}
