/* Músculos de cada treino, desenhados sobre a figura de assets/corpo.png (1024 x 1536).
   Cada região é um polígono do lado esquerdo da figura; o direito é o espelho (x' = 1022 - x). */
export type GrupoMuscular = 'peito' | 'triceps' | 'biceps' | 'dorsal' | 'trapezio' | 'quadriceps' | 'panturrilha'
  | 'ombros' | 'abdomen' | 'antebraco' | 'gluteos' | 'posterior' | 'lombar';

type Ponto = [number, number];

const ESQUERDO: Record<GrupoMuscular, Ponto[]> = {
  peito: [[392, 322], [425, 276], [480, 262], [509, 274], [509, 392], [470, 405], [425, 397], [396, 366]],
  triceps: [[300, 402], [274, 432], [258, 488], [262, 528], [292, 512], [306, 458]],
  biceps: [[334, 420], [312, 470], [300, 522], [338, 512], [358, 462]],
  dorsal: [[366, 402], [388, 402], [420, 470], [430, 600], [410, 620], [380, 520]],
  trapezio: [[430, 196], [509, 200], [509, 266], [450, 272], [380, 256], [400, 236], [425, 214]],
  quadriceps: [[376, 660], [420, 650], [505, 676], [502, 960], [462, 1000], [420, 960], [385, 840]],
  panturrilha: [[356, 1100], [400, 1088], [452, 1130], [462, 1250], [430, 1290], [388, 1230], [360, 1170]],
  ombros: [[392, 262], [360, 272], [330, 300], [312, 350], [304, 398], [334, 410], [368, 382], [392, 322]],
  abdomen: [[440, 412], [505, 404], [505, 640], [455, 628], [438, 560], [434, 470]],
  antebraco: [[262, 540], [300, 530], [318, 560], [296, 650], [268, 700], [246, 690], [248, 600]],
  /* a figura é de frente: glúteos, posterior de coxa e lombar ficam nas costas e não aparecem pintados (só no texto) */
  gluteos: [], posterior: [], lombar: [],
};

const NOME: Record<GrupoMuscular, string> = {
  peito: 'peito', triceps: 'tríceps', biceps: 'bíceps', dorsal: 'costas', trapezio: 'trapézio', quadriceps: 'quadríceps', panturrilha: 'panturrilha',
  ombros: 'ombros', abdomen: 'abdômen', antebraco: 'antebraço', gluteos: 'glúteos', posterior: 'posterior de coxa', lombar: 'lombar',
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
  [['ombros'], /desenvolvimento|elevacao lateral|elevacao frontal|crucifixo inverso|ombro|deltoide|arnold/],
  [['biceps'], /rosca|biceps|martelo/],
  [['triceps'], /triceps|frances|testa|mergulho|paralela|coice/],
  [['antebraco'], /antebraco|punho|rosca inversa/],
  [['abdomen'], /abdominal|abdomen|prancha|crunch|elevacao de pernas|russian|obliquo/],
  [['quadriceps'], /agachamento|leg ?press|extensora|afundo|avanco|passada|hack|perna/],
  [['posterior'], /flexora|stiff|terra romeno|good morning|posterior/],
  [['gluteos'], /gluteo|elevacao pelvica|hip thrust|abducao|coice de gluteo|ponte/],
  [['panturrilha'], /panturrilha|gemeos/],
  [['lombar'], /lombar|hiperextensao|extensao lombar|levantamento terra/],
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
  { rotulo: 'Ombros', grupos: ['ombros'] },
  { rotulo: 'Bíceps', grupos: ['biceps'] },
  { rotulo: 'Tríceps', grupos: ['triceps'] },
  { rotulo: 'Antebraço', grupos: ['antebraco'] },
  { rotulo: 'Abdômen', grupos: ['abdomen'] },
  { rotulo: 'Quadríceps', grupos: ['quadriceps'] },
  { rotulo: 'Posterior de coxa', grupos: ['posterior'] },
  { rotulo: 'Glúteos', grupos: ['gluteos'] },
  { rotulo: 'Panturrilha', grupos: ['panturrilha'] },
  { rotulo: 'Lombar', grupos: ['lombar'] },
];

const caminho = (pts: Ponto[]): string => `M${pts.map((p) => p.join(' ')).join('L')}Z`;

/* os caminhos SVG (esquerdo e direito) dos grupos pedidos */
export function caminhosDos(grupos: GrupoMuscular[]): string[] {
  return grupos.filter((g) => ESQUERDO[g]?.length).flatMap((g) => [caminho(ESQUERDO[g]), caminho(ESQUERDO[g].map(([x, y]): Ponto => [1022 - x, y]))]);
}

/* texto para leitores de tela: "peito e tríceps" */
export function descricaoDos(grupos: GrupoMuscular[]): string {
  const nomes = grupos.map((g) => NOME[g]);
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0] ?? '';
}
