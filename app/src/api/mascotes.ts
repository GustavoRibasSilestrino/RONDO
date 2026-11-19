/* Os mascotes da conta, no servidor (rotas /loja do backend): a coleção, o brownie de recompensa de cada missão e nível e
   a troca do mascote que a conta mostra. */
import { chamar } from './cliente';

export type MascoteDaColecao = { linha: number; coluna: number; raridade: string; quantidade: number };
export type Colecao = { total: number; mascotes: MascoteDaColecao[]; escolhido: string | null };
export type Recompensa = { chave: string; nova: boolean; mascote: MascoteDaColecao };

export const lerColecao = () => chamar<Colecao>('GET', '/loja/colecao');

/* `chave`: "missao:<id>" ou "nivel:<n>". Pedir de novo a mesma chave devolve o mesmo brownie, com `nova` falso */
export const pedirRecompensa = (chave: string) => chamar<Recompensa>('POST', '/loja/recompensa', { chave });

/* null = não mostrar mascote nenhum */
export const escolherMascote = (chave: string | null) => {
  const [linha, coluna] = chave ? chave.split('-').map(Number) : [null, null];
  return chamar<void>('PUT', '/loja/mascote', { linha, coluna });
};
