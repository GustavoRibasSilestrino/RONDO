/* Os mascotes (os browniezinhos): os mesmos 57 da loja do site (vitrine/src/data/loja.ts), na mesma folha de arte
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
  { id: 'comum', nome: 'Comum', estrelas: 1, quantos: 12, cor: '#9ca3af' },   // 13 casas, uma vazia (o Browpolicial saiu)
  { id: 'incomum', nome: 'Incomum', estrelas: 2, quantos: 13, cor: '#4ade80' },   // 14 casas, uma vazia (o Browdiabinho saiu)
  { id: 'rara', nome: 'Rara', estrelas: 3, quantos: 13, cor: '#60a5fa' },   // 14 casas, uma vazia (o Browgelo saiu)
  { id: 'epica', nome: 'Épica', estrelas: 4, quantos: 11, cor: '#c084fc' },   // 14 casas, três vazias (o Browinferno, o Browcosmonauta e o Browmagma saíram)
  { id: 'lendaria', nome: 'Lendária', estrelas: 5, quantos: 8, cor: '#fbbf24' },   // 14 casas, seis vazias (o Browdemônio, o Browglacial, o Browdiamante, o Browciber, o Browglitch e o Browsombra saíram)
];
/* a folha tem 14 colunas por 5 linhas de células iguais (160 x 176 de tamanho na tela); a linha dos comuns tem 13. Desde
   2026-11-25 cada mascote é o retrato do modelo 3D (brand/mascotes-voxel: exportar_todos.py tira os retratos e os modelos,
   montar_folha.py monta a folha em dobro, 320 x 352 por célula, aqui e no site). O modelo 3D de cada um fica em
   public/modelos/<chave>.glb, para a tela de girar (componentes/Visor3D.tsx). */
export const FOLHA = { colunas: 14, linhas: 5, celula: [160, 176] as const };
export const TOTAL_MASCOTES = RARIDADES.reduce((a, r) => a + r.quantos, 0);   // 57

/* o nome de cada casa da folha; null é um mascote tirado a pedido do dono (a casa fica vazia e as chaves dos outros não
   mudam): o Browdiabinho, o Browinferno e o Browdemônio, em 2026-11-19; e os nove que ficaram sem 3D (o Browpolicial,
   o Browgelo, o Browcosmonauta, o Browmagma, o Browglacial, o Browdiamante, o Browciber, o Browglitch e o Browsombra), em 2026-11-25. O servidor tira o mesmo (backend/app/servicos/loja.py, TIRADOS). */
const NOMES: (string | null)[][] = [
  ['Browraiz', null, 'Browchef', 'Browmaneiro', 'Browpiloto', 'BrowDJ', 'Browanjo', 'Brownoel', 'Browcaubói', 'Browmago', 'Browpolar', 'Browsapo', 'Browgamer'],
  ['Browpedreiro', 'Browdelegado', 'Browenfermeiro', 'Browabóbora', 'Browfantasma', 'Browalien', null, 'Browgato', 'Browpirata', 'Browcavaleiro', 'Browcoelho', 'Browurso', 'Browsafira', 'Browdino'],
  ['Browrei', 'Browquerubim', 'Browastronauta', null, 'Browfogo', 'Browcoringa', 'Browcristal', 'Browfeiticeiro', 'Browfaraó', 'Browvampiro', 'Browfera', 'Browcoral', 'Browrena', 'Browpanda'],
  ['Browfênix', 'Browhacker', null, 'Browvalquíria', 'Browcupido', null, 'Browgeada', 'Browarquimago', 'Browametista', 'Browsamurai', 'Browunicórnio', 'Browninja', null, 'Browrubi'],
  ['Browimperador', 'Browramsés', 'Browsolar', 'Browdivino', 'Browdragão', 'Browceleste', 'Browneon', 'Browtrevas', null, null, null, null, null, null],
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

/* a cor de destaque de cada mascote: a da roupa dele (o chapéu, a fantasia, a armadura), não a do pelo, que é o mesmo marrom em
   todos. Tirada da folha de arte e conferida a olho (2026-11-27, pedido do dono: o fundo da tela em 3D na cor de cada mascote).
   Quem é de branco ganhou o tom que acompanha a roupa (o dourado da auréola, o azul do urso polar, o lilás do fantasma). */
const COR: Record<string, string> = {
  '0-0': '#e8742a', '0-2': '#d33a3a', '0-3': '#d21d22', '0-4': '#2443cc', '0-5': '#862bd1', '0-6': '#f5d34a', '0-7': '#d42229',
  '0-8': '#c98a2b', '0-9': '#8429c5', '0-10': '#4a8fe0', '0-11': '#5fbf1c', '0-12': '#8720af',
  '1-0': '#f5d020', '1-1': '#3e3ca4', '1-2': '#cf353d', '1-3': '#f69b27', '1-4': '#8e9bc7', '1-5': '#7fc719', '1-7': '#8128c4',
  '1-8': '#c0181d', '1-9': '#7b8ba3', '1-10': '#ec5fa6', '1-11': '#2449b9', '1-12': '#2546c8', '1-13': '#1e9a3a',
  '2-0': '#f0bc20', '2-1': '#e3b53a', '2-2': '#8532c3', '2-4': '#f05a1a', '2-5': '#a325d6', '2-6': '#6c97d9', '2-7': '#6a2fc4',
  '2-8': '#e2a72a', '2-9': '#a3121a', '2-10': '#7a24b8', '2-11': '#e8453c', '2-12': '#ca1f23', '2-13': '#6b7280',
  '3-0': '#d0451b', '3-1': '#842cc5', '3-3': '#e0b020', '3-4': '#ee6fa0', '3-6': '#5fb4e0', '3-7': '#3a44c0', '3-8': '#7d35c0',
  '3-9': '#c41e24', '3-10': '#d977e8', '3-11': '#283a9e', '3-13': '#d1234f',
  '4-0': '#7a2fc2', '4-1': '#d9a21f', '4-2': '#f2b81f', '4-3': '#f7d73a', '4-4': '#d22a1c', '4-5': '#4a6ee0', '4-6': '#e936c8', '4-7': '#5a1e94',
};
export const corDoMascote = (m: MascoteInfo): string => COR[m.chave] ?? m.raridade.cor;

/* todos os mascotes, na ordem da coleção (1 a 57) */
export const TODOS_MASCOTES: MascoteInfo[] = RARIDADES.flatMap((_, linha) => COLUNAS[linha].map((coluna) => mascoteDe(`${linha}-${coluna}`)!));
