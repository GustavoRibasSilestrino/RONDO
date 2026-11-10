/* Gerado por vitrine/scripts/aparelhos3d (node cli.mjs tudo). Não editar à mão: rode o script de novo.
   n = quadros por aparelho; heroi = o quadro de descanso (o aparelho parado no centro).
   w, h = tamanho de um quadro; cols = quadros por linha na folha; chao = fração da altura do quadro que fica abaixo da linha do chão;
   corpo = onde o aparelho (sem a sombra) fica no quadro de descanso, em frações: esquerda, direita, alto, baixo;
   p = a folha menor, das telas pequenas. */
export const QUADROS = { n: 31, heroi: 15 } as const;
export type Folha = { id: string; w: number; h: number; cols: number; chao: number; corpo: number[]; p: { w: number; h: number; cols: number } };
export const FOLHAS: Folha[] = [
  {id: "halter",w: 766,h: 352,cols: 5,chao: 0.2724,corpo: [0.116,0.875,0.045,0.875],p: {w: 536,h: 246,cols: 7}},
  {id: "kettlebell",w: 496,h: 457,cols: 8,chao: 0.1242,corpo: [0.19,0.81,0.013,0.952],p: {w: 347,h: 320,cols: 11}},
  {id: "barra",w: 940,h: 382,cols: 4,chao: 0.233,corpo: [0.083,0.868,0.037,0.874],p: {w: 658,h: 267,cols: 6}},
  {id: "banco",w: 702,h: 419,cols: 5,chao: 0.1995,corpo: [0.131,0.836,0.031,0.936],p: {w: 491,h: 293,cols: 8}},
];
