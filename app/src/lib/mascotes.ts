/* Os mascotes (os browniezinhos): os mesmos 66 da loja do site (vitrine/src/data/loja.ts), na mesma folha de arte
   (assets/mascotes.webp, cópia de vitrine/src/assets/loja/mascotes.webp). Desde 2026-11-19 eles são também a recompensa do
   app, no lugar das medalhas: cada missão cumprida e cada nível de conta dão um brownie, e a raridade sobe com o caminho
   (o sorteio é do servidor: backend/app/servicos/loja.py, `recompensar`). O mascote que a conta escolhe aparece ao lado da
   foto, nas publicações e passeando pelo app. Se mudar a folha ou os nomes no site, mude aqui também. */
import type { ImageSourcePropType } from 'react-native';

export const FOLHA_MASCOTES: ImageSourcePropType = require('../../assets/mascotes.webp');
/* a mesma folha em tons de cinza: os mascotes que a conta ainda não tem aparecem assim (pedido do dono, 2026-11-19) */
export const FOLHA_MASCOTES_CINZA: ImageSourcePropType = require('../../assets/mascotes-cinza.webp');

export type Raridade = 'comum' | 'incomum' | 'rara' | 'epica' | 'lendaria';

/* a ordem é a das linhas da folha: comum em cima, lendária embaixo; a cor de cada uma é a do brilho atrás do mascote */
export const RARIDADES: { id: Raridade; nome: string; estrelas: number; quantos: number; cor: string }[] = [
  { id: 'comum', nome: 'Comum', estrelas: 1, quantos: 13, cor: '#9ca3af' },
  { id: 'incomum', nome: 'Incomum', estrelas: 2, quantos: 13, cor: '#4ade80' },   // 14 casas, uma vazia (o Browdiabinho saiu)
  { id: 'rara', nome: 'Rara', estrelas: 3, quantos: 14, cor: '#60a5fa' },
  { id: 'epica', nome: 'Épica', estrelas: 4, quantos: 13, cor: '#c084fc' },   // 14 casas, uma vazia (o Browinferno saiu)
  { id: 'lendaria', nome: 'Lendária', estrelas: 5, quantos: 13, cor: '#fbbf24' },   // 14 casas, uma vazia (o Browdemônio saiu)
];
/* a folha tem 14 colunas por 5 linhas de células iguais (160 x 176 px cada); a linha dos comuns tem 13. Desde 2026-11-19 é a
   pixel art de verdade, desenhada por código em brand/mascotes-pixel e montada por brand/mascotes-pixel/montar_folha.py,
   que grava a mesma folha aqui e no site */
export const FOLHA = { colunas: 14, linhas: 5, celula: [160, 176] as const };
export const TOTAL_MASCOTES = RARIDADES.reduce((a, r) => a + r.quantos, 0);   // 66

/* o nome de cada casa da folha; null é um mascote tirado a pedido do dono (a casa fica vazia e as chaves dos outros não
   mudam): o Browdiabinho, o Browinferno e o Browdemônio, em 2026-11-19. O servidor tira o mesmo (backend/app/servicos/loja.py, TIRADOS). */
const NOMES: (string | null)[][] = [
  ['Browraiz', 'Browpolicial', 'Browchef', 'Browmaneiro', 'Browpiloto', 'BrowDJ', 'Browanjo', 'Brownoel', 'Browcaubói', 'Browmago', 'Browpolar', 'Browsapo', 'Browgamer'],
  ['Browpedreiro', 'Browdelegado', 'Browenfermeiro', 'Browabóbora', 'Browfantasma', 'Browalien', null, 'Browgato', 'Browpirata', 'Browcavaleiro', 'Browcoelho', 'Browurso', 'Browsafira', 'Browdino'],
  ['Browrei', 'Browquerubim', 'Browastronauta', 'Browgelo', 'Browfogo', 'Browcoringa', 'Browcristal', 'Browfeiticeiro', 'Browfaraó', 'Browvampiro', 'Browfera', 'Browcoral', 'Browrena', 'Browpanda'],
  ['Browfênix', 'Browhacker', 'Browcosmonauta', 'Browvalquíria', 'Browcupido', null, 'Browgeada', 'Browarquimago', 'Browametista', 'Browsamurai', 'Browunicórnio', 'Browninja', 'Browmagma', 'Browrubi'],
  ['Browimperador', 'Browramsés', 'Browsolar', 'Browdivino', 'Browdragão', 'Browceleste', 'Browneon', 'Browtrevas', 'Browglacial', 'Browdiamante', null, 'Browciber', 'Browglitch', 'Browsombra'],
];

/* as colunas da folha que têm mascote, em cada linha */
const COLUNAS: number[][] = NOMES.map((linha) => linha.flatMap((nome, coluna) => (nome ? [coluna] : [])));

export type MascoteInfo = { chave: string; linha: number; coluna: number; nome: string; numero: number; raridade: (typeof RARIDADES)[number] };

/* "2-7" (como o servidor guarda) vira o mascote; uma chave estranha ou vazia vira null */
export function mascoteDe(chave: string | null | undefined): MascoteInfo | null {
  const m = /^(\d)-(\d{1,2})$/.exec(chave ?? '');
  if (!m) return null;
  const linha = Number(m[1]), coluna = Number(m[2]);
  const r = RARIDADES[linha];
  const nome = NOMES[linha]?.[coluna];
  if (!r || !nome) return null;   // fora da folha ou um mascote tirado
  const numero = RARIDADES.slice(0, linha).reduce((a, x) => a + x.quantos, 0) + COLUNAS[linha].indexOf(coluna) + 1;
  return { chave: `${linha}-${coluna}`, linha, coluna, nome, numero, raridade: r };
}

/* todos os mascotes, na ordem da coleção (1 a 66) */
export const TODOS_MASCOTES: MascoteInfo[] = RARIDADES.flatMap((_, linha) => COLUNAS[linha].map((coluna) => mascoteDe(`${linha}-${coluna}`)!));
