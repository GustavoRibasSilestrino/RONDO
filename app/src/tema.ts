/* Identidade visual do app (RONDO).
   Desde 2026-11-26 (pedido do dono) o app é só PRETO, CINZA e BRANCO: cada roxo virou o cinza de mesma luminância (o contraste
   de todo texto ficou igual ao de antes). Os nomes "violeta", "destaque" e os comentários de roxo abaixo são históricos.
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
  tinta: string;    // "r,g,b" da cor dos véus por cima do fundo (branco no escuro, roxo-escuro no claro): `rgba(${cores.tinta},0.08)`
  sombra: string;   // a sombra dos cartões e das barras
};

/* o VERDE dos botões e do menu (pedido do dono, 2026-11-26): não é o tema, só os botões de ação, a aba ativa, a barra de abas e o
   cabeçalho. Branco sobre `VERDE.botao`: 5:1. */
export const VERDE = { botao: '#15803d', sobre: '#178a43', toque: '#116432' } as const;

/* a paleta escura: as telas do RONDIN */
export const escuro: Paleta = {
  fundo: '#070707',
  fundo2: '#0c0c0c',
  cartao: '#0f0f0f',
  cartao2: '#181818',
  linha: 'rgba(157,157,157,0.13)',
  linha2: 'rgba(157,157,157,0.26)',
  texto: '#f2f2f2',
  texto2: '#c5c5c5',   // 10:1 sobre o cartão
  texto3: '#9a9a9a',   // 6:1 sobre o cartão: legendas e ícones apagados
  /* o RONDIN é verde (desde 2026-11-26), mas desde 2026-11-27 (pedido do dono: "as caixas em preto e branco ao invés de verde...
     somente o rondin verde") só a esfera dele é verde: as caixas das perguntas, os destaques, os links e os botões das telas
     dele são preto e branco */
  violeta: '#16a34a',
  violetaEscuro: '#052e16',
  destaque: '#22c55e',
  destaqueForte: '#f2f2f2', /* a opção marcada e as caixas cheias: branco, leva texto escuro */
  destaque2: '#ffffff', /* as palavras em destaque na fala dele, links e números (antes verde-claro) */
  acao: VERDE.botao,
  bom: '#3ddc97',
  alerta: '#ff9a5c',
  erro: '#ff6b81',
  branco: '#ffffff',
  placeholder: 'rgba(197,197,197,0.55)',
  tom: '255,255,255',   // o véu das caixas e o anel do campo em foco: branco (antes o verde 34,197,94)
  painel: '#0f0f0f',
  aviso: '#181818',
  barra: 'rgba(15,15,15,0.97)',   // quase opaca: dispensa o desfoque, que pesa ao rolar
  cabecalho: '#070707',
  tinta: '255,255,255',
  sombra: 'rgba(0,0,0,0.6)',
};

/* a paleta de vidro escuro: as telas de dentro do app (desde 2026-11-18; antes era vidro claro lilás). Contraste do texto sobre
   o vidro (≈ #181818): texto 15:1, texto2 10:1, texto3 6:1; destaque2 (links e números) 9:1; branco sobre `acao` 5,7:1. */

