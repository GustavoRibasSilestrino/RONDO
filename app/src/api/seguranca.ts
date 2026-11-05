/* Segurança da conta: alterar a senha.
   Em modo demonstração (sem EXPO_PUBLIC_API_URL) só valida e responde, porque a senha nunca é guardada no aparelho.
   Com a API configurada, a troca de senha ainda não está ligada: o servidor não tem essa rota. */
declare const process: { env: Record<string, string | undefined> };

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
  if (process.env.EXPO_PUBLIC_API_URL) {
    throw new Error('A troca de senha ainda não está ligada ao servidor. Tente pelo site da RONDO.');
  }
  await new Promise((r) => setTimeout(r, 450));   // simula a ida ao servidor
  if (atual === nova) throw new Error('A nova senha precisa ser diferente da atual.');
}
