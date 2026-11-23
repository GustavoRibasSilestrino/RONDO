/* Os mascotes da conta, no servidor (rotas /loja do backend): a coleção, o brownie de recompensa de cada missão e nível, a
   troca do mascote que a conta mostra e, desde 2026-11-19, o nome próprio dado com o lápis e a troca de repetidos. */
import { chamar } from './cliente';

/* `xp` (desde 2026-11-23): o XP do mascote, de onde sai o nível dele (lib/nivelMascote.ts). Só o mascote escolhido ganha XP */
export type MascoteDaColecao = { linha: number; coluna: number; raridade: string; quantidade: number; nome?: string | null; xp?: number };
/* `lapis`: lápis guardados na conta (comprados na loja do site); cada um dá um nome próprio a um mascote */
export type Colecao = { total: number; mascotes: MascoteDaColecao[]; escolhido: string | null; lapis?: number };
export type Recompensa = { chave: string; nova: boolean; mascote: MascoteDaColecao };

export const lerColecao = () => chamar<Colecao>('GET', '/loja/colecao');

/* `chave`: "missao:<id>" ou "nivel:<n>". Pedir de novo a mesma chave devolve o mesmo brownie, com `nova` falso */
export const pedirRecompensa = (chave: string) => chamar<Recompensa>('POST', '/loja/recompensa', { chave });

const casa = (chave: string) => { const [linha, coluna] = chave.split('-').map(Number); return { linha, coluna }; };

/* ---------- o XP do mascote escolhido ----------
   O app manda a hora em que os últimos treinos terminaram (em milissegundos) e o servidor dá 30 XP ao mascote escolhido por
   treino que ainda não contou; mandar os mesmos de novo não soma outra vez. O XP das missões o servidor já dá junto com o
   brownie. `mascote`: quem ganhou ("linha-coluna"; null = a conta não mostra nenhum); `ganho`: o XP deste pedido. */
export type XpDosTreinos = { mascote: string | null; ganho: number; xp: number };
const ouvintesDeXp = new Set<() => void>();
/* para a aba Coleção se atualizar quando o mascote ganha XP; devolve a função que cancela */
export const aoGanharXp = (fn: () => void) => { ouvintesDeXp.add(fn); return () => { ouvintesDeXp.delete(fn); }; };
export async function contarTreinos(fins: number[]): Promise<XpDosTreinos> {
  const r = await chamar<XpDosTreinos>('POST', '/loja/xp', { treinos: fins });
  if (r.ganho > 0) ouvintesDeXp.forEach((fn) => fn());
  return r;
}

/* null = não mostrar mascote nenhum */
export const escolherMascote = (chave: string | null) => {
  const { linha, coluna } = chave ? casa(chave) : { linha: null, coluna: null };
  return chamar<void>('PUT', '/loja/mascote', { linha, coluna });
};

/* dá um nome próprio ao mascote da coleção; gasta um lápis. Devolve o nome como ficou guardado e os lápis que sobraram */
export const darNome = (chave: string, nome: string) =>
  chamar<{ linha: number; coluna: number; nome: string; lapis: number }>('PUT', '/loja/nome', { ...casa(chave), nome });

/* ---------- troca de repetidos ----------
   Só repetidos entram, dos dois lados: quem propõe oferece um repetido seu e pede um repetido da outra pessoa. */
export type Casa = { linha: number; coluna: number };
export type PessoaDaTroca = { id: number; nome: string; arroba: string | null; foto: string | null };
export type Troca = { id: number; estado: 'pendente' | 'aceita' | 'recusada' | 'cancelada'; recebida: boolean; pessoa: PessoaDaTroca; dou: Casa; recebo: Casa; criada_em: string };

export const lerRepetidosDe = (pessoaId: number) => chamar<{ pessoa: PessoaDaTroca; mascotes: MascoteDaColecao[] }>('GET', `/loja/repetidos/${pessoaId}`);
export const lerTrocas = () => chamar<{ trocas: Troca[]; pendentes_recebidas: number }>('GET', '/loja/trocas');
export const proporTroca = (paraId: number, ofereco: string, peco: string) =>
  chamar<Troca>('POST', '/loja/trocas', { para_id: paraId, ofereco: casa(ofereco), peco: casa(peco) });
export const responderTroca = (id: number, acao: 'aceitar' | 'recusar' | 'cancelar') => chamar<Troca>('POST', `/loja/trocas/${id}/${acao}`);