const vidroEscuro: Paleta = {
  fundo: '#0d0d0d',                       // por baixo do degradê do fundo (FundoCena)
  fundo2: 'rgba(255,255,255,0.05)',       // campos e caixas dentro dos cartões
  cartao: 'rgba(255,255,255,0.055)',      // o vidro
  cartao2: 'rgba(255,255,255,0.12)',      // vidro mais forte: itens por cima do vidro, cursor em cima
  linha: 'rgba(255,255,255,0.10)',        // a borda fina do vidro
  linha2: 'rgba(255,255,255,0.18)',
  texto: '#f2f2f2',
  texto2: '#cacaca',
  texto3: '#a1a1a1',
  violeta: '#4f4f4f',
  violetaEscuro: '#232323',
  destaque: '#888888',
  destaqueForte: VERDE.botao,             // a pílula da aba ativa: o verde do menu, leva texto branco
  destaque2: '#b6b6b6',                   // links, números e ícones em destaque
  acao: VERDE.botao,                      // os botões de ação: verde, leva texto branco (5:1)
  bom: '#3ddc97',
  alerta: '#ff9a5c',
  erro: '#ff6b81',
  branco: '#ffffff',
  placeholder: 'rgba(202,202,202,0.5)',
  tom: '123,123,123',
  painel: 'rgba(20,20,20,0.8)',          // as folhas que sobem de baixo: vidro escuro e desfocado
  aviso: 'rgba(39,39,39,0.96)',           // o aviso rápido
  barra: 'rgba(9,44,23,0.72)',            // a pílula de vidro das abas: verde escuro (o menu)
  cabecalho: 'rgba(7,38,20,0.86)',        // o cabeçalho de cima: vidro verde escuro
  tinta: '255,255,255',
  sombra: 'rgba(0,0,0,0.6)',
};

/* o tema CLARO (desde 2026-11-26, pedido do dono: um ícone no app troca entre o escuro e o claro). O mesmo desenho de vidro,
   sobre um lilás bem claro: vidro branco translúcido, borda roxa fina, texto roxo quase preto. Contraste sobre o vidro
   (≈ #fbfbfb): texto 16:1, texto2 9:1, texto3 5,2:1; destaque2 (links e números) 7:1; branco sobre `acao` 5,7:1. */
const vidroClaro: Paleta = {
  fundo: '#f1f1f1',
  fundo2: 'rgba(35,35,35,0.045)',
  cartao: 'rgba(255,255,255,0.7)',
  cartao2: 'rgba(35,35,35,0.07)',
  linha: 'rgba(35,35,35,0.10)',
  linha2: 'rgba(35,35,35,0.18)',
  texto: '#181818',
  texto2: '#424242',
  texto3: '#626262',
  violeta: '#4f4f4f',
  violetaEscuro: '#e8e8e8',
  destaque: '#676767',
  destaqueForte: VERDE.botao,             // a pílula da aba ativa: o verde do menu, leva texto branco
  destaque2: '#494949',                   // links, números e ícones em destaque
  acao: VERDE.botao,
  bom: '#0b8a57',
  alerta: '#b45309',
  erro: '#c42f4b',
  branco: '#ffffff',
  placeholder: 'rgba(66,66,66,0.55)',
  tom: '103,103,103',
  painel: 'rgba(249,249,249,0.94)',
  aviso: 'rgba(255,255,255,0.97)',
  barra: 'rgba(220,252,231,0.78)',        // verde bem claro (o menu)
  cabecalho: 'rgba(220,252,231,0.86)',
  tinta: '35,35,35',
  sombra: 'rgba(35,35,35,0.18)',
};

export type NomeTema = 'escuro' | 'claro';
export const TEMAS: Record<NomeTema, Paleta> = { escuro: vidroEscuro, claro: vidroClaro };

/* as cores das telas de dentro do app: o tema escolhido. É um objeto só, que `aplicarTema` reescreve no lugar; quem lê
   `cores.x` na hora de desenhar pega a cor nova (o App redesenha tudo ao trocar, em estado/tema.tsx). */
export const cores: Paleta = { ...vidroEscuro };

/* o fundo das telas (componentes/FundoCena.tsx): o degradê e os dois brilhos, em cada tema */
export const CENA = {
  degrade: ['#191919', '#0e0e0e', '#080808'] as [string, string, string],
  claro: '#b6b6b6', claroForca: 0.2,
  roxo: '#676767', roxoForca: 0.55,
};
const CENAS: Record<NomeTema, typeof CENA> = {
  escuro: { ...CENA },
  claro: { degrade: ['#f9f9f9', '#eeeeee', '#e5e5e5'], claro: '#ffffff', claroForca: 0.9, roxo: '#9d9d9d', roxoForca: 0.38 },
};

let temaAtual: NomeTema = 'escuro';
export const nomeDoTema = (): NomeTema => temaAtual;

