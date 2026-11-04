/* Identidade visual do app (KORA): preto profundo, texto branco, um único roxo puro, fontes finas. Sem degradês. */
export const cores = {
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
} as const;

/* cor dos botões primários e da aba escolhida */
export const degradeBotao = ['#6a00d4', '#6a00d4'] as const;   // sem degradê: o roxo puro, nos dois pontos

export const raio = { p: 8, m: 14, g: 22, pilula: 999 } as const;

export type PesoFonte = '200' | '300' | '400' | '500';

/* largura máxima do conteúdo (na web o app vira uma coluna de celular) */
export const larguraMax = 520;

/* a fonte do app é a Poppins, em todo o texto: um arquivo por peso (carregados em App.tsx) */
export const FONTE: Record<PesoFonte, string> = {
  '200': 'Poppins_200ExtraLight',
  '300': 'Poppins_300Light',
  '400': 'Poppins_400Regular',
  '500': 'Poppins_500Medium',
};
