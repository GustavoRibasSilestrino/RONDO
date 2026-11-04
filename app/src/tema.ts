/* Identidade visual do app (KORA). Há dois temas:
   - Normal: preto profundo, texto branco e um único roxo puro, sem degradês.
   - Ultra: um tema à parte, de vidro e aurora azul-ciano sobre um fundo que se move; é liberado no nível 15 da conta.
   `cores` é um objeto único que muda de valores quando o tema troca (aplicarTema); os estilos feitos com `estilos(...)` se
   recalculam com ele, então toda a interface se pinta de novo sem reabrir as telas. */

export type TemaId = 'normal' | 'ultra';

export type Paleta = {
  fundo: string; fundo2: string; cartao: string; cartao2: string; linha: string; linha2: string;
  texto: string; texto2: string; texto3: string;
  violeta: string; violetaEscuro: string; destaque: string; destaqueForte: string; destaque2: string;
  bom: string; alerta: string; erro: string; branco: string; placeholder: string;
  tom: string;      // "r,g,b" da cor de destaque, para fazer tons transparentes: `rgba(${cores.tom},0.14)`
  painel: string;   // fundo das folhas que sobem de baixo
  aviso: string;    // fundo do aviso rápido
  barra: string;    // fundo da barra de abas
};

const normal: Paleta = {
  fundo: '#000000',
  fundo2: '#0a0a0a',
  cartao: '#0a0a0a',
  cartao2: '#161616',
  linha: '#1f1f1f',
  linha2: '#333333',
  texto: '#ffffff',
  texto2: '#ffffff',
  texto3: '#ffffff',
  violeta: '#6a00d4',
  violetaEscuro: '#1d0040',
  destaque: '#8a3dff',
  destaqueForte: '#6a00d4', /* o roxo puro da marca: leva texto branco (9:1) */
  destaque2: '#ffffff',
  bom: '#3ddc97',
  alerta: '#ff9a5c',
  erro: '#ff6b81',
  branco: '#ffffff',
  placeholder: 'rgba(255,255,255,0.45)',
  tom: '139,92,246',
  painel: '#0a0a0a',
  aviso: '#161616',
  barra: 'rgba(12,12,12,0.78)',
};

const ultra: Paleta = {
  fundo: '#040817',
  fundo2: '#0a1230',
  cartao: 'rgba(120,160,255,0.09)',
  cartao2: 'rgba(120,160,255,0.17)',
  linha: 'rgba(150,190,255,0.18)',
  linha2: 'rgba(150,190,255,0.36)',
  texto: '#ffffff',
  texto2: '#e4edff',
  texto3: '#c3d3ff',
  violeta: '#2760ff',
  violetaEscuro: '#0b1a4d',
  destaque: '#5fd4ff',
  destaqueForte: '#2760ff', /* azul vivo que leva texto branco (5:1) */
  destaque2: '#9ff3ff',
  bom: '#4dffc3',
  alerta: '#ffb36b',
  erro: '#ff7a96',
  branco: '#ffffff',
  placeholder: 'rgba(220,235,255,0.5)',
  tom: '95,212,255',
  painel: '#0a1230',
  aviso: '#13204d',
  barra: 'rgba(8,18,52,0.6)',
};

export const PALETAS: Record<TemaId, Paleta> = { normal, ultra };

/* o objeto que o app inteiro lê; seus valores mudam quando o tema muda */
export const cores: Paleta = { ...normal };

let atual: TemaId = 'normal';
export const temaAtual = (): TemaId => atual;

export function aplicarTema(id: TemaId): void {
  if (id === atual) return;
  atual = id;
  Object.assign(cores, PALETAS[id]);
}

/* estilos que acompanham o tema: a fábrica roda de novo (uma vez por tema) quando as cores mudam */
export function estilos<T extends object>(fabrica: () => T): T {
  const cache: Partial<Record<TemaId, T>> = {};
  return new Proxy({} as T, {
    get: (_alvo, chave) => {
      const feitos = cache[atual] ?? (cache[atual] = fabrica());
      return (feitos as Record<string | symbol, unknown>)[chave];
    },
  });
}

export const raio = { p: 8, m: 14, g: 22, pilula: 999 } as const;

export type PesoFonte = '200' | '300' | '400' | '500';

/* largura máxima do conteúdo (na web o app vira uma coluna de celular) */
export const larguraMax = 520;

/* a fonte do app é a Poppins, em todo o texto, um degrau mais grossa que o desenho original: um arquivo por peso (carregados em App.tsx) */
export const FONTE: Record<PesoFonte, string> = {
  '200': 'Poppins_300Light',      // o peso mais fino do app agora é o Light
  '300': 'Poppins_400Regular',
  '400': 'Poppins_500Medium',
  '500': 'Poppins_600SemiBold',
};
