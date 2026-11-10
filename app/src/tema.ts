/* Identidade visual do app (RONDO). Há dois temas:
   - Normal: preto com um toque de violeta, texto em três tons (branco, cinza-lilás, cinza) e roxo com degradês só nos destaques.
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
  cabecalho: string; // fundo do cabeçalho de cima
};

const normal: Paleta = {
  fundo: '#07060b',
  fundo2: '#0d0b13',
  cartao: '#100d18',
  cartao2: '#1a1626',
  linha: 'rgba(167,139,250,0.13)',
  linha2: 'rgba(167,139,250,0.26)',
  texto: '#f4f1fb',
  texto2: '#c9c2db',   // 10:1 sobre o cartão
  texto3: '#9e96b8',   // 6:1 sobre o cartão: legendas e ícones apagados
  violeta: '#6a00d4',
  violetaEscuro: '#1d0040',
  destaque: '#8a3dff',
  destaqueForte: '#6a00d4', /* o roxo puro da marca: leva texto branco (9:1) */
  destaque2: '#c4a8ff', /* lilás para links, números e ícones em destaque (9:1 sobre o cartão) */
  bom: '#3ddc97',
  alerta: '#ff9a5c',
  erro: '#ff6b81',
  branco: '#ffffff',
  placeholder: 'rgba(201,194,219,0.55)',
  tom: '139,92,246',
  painel: '#100d18',
  aviso: '#1a1626',
  barra: 'rgba(16,13,24,0.97)',   // quase opaca: dispensa o desfoque, que pesa ao rolar
  cabecalho: '#07060b',
};

/* Ultra, "aurora de vidro": azul-noite com uma única luz fria vinda de cima, cartões de vidro de borda fina e um só acento (ciano).
   Tudo é azul frio de ponta a ponta; o que é vivo (ciano, azul dos botões) aparece só onde há ação ou estado. Contrastes medidos
   sobre o fundo: texto 17:1, texto2 12:1, texto3 8:1; branco sobre o azul dos botões, 5,2:1 ou mais. */
const ultra: Paleta = {
  fundo: '#050816',                          // azul-noite, quase preto: a aurora lê melhor contra ele
  fundo2: '#0a1030',
  cartao: 'rgba(150,175,255,0.07)',          // vidro: um véu frio, sem cor própria
  cartao2: 'rgba(160,185,255,0.12)',
  linha: 'rgba(170,195,255,0.15)',
  linha2: 'rgba(190,212,255,0.28)',
  texto: '#f3f6ff',
  texto2: '#d3dcf7',
  texto3: '#a3b3da',
  violeta: '#3d56e8',
  violetaEscuro: '#0c1244',
  destaque: '#62d6ff',                       // ciano claro: link, número, seleção
  destaqueForte: '#2f5ff0',                  // o azul dos botões: leva texto branco
  destaque2: '#c2ebff',
  bom: '#52e0b0',
  alerta: '#ffb36b',
  erro: '#ff7a96',
  branco: '#ffffff',
  placeholder: 'rgba(205,220,250,0.62)',   // 5,5:1 sobre o campo
  tom: '98,150,255',
  painel: '#0a1030',
  aviso: '#131a44',
  barra: 'rgba(8,12,36,0.78)',
  cabecalho: 'rgba(6,10,30,0.55)',           // vidro: deixa a aurora aparecer
};

/* as cores das letras do nome no tema Ultra: a palavra RONDO no cabeçalho e a palavra ULTRA da transição.
   Uma rampa só de azuis frios, do ciano ao lilás (sem o rosa), para combinar com o resto da paleta. */
export const LETRAS_ULTRA = ['#7fdcff', '#79c2ff', '#8eaaff', '#a29fff', '#bb9eff'] as const;

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

/* degradês do tema normal: o roxo da marca indo para o violeta claro, sempre na diagonal (do canto de cima à esquerda) */
const DEGRADE_NORMAL = {
  roxo: ['#5a0fc4', '#7426ec', '#8a45f5'] as const,          // botão principal, aba ativa, seleção (branco por cima: 4,9:1 ou mais)
  barra: ['#7b2cf0', '#c4a8ff'] as const,                       // progresso
  brilhoCartao: ['rgba(255,255,255,0.035)', 'rgba(255,255,255,0)'] as const,
  brilhoDestaque: ['rgba(139,92,246,0.20)', 'rgba(139,92,246,0.02)'] as const,
  fio: ['rgba(196,168,255,0)', 'rgba(196,168,255,0.55)', 'rgba(196,168,255,0)'] as const,   // o fio de luz no alto dos cartões
};
/* Ultra: um matiz só (azul), do azul-cobalto ao índigo; o brilho dos cartões é um reflexo frio de vidro, não cor */
const DEGRADE_ULTRA = {
  roxo: ['#2a62f0', '#3a58ee', '#4a4fe4'] as const,          // botão, aba ativa, seleção (branco por cima: 5,1:1 ou mais)
  barra: ['#4cc9ff', '#5b8cff'] as const,                    // progresso: do ciano ao azul
  brilhoCartao: ['rgba(190,210,255,0.07)', 'rgba(190,210,255,0)'] as const,
  brilhoDestaque: ['rgba(98,214,255,0.14)', 'rgba(98,214,255,0.02)'] as const,
  fio: ['rgba(190,225,255,0)', 'rgba(190,225,255,0.5)', 'rgba(190,225,255,0)'] as const,
};
/* lê o tema na hora: quem usa DEGRADE.roxo recebe o do tema que está valendo */
export const DEGRADE = {
  get roxo() { return (atual === 'ultra' ? DEGRADE_ULTRA : DEGRADE_NORMAL).roxo; },
  get barra() { return (atual === 'ultra' ? DEGRADE_ULTRA : DEGRADE_NORMAL).barra; },
  get brilhoCartao() { return (atual === 'ultra' ? DEGRADE_ULTRA : DEGRADE_NORMAL).brilhoCartao; },
  get brilhoDestaque() { return (atual === 'ultra' ? DEGRADE_ULTRA : DEGRADE_NORMAL).brilhoDestaque; },
  get fio() { return (atual === 'ultra' ? DEGRADE_ULTRA : DEGRADE_NORMAL).fio; },
};
export const INICIO_DIAGONAL = { x: 0, y: 0 } as const;
export const FIM_DIAGONAL = { x: 1, y: 1 } as const;

export type PesoFonte = '200' | '300' | '400' | '500';

/* largura máxima do conteúdo (na web o app vira uma coluna de celular) */
export const larguraMax = 600;

/* a fonte do app é a Poppins, em todo o texto, um degrau mais grossa que o desenho original: um arquivo por peso (carregados em App.tsx) */
export const FONTE: Record<PesoFonte, string> = {
  '200': 'Poppins_300Light',      // o peso mais fino do app agora é o Light
  '300': 'Poppins_400Regular',
  '400': 'Poppins_500Medium',
  '500': 'Poppins_600SemiBold',
};
