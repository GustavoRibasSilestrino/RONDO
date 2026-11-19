/* Os mascotes (os browniezinhos): os mesmos 69 da loja do site (vitrine/src/data/loja.ts), na mesma folha de arte
   (assets/mascotes.webp, cópia de vitrine/src/assets/loja/mascotes.webp). Desde 2026-11-19 eles são também a recompensa do
   app, no lugar das medalhas: cada missão cumprida e cada nível de conta dão um brownie, e a raridade sobe com o caminho
   (o sorteio é do servidor: backend/app/servicos/loja.py, `recompensar`). O mascote que a conta escolhe aparece ao lado da
   foto, nas publicações e passeando pelo app. Se mudar a folha ou os nomes no site, mude aqui também. */
import type { ImageSourcePropType } from 'react-native';

export const FOLHA_MASCOTES: ImageSourcePropType = require('../../assets/mascotes.webp');

export type Raridade = 'comum' | 'incomum' | 'rara' | 'epica' | 'lendaria';

/* a ordem é a das linhas da folha: comum em cima, lendária embaixo; a cor de cada uma é a do brilho atrás do mascote */
export const RARIDADES: { id: Raridade; nome: string; estrelas: number; quantos: number; cor: string }[] = [
  { id: 'comum', nome: 'Comum', estrelas: 1, quantos: 13, cor: '#9ca3af' },
  { id: 'incomum', nome: 'Incomum', estrelas: 2, quantos: 14, cor: '#4ade80' },
  { id: 'rara', nome: 'Rara', estrelas: 3, quantos: 14, cor: '#60a5fa' },
  { id: 'epica', nome: 'Épica', estrelas: 4, quantos: 14, cor: '#c084fc' },
  { id: 'lendaria', nome: 'Lendária', estrelas: 5, quantos: 14, cor: '#fbbf24' },
];
/* a folha tem 14 colunas por 5 linhas de células iguais (127 x 130 px cada); a linha dos comuns tem 13 */
export const FOLHA = { colunas: 14, linhas: 5, celula: [127, 130] as const };
export const TOTAL_MASCOTES = RARIDADES.reduce((a, r) => a + r.quantos, 0);   // 69

const NOMES: string[][] = [
  ['Browraiz', 'Browpolicial', 'Browchef', 'Browmaneiro', 'Browpiloto', 'BrowDJ', 'Browanjo', 'Brownoel', 'Browcaubói', 'Browmago', 'Browpolar', 'Browsapo', 'Browgamer'],
  ['Browpedreiro', 'Browdelegado', 'Browenfermeiro', 'Browabóbora', 'Browfantasma', 'Browalien', 'Browdiabinho', 'Browgato', 'Browpirata', 'Browcavaleiro', 'Browcoelho', 'Browurso', 'Browsafira', 'Browdino'],
  ['Browrei', 'Browquerubim', 'Browastronauta', 'Browgelo', 'Browfogo', 'Browcoringa', 'Browcristal', 'Browfeiticeiro', 'Browfaraó', 'Browvampiro', 'Browfera', 'Browcoral', 'Browrena', 'Browpanda'],
  ['Browfênix', 'Browhacker', 'Browcosmonauta', 'Browvalquíria', 'Browcupido', 'Browinferno', 'Browgeada', 'Browarquimago', 'Browametista', 'Browsamurai', 'Browunicórnio', 'Browninja', 'Browmagma', 'Browrubi'],
  ['Browimperador', 'Browramsés', 'Browsolar', 'Browdivino', 'Browdragão', 'Browceleste', 'Browneon', 'Browtrevas', 'Browglacial', 'Browdiamante', 'Browdemônio', 'Browciber', 'Browglitch', 'Browsombra'],
];

export type MascoteInfo = { chave: string; linha: number; coluna: number; nome: string; numero: number; raridade: (typeof RARIDADES)[number] };

/* "2-7" (como o servidor guarda) vira o mascote; uma chave estranha ou vazia vira null */
export function mascoteDe(chave: string | null | undefined): MascoteInfo | null {
  const m = /^(\d)-(\d{1,2})$/.exec(chave ?? '');
  if (!m) return null;
  const linha = Number(m[1]), coluna = Number(m[2]);
  const r = RARIDADES[linha];
  if (!r || coluna >= r.quantos) return null;
  const numero = RARIDADES.slice(0, linha).reduce((a, x) => a + x.quantos, 0) + coluna + 1;
  return { chave: `${linha}-${coluna}`, linha, coluna, nome: NOMES[linha][coluna] ?? 'Brownie', numero, raridade: r };
}

/* todos os mascotes, na ordem da coleção (1 a 69) */
export const TODOS_MASCOTES: MascoteInfo[] = RARIDADES.flatMap((r, linha) => Array.from({ length: r.quantos }, (_, coluna) => mascoteDe(`${linha}-${coluna}`)!));
