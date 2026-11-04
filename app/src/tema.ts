/* Identidade visual do app: preto e roxo, fontes finas, vidro leve e cantos amplos. */
export const cores = {
  fundo: '#050507',
  fundo2: '#0b0910',
  cartao: 'rgba(255,255,255,0.035)',
  cartao2: 'rgba(255,255,255,0.07)',
  linha: 'rgba(255,255,255,0.09)',
  linha2: 'rgba(255,255,255,0.17)',
  texto: '#f1eefb',
  texto2: '#a09bb5',
  texto3: '#8d84b8',
  violeta: '#6d28d9',
  violetaEscuro: '#2e1065',
  destaque: '#8b5cf6',
  destaqueForte: '#7c3aed', /* fundo que leva texto branco: 5,7:1 (o destaque dá 4,2:1) */
  destaque2: '#c4a8ff',
  bom: '#3ddc97',
  alerta: '#ff9a5c',
  erro: '#ff6b81',
  branco: '#ffffff',
} as const;

/* degradê dos botões primários e do item escolhido da roda: o fim é escuro o bastante para texto branco (4,7:1) */
export const degradeBotao = ['#6d28d9', '#8352f0'] as const;

export const raio = { p: 8, m: 14, g: 22, pilula: 999 } as const;

export type PesoFonte = '200' | '300' | '400' | '500';

/* largura máxima do conteúdo (na web o app vira uma coluna de celular) */
export const larguraMax = 520;
