/* O relógio da abertura (componentes/Abertura.tsx): a tela preta com o nome RONDO. As telas do RONDIN (a chegada, a
   apresentação) esperam por ela antes de começar a falar, para não falarem por baixo do preto. */
const INICIO = Date.now();

/* quanto tempo, desde que o app abriu, o nome fica na tela antes de começar a sumir */
export const DURACAO_ABERTURA = 1800;

/* quanto falta (em ms) para a abertura começar a sumir; 0 se ela já sumiu */
export const atrasoDaAbertura = (): number => Math.max(0, INICIO + DURACAO_ABERTURA - Date.now());
