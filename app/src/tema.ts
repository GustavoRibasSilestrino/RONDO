/* Identidade visual do app (RONDO). Há uma aparência só: preto com um toque de violeta, texto em três tons (branco, cinza-lilás,
   cinza) e roxo com degradês só nos destaques. Não há troca de tema: a identidade é a mesma para todo mundo.
   `cores` é a paleta; os estilos feitos com `estilos(...)` são calculados uma vez, na primeira vez que alguém os lê. */

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

export const cores: Paleta = {
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

/* estilos da interface: a fábrica roda uma vez, na primeira leitura (e não ao importar o arquivo, para não depender da ordem dos imports) */
export function estilos<T extends object>(fabrica: () => T): T {
  let feitos: T | undefined;
  return new Proxy({} as T, {
    get: (_alvo, chave) => {
      feitos ??= fabrica();
      return (feitos as Record<string | symbol, unknown>)[chave];
    },
  });
}

export const raio = { p: 8, m: 14, g: 22, pilula: 999 } as const;

/* degradês: o roxo da marca indo para o violeta claro, sempre na diagonal (do canto de cima à esquerda) */
export const DEGRADE = {
  roxo: ['#5a0fc4', '#7426ec', '#8a45f5'] as const,          // botão principal, aba ativa, seleção (branco por cima: 4,9:1 ou mais)
  barra: ['#7b2cf0', '#c4a8ff'] as const,                       // progresso
  brilhoCartao: ['rgba(255,255,255,0.035)', 'rgba(255,255,255,0)'] as const,
  brilhoDestaque: ['rgba(139,92,246,0.20)', 'rgba(139,92,246,0.02)'] as const,
  fio: ['rgba(196,168,255,0)', 'rgba(196,168,255,0.55)', 'rgba(196,168,255,0)'] as const,   // o fio de luz no alto dos cartões
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
