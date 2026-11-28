/* A loja de browniezinhos (desde 2026-11-18, pedido do dono). São 57 mascotes (12 comuns, 13 incomuns, 13 raros, 11 épicos
   e 8 lendários: a folha de arte do dono tinha 69; o Browdiabinho, o Browinferno e o Browdemônio saíram a pedido dele, e em
   2026-11-25, quando os mascotes viraram 3D, saíram os nove que ficaram sem 3D).
   Desde 2026-11-27 a loja vende CADA MASCOTE separado, por um preço fixo da raridade (pedido do dono). Antes vendia pacotes
   sorteados, que são caixas de recompensa ("loot boxes"), proibidas pelo ECA Digital em produtos que menores provavelmente
   usam (backend/app/servicos/loja.py explica). Agora a pessoa escolhe, vê o preço e leva exatamente aquele.
   Os preços são estimativas "bem acessíveis" do dono, ainda sem pagamento de verdade: hoje a compra está fechada e nada é
   cobrado (ver PRODUCT.md). Comprar exige a conta do RONDO (a mesma do app), e o mascote fica guardado nela. O servidor usa
   estes mesmos preços (PRECOS em backend/app/servicos/loja.py); um teste de lá confere que os números batem. */
export type Raridade = "comum" | "incomum" | "rara" | "epica" | "lendaria";

/* a ordem é a das linhas da folha de mascotes (assets/loja/mascotes.webp): comum em cima, lendária embaixo.
   `centavos`: o preço de cada mascote da raridade. Cada raridade fica numa linha só (o teste do servidor lê assim). */
export const RARIDADES: { id: Raridade; nome: string; estrelas: number; quantos: number; centavos: number }[] = [
  { id: "comum", nome: "Comum", estrelas: 1, quantos: 12, centavos: 199 },   // 13 casas, uma vazia (o Browpolicial saiu)
  { id: "incomum", nome: "Incomum", estrelas: 2, quantos: 13, centavos: 299 },   // 14 casas, uma vazia (o Browdiabinho saiu)
  { id: "rara", nome: "Rara", estrelas: 3, quantos: 13, centavos: 499 },   // 14 casas, uma vazia (o Browgelo saiu)
  { id: "epica", nome: "Épica", estrelas: 4, quantos: 11, centavos: 799 },   // 14 casas, três vazias (o Browinferno, o Browcosmonauta e o Browmagma saíram)
  { id: "lendaria", nome: "Lendária", estrelas: 5, quantos: 8, centavos: 999 },   // 14 casas, seis vazias (o Browdemônio, o Browglacial, o Browdiamante, o Browciber, o Browglitch e o Browsombra saíram)
];
/* a folha tem 14 colunas por 5 linhas de células iguais (proporção 160 x 176); a linha dos comuns tem 13. Desde 2026-11-25
   cada mascote é o retrato do modelo 3D (brand/mascotes-voxel/exportar_todos.py), e a folha é montada por
   brand/mascotes-voxel/montar_folha.py, que lê os NOMES daqui. */
export const FOLHA = { colunas: 14, linhas: 5, celula: [160, 176] as const };
export const TOTAL_MASCOTES = RARIDADES.reduce((a, r) => a + r.quantos, 0);   // 57
export const MAIS_BARATO = Math.min(...RARIDADES.map((r) => r.centavos));

/* O lápis (desde 2026-11-19, pedido do dono): dá um nome próprio a um browniezinho da coleção. Compra-se aqui, fica guardado
   na conta e é usado no app, na aba Coleção do perfil. Cada lápis vale um nome. Preço escolhido pelo dono: R$ 10,00
   (hoje é prévia e nada é cobrado). */
export const LAPIS = { nome: "Lápis de nome", centavos: 1000 };

export const preco = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;

/* O nome de cada brownie: "Brow" mais o que ele é (pedido do dono: "se for chef, Browchef"). Uma lista por raridade, na
   ordem das colunas da folha de mascotes. Os nomes foram dados olhando a arte, um por um. null é um mascote tirado a pedido
   do dono (a casa fica vazia e as chaves dos outros não mudam): o Browdiabinho, o Browinferno e o Browdemônio, em 2026-11-19. O servidor tira o mesmo
   (backend/app/servicos/loja.py, TIRADOS). */
export const NOMES: (string | null)[][] = [
  ["Browraiz", null, "Browchef", "Browmaneiro", "Browpiloto", "BrowDJ", "Browanjo", "Brownoel", "Browcaubói", "Browmago", "Browpolar", "Browsapo", "Browgamer"],
  ["Browpedreiro", "Browdelegado", "Browenfermeiro", "Browabóbora", "Browfantasma", "Browalien", null, "Browgato", "Browpirata", "Browcavaleiro", "Browcoelho", "Browurso", "Browsafira", "Browdino"],
  ["Browrei", "Browquerubim", "Browastronauta", null, "Browfogo", "Browcoringa", "Browcristal", "Browfeiticeiro", "Browfaraó", "Browvampiro", "Browfera", "Browcoral", "Browrena", "Browpanda"],
  ["Browfênix", "Browhacker", null, "Browvalquíria", "Browcupido", null, "Browgeada", "Browarquimago", "Browametista", "Browsamurai", "Browunicórnio", "Browninja", null, "Browrubi"],
  ["Browimperador", "Browramsés", "Browsolar", "Browdivino", "Browdragão", "Browceleste", "Browneon", "Browtrevas", null, null, null, null, null, null],
];
export const nomeDe = (linha: number, coluna: number) => NOMES[linha]?.[coluna] ?? "Brownie";
/* as colunas da folha que têm mascote, em cada linha */
export const COLUNAS: number[][] = NOMES.map((linha) => linha.flatMap((nome, coluna) => (nome ? [coluna] : [])));

export type Mascote = { raridade: Raridade; linha: number; coluna: number; numero: number; nome: string; centavos: number };

/* o número do mascote na coleção: 1 a 57, contando da linha dos comuns */
export const numeroDe = (linha: number, coluna: number) =>
  RARIDADES.slice(0, linha).reduce((a, r) => a + r.quantos, 0) + COLUNAS[linha].indexOf(coluna) + 1;

/* o mascote de uma posição da folha, com o preço da raridade dele */
export const mascoteDe = (linha: number, coluna: number): Mascote =>
  ({ raridade: RARIDADES[linha].id, linha, coluna, numero: numeroDe(linha, coluna), nome: nomeDe(linha, coluna), centavos: RARIDADES[linha].centavos });

/* a chave de um mascote na coleção da conta */
export const chaveDe = (linha: number, coluna: number) => `${linha}-${coluna}`;
