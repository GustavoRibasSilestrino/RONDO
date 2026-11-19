/* A loja de pacotinhos (desde 2026-11-18, pedido do dono). Três pacotes; cada um sorteia um browniezinho entre 69 mascotes
   (13 comuns e 14 em cada outra raridade: é o que existe na folha de arte do dono). Os preços são uma estimativa "bem
   acessível" do dono, ainda sem pagamento de verdade: a compra é uma prévia e não cobra nada (ver PRODUCT.md).
   Comprar exige a conta do RONDO (a mesma do app): o sorteio é feito no servidor e o mascote fica guardado na conta
   (backend/app/servicos/loja.py, que usa estas mesmas chances; um teste de lá confere que os números batem).
   As chances ficam à vista em cada pacote e somam sempre 100% (aqui em décimos de ponto: 1000 = 100%). */
import imgOuro from "../assets/loja/pacote-ouro.webp";
import imgPrata from "../assets/loja/pacote-prata.webp";
import imgRoxo from "../assets/loja/pacote-roxo.webp";

export type Raridade = "comum" | "incomum" | "rara" | "epica" | "lendaria";

/* a ordem é a das linhas da folha de mascotes (assets/loja/mascotes.webp): comum em cima, lendária embaixo */
export const RARIDADES: { id: Raridade; nome: string; estrelas: number; quantos: number }[] = [
  { id: "comum", nome: "Comum", estrelas: 1, quantos: 13 },
  { id: "incomum", nome: "Incomum", estrelas: 2, quantos: 14 },
  { id: "rara", nome: "Rara", estrelas: 3, quantos: 14 },
  { id: "epica", nome: "Épica", estrelas: 4, quantos: 14 },
  { id: "lendaria", nome: "Lendária", estrelas: 5, quantos: 14 },
];
/* a folha tem 14 colunas por 5 linhas de células iguais (127 x 130 px cada); a linha dos comuns tem 13 */
export const FOLHA = { colunas: 14, linhas: 5, celula: [127, 130] as const };
export const TOTAL_MASCOTES = RARIDADES.reduce((a, r) => a + r.quantos, 0);   // 69

export type PacoteId = "roxo" | "prata" | "ouro";
export type Pacote = {
  id: PacoteId; nome: string; frase: string;
  centavos: number;                       // preço estimado
  chances: Record<Raridade, number>;      // em décimos de ponto percentual; somam 1000
  img: string; largura: number; altura: number;
  /* onde o pacote fica dentro da imagem (a imagem tem folga em volta para o brilho), em fração: esquerda, topo, direita, base */
  caixa: [number, number, number, number];
  /* a linha em que o pacote rasga, logo abaixo do lacre de cima: altura na borda esquerda e na direita da imagem (fração) */
  rasgo: [number, number];
};

export const PACOTES: Pacote[] = [
  {
    id: "roxo", nome: "Pacotinho Roxo", frase: "O de entrada. Lendário aqui é quase milagre.",
    centavos: 199, chances: { comum: 700, incomum: 220, rara: 65, epica: 14, lendaria: 1 },
    img: imgRoxo, largura: 525, altura: 737, caixa: [28 / 525, 46 / 737, 515 / 525, 710 / 737], rasgo: [0.205, 0.155],
  },
  {
    id: "prata", nome: "Pacotinho Prata", frase: "Menos comuns, mais raros.",
    centavos: 499, chances: { comum: 450, incomum: 320, rara: 160, epica: 60, lendaria: 10 },
    img: imgPrata, largura: 494, altura: 751, caixa: [10 / 494, 46 / 751, 493 / 494, 724 / 751], rasgo: [0.196, 0.157],
  },
  {
    id: "ouro", nome: "Pacotinho Ouro", frase: "A melhor chance de lendário da barraca.",
    centavos: 999, chances: { comum: 150, incomum: 300, rara: 330, epica: 170, lendaria: 50 },
    img: imgOuro, largura: 508, altura: 737, caixa: [22 / 508, 46 / 737, 479 / 508, 710 / 737], rasgo: [0.195, 0.159],
  },
];

export const preco = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
/* 700 -> "70%", 65 -> "6,5%", 1 -> "0,1%" */
export const porcento = (decimos: number) => `${(decimos / 10).toString().replace(".", ",")}%`;

/* O nome de cada brownie: "Brow" mais o que ele é (pedido do dono: "se for chef, Browchef"). Uma lista por raridade, na
   ordem das colunas da folha de mascotes. Os nomes foram dados olhando a arte, um por um. */
export const NOMES: string[][] = [
  ["Browraiz", "Browpolicial", "Browchef", "Browmaneiro", "Browpiloto", "BrowDJ", "Browanjo", "Brownoel", "Browcaubói", "Browmago", "Browpolar", "Browsapo", "Browgamer"],
  ["Browpedreiro", "Browdelegado", "Browenfermeiro", "Browabóbora", "Browfantasma", "Browalien", "Browdiabinho", "Browgato", "Browpirata", "Browcavaleiro", "Browcoelho", "Browurso", "Browsafira", "Browdino"],
  ["Browrei", "Browquerubim", "Browastronauta", "Browgelo", "Browfogo", "Browcoringa", "Browcristal", "Browfeiticeiro", "Browfaraó", "Browvampiro", "Browfera", "Browcoral", "Browrena", "Browpanda"],
  ["Browfênix", "Browhacker", "Browcosmonauta", "Browvalquíria", "Browcupido", "Browinferno", "Browgeada", "Browarquimago", "Browametista", "Browsamurai", "Browunicórnio", "Browninja", "Browmagma", "Browrubi"],
  ["Browimperador", "Browramsés", "Browsolar", "Browdivino", "Browdragão", "Browceleste", "Browneon", "Browtrevas", "Browglacial", "Browdiamante", "Browdemônio", "Browciber", "Browglitch", "Browsombra"],
];
export const nomeDe = (linha: number, coluna: number) => NOMES[linha]?.[coluna] ?? "Brownie";

export type Mascote = { raridade: Raridade; linha: number; coluna: number; numero: number; nome: string };

/* o número do mascote na coleção: 1 a 69, contando da linha dos comuns */
export const numeroDe = (linha: number, coluna: number) => RARIDADES.slice(0, linha).reduce((a, r) => a + r.quantos, 0) + coluna + 1;

/* o mascote de uma posição da folha (a que o servidor sorteou) */
export const mascoteDe = (linha: number, coluna: number): Mascote =>
  ({ raridade: RARIDADES[linha].id, linha, coluna, numero: numeroDe(linha, coluna), nome: nomeDe(linha, coluna) });

/* a chave de um mascote na coleção da conta */
export const chaveDe = (linha: number, coluna: number) => `${linha}-${coluna}`;
