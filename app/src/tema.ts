/* Identidade visual do app (RONDO).
   As telas de dentro são de VIDRO (desde 2026-11-17) e, desde 2026-11-18, o tema padrão é o ESCURO (pedido do dono: o mesmo
   desenho, no escuro): fundo roxo quase preto com brilhos violeta, cartões de vidro translúcido com borda clara fina, texto
   claro, a aba ativa numa pílula roxa e os botões de ação no violeta vivo (`acao`). É `cores`.
   As telas do RONDIN (apresentação, entrar, cadastro, recado, chegada, chamado e a câmera) continuam ESCURAS: usam
   `escuro`, a paleta de antes (preto com um toque de violeta, texto claro). Nelas, o `T` sem cor pega o texto claro pelo
   `EscuroContexto` (componentes/Ui.tsx).
   Os estilos feitos com `estilos(...)` são calculados uma vez, na primeira vez que alguém os lê. */

export type Paleta = {
  fundo: string; fundo2: string; cartao: string; cartao2: string; linha: string; linha2: string;
  texto: string; texto2: string; texto3: string;
  violeta: string; violetaEscuro: string; destaque: string; destaqueForte: string; destaque2: string;
  acao: string;     // o destaque dos botões de ação (principal, seguir, a opção escolhida): leva texto branco
  bom: string; alerta: string; erro: string; branco: string; placeholder: string;
  tom: string;      // "r,g,b" da cor de destaque, para fazer tons transparentes: `rgba(${cores.tom},0.14)`
  painel: string;   // fundo das folhas que sobem de baixo
  aviso: string;    // fundo do aviso rápido
  barra: string;    // fundo da barra de abas
  cabecalho: string; // fundo do cabeçalho de cima
};

/* a paleta escura: as telas do RONDIN */
export const escuro: Paleta = {
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
  acao: '#8a3dff',
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

/* a paleta de vidro escuro: as telas de dentro do app (desde 2026-11-18; antes era vidro claro lilás). Contraste do texto sobre
   o vidro (≈ #1a1526): texto 15:1, texto2 10:1, texto3 6:1; destaque2 (links e números) 9:1; branco sobre `acao` 5,7:1. */
export const cores: Paleta = {
  fundo: '#0e0b16',                       // por baixo do degradê do fundo (FundoCena)
  fundo2: 'rgba(255,255,255,0.05)',       // campos e caixas dentro dos cartões
  cartao: 'rgba(255,255,255,0.055)',      // o vidro
  cartao2: 'rgba(255,255,255,0.12)',      // vidro mais forte: itens por cima do vidro, cursor em cima
  linha: 'rgba(255,255,255,0.10)',        // a borda fina do vidro
  linha2: 'rgba(255,255,255,0.18)',
  texto: '#f4f1fb',
  texto2: '#cfc6e3',
  texto3: '#a59cbf',
  violeta: '#6a00d4',
  violetaEscuro: '#2a1650',
  destaque: '#9b6bff',
  destaqueForte: '#3a2470',               // a pílula da aba ativa: roxo médio, leva texto branco (11:1)
  destaque2: '#c4a8ff',                   // links, números e ícones em destaque
  acao: '#7c3aed',                        // os botões de ação: violeta vivo, leva texto branco (5,7:1)
  bom: '#3ddc97',
  alerta: '#ff9a5c',
  erro: '#ff6b81',
  branco: '#ffffff',
  placeholder: 'rgba(207,198,227,0.5)',
  tom: '139,92,246',
  painel: 'rgba(22,17,33,0.8)',          // as folhas que sobem de baixo: vidro escuro e desfocado
  aviso: 'rgba(44,32,70,0.96)',           // o aviso rápido
  barra: 'rgba(30,24,46,0.62)',           // a pílula de vidro das abas
  cabecalho: 'rgba(14,11,22,0.74)',       // o cabeçalho de cima: vidro escuro
};

/* o efeito de vidro: no navegador, o desfoque do que passa por trás; no celular não há desfoque (pesa ao rolar), só a
   transparência e a borda clara */
/* desde 2026-11-18 (tema escuro, a partir de uma referência do dono): desfoque mais forte e mais saturação, para a luz roxa do fundo
   passar pelo vidro e ele parecer refletir o fundo */
export const VIDRO: object = { backdropFilter: 'blur(30px) saturate(170%)', WebkitBackdropFilter: 'blur(30px) saturate(170%)' };
export const SOMBRA_VIDRO = '0 18px 40px -22px rgba(0,0,0,0.6)';

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
  roxo: ['#5a0fc4', '#7426ec', '#8a45f5'] as const,
  ativo: ['#3a2370', '#2a1650', '#1f1040'] as const,         // o item ativo no vidro claro (menu, segmentos): a pílula roxo-escura          // botão principal, aba ativa, seleção (branco por cima: 4,9:1 ou mais)
  barra: ['#7b2cf0', '#c4a8ff'] as const,                       // progresso
  brilhoCartao: ['rgba(255,255,255,0.09)', 'rgba(255,255,255,0)'] as const,      // o reflexo de cima do vidro
  brilhoDestaque: ['rgba(196,168,255,0.16)', 'rgba(196,168,255,0.02)'] as const,
  fio: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0)'] as const,   // o fio de luz no alto dos cartões
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

/* o cursor em cima de um botão (pedido do dono, 2026-11-16): ele só fica cinza, na hora, sem zoom nem animação.
   O mesmo cinza dos botões do site (vitrine/src/styles/botoes.css). */
export const CINZA_SOBRE = { backgroundColor: '#3a3842', borderColor: '#5a5866' } as const;
