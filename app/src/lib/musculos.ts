/* Músculos de cada treino, desenhados sobre a figura de assets/corpo.png (1024 x 1536).
   Cada região é um polígono do lado esquerdo da figura; o direito é o espelho (x' = 1022 - x). */
export type GrupoMuscular = 'peito' | 'triceps' | 'biceps' | 'dorsal' | 'trapezio' | 'quadriceps' | 'panturrilha';

type Ponto = [number, number];

const ESQUERDO: Record<GrupoMuscular, Ponto[]> = {
  peito: [[392, 322], [425, 276], [480, 262], [509, 274], [509, 392], [470, 405], [425, 397], [396, 366]],
  triceps: [[300, 402], [274, 432], [258, 488], [262, 528], [292, 512], [306, 458]],
  biceps: [[334, 420], [312, 470], [300, 522], [338, 512], [358, 462]],
  dorsal: [[366, 402], [388, 402], [420, 470], [430, 600], [410, 620], [380, 520]],
  trapezio: [[430, 196], [509, 200], [509, 266], [450, 272], [380, 256], [400, 236], [425, 214]],
  quadriceps: [[376, 660], [420, 650], [505, 676], [502, 960], [462, 1000], [420, 960], [385, 840]],
  panturrilha: [[356, 1100], [400, 1088], [452, 1130], [462, 1250], [430, 1290], [388, 1230], [360, 1170]],
};

const NOME: Record<GrupoMuscular, string> = {
  peito: 'peito', triceps: 'tríceps', biceps: 'bíceps', dorsal: 'costas', trapezio: 'trapézio', quadriceps: 'quadríceps', panturrilha: 'panturrilha',
};

/* o que cada rotina (id em dados.ts) trabalha */
export const MUSCULOS_DA_ROTINA: Record<string, GrupoMuscular[]> = {
  a: ['peito', 'triceps'],
  b: ['dorsal', 'trapezio', 'biceps'],
  c: ['quadriceps', 'panturrilha'],
};

/* deduz os músculos pelo nome dos exercícios ("supino" -> peito, "rosca" -> bíceps...): usado em treinos enviados por arquivo */
const PALAVRAS: [GrupoMuscular[], RegExp][] = [
  [['peito'], /supino|crucifixo|peck|voador|flexao|crossover|peitoral|peito/],
  [['dorsal', 'trapezio'], /puxada|remada|barra fixa|pulldown|costas|dorsal|serrote|levantamento terra|encolhimento/],
  [['biceps'], /rosca|biceps|martelo/],
  [['triceps'], /triceps|frances|testa|mergulho|paralela|coice/],
  [['quadriceps', 'panturrilha'], /agachamento|leg ?press|extensora|flexora|panturrilha|afundo|stiff|avanco|passada|hack|gluteo|perna/],
];
const semAcento = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function inferirMusculos(nomes: string[]): GrupoMuscular[] {
  const texto = nomes.map(semAcento).join(' | ');
  return [...new Set(PALAVRAS.flatMap(([grupos, re]) => (re.test(texto) ? grupos : [])))];
}

/* as opções que a pessoa marca ao criar um treino: cada uma pinta um ou mais grupos */
export const OPCOES_MUSCULO: { rotulo: string; grupos: GrupoMuscular[] }[] = [
  { rotulo: 'Peito', grupos: ['peito'] },
  { rotulo: 'Costas', grupos: ['dorsal', 'trapezio'] },
  { rotulo: 'Bíceps', grupos: ['biceps'] },
  { rotulo: 'Tríceps', grupos: ['triceps'] },
  { rotulo: 'Pernas', grupos: ['quadriceps', 'panturrilha'] },
];

const caminho = (pts: Ponto[]): string => `M${pts.map((p) => p.join(' ')).join('L')}Z`;

/* os caminhos SVG (esquerdo e direito) dos grupos pedidos */
export function caminhosDos(grupos: GrupoMuscular[]): string[] {
  return grupos.flatMap((g) => [caminho(ESQUERDO[g]), caminho(ESQUERDO[g].map(([x, y]): Ponto => [1022 - x, y]))]);
}

/* texto para leitores de tela: "peito e tríceps" */
export function descricaoDos(grupos: GrupoMuscular[]): string {
  const nomes = grupos.map((g) => NOME[g]);
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0] ?? '';
}