/* troca o tema: reescreve as cores e esquece os estilos já calculados, para eles serem refeitos com as cores novas */
export function aplicarTema(nome: NomeTema): void {
  temaAtual = nome;
  Object.assign(cores, TEMAS[nome]);
  Object.assign(CENA, CENAS[nome]);
  Object.assign(CINZA_SOBRE, nome === 'claro' ? { backgroundColor: '#e1e1e1', borderColor: '#cbcbcb' } : { backgroundColor: '#393939', borderColor: '#5a5a5a' });
  SOMBRA.vidro = `0 18px 40px -22px ${TEMAS[nome].sombra}`;
  for (const esquecer of feitos) esquecer();
}

/* o efeito de vidro: no navegador, o desfoque do que passa por trás; no celular não há desfoque (pesa ao rolar), só a
   transparência e a borda clara */
/* desde 2026-11-18 (tema escuro, a partir de uma referência do dono): desfoque mais forte e mais saturação, para a luz roxa do fundo
   passar pelo vidro e ele parecer refletir o fundo */
export const VIDRO: object = { backdropFilter: 'blur(20px) saturate(170%)', WebkitBackdropFilter: 'blur(20px) saturate(170%)' };
export const SOMBRA_VIDRO = '0 18px 40px -22px rgba(0,0,0,0.6)';
export const SOMBRA = { vidro: SOMBRA_VIDRO };   // a mesma, mas acompanha o tema (no claro, uma sombra roxa leve)

/* estilos da interface: a fábrica roda uma vez, na primeira leitura (e não ao importar o arquivo, para não depender da ordem dos
   imports), e de novo depois de cada troca de tema (aplicarTema esquece o que já foi calculado) */
const feitos: (() => void)[] = [];
export function estilos<T extends object>(fabrica: () => T): T {
  let pronto: T | undefined;
  feitos.push(() => { pronto = undefined; });
  return new Proxy({} as T, {
    get: (_alvo, chave) => {
      pronto ??= fabrica();
      return (pronto as Record<string | symbol, unknown>)[chave];
    },
  });
}

export const raio = { p: 8, m: 14, g: 22, pilula: 999 } as const;

/* degradês: o roxo da marca indo para o violeta claro, sempre na diagonal (do canto de cima à esquerda) */
export const DEGRADE = {
  roxo: ['#484848', '#5e5e5e', '#707070'] as const,
  ativo: ['#333333', '#232323', '#1a1a1a'] as const,         // o item ativo no vidro claro (menu, segmentos): a pílula roxo-escura          // botão principal, aba ativa, seleção (branco por cima: 4,9:1 ou mais)
  barra: ['#626262', '#b6b6b6'] as const,                       // progresso
  brilhoCartao: ['rgba(255,255,255,0.09)', 'rgba(255,255,255,0)'] as const,      // o reflexo de cima do vidro
  brilhoDestaque: ['rgba(182,182,182,0.16)', 'rgba(182,182,182,0.02)'] as const,
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

/* a fonte de pixel art (Pixelify Sans, a mesma da loja do site; carregada em App.tsx). Desde 2026-11-19 ela aparece onde o app
   conversa com o mundo dos mascotes: nos popups em pixel art (componentes/Pixel.tsx) e em quatro pontos pedidos pelo dono
   (o aviso de "Nenhum treino salvo", o botão "Criar clube", as abas Clubes/Ranking e o seletor de dia da Dieta).
   No `T`, é a prop `pixel`. */
export const FONTE_PIXEL = { normal: 'PixelifySans_500Medium', forte: 'PixelifySans_700Bold' } as const;

/* o cursor em cima de um botão (pedido do dono, 2026-11-16): ele só fica cinza, na hora, sem zoom nem animação.
   O mesmo cinza dos botões do site (vitrine/src/styles/botoes.css). */
export const CINZA_SOBRE: { backgroundColor: string; borderColor: string } = { backgroundColor: '#393939', borderColor: '#5a5a5a' };
