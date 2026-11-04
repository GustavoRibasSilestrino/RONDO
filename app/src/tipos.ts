/* Tipos do que o app guarda no aparelho. Datas são "AAAA-MM-DD"; momentos são milissegundos (Date.now()). */
export type Sexo = 'm' | 'f';

export type Usuario = { email: string; nome: string };

export type Perfil = {
  sexo: Sexo;
  idade: number;
  peso: number;      // kg
  altura: number;    // cm
  atividade: number; // multiplicador: 1.2 sedentário, 1.375 leve, 1.55 moderado, 1.725 intenso
  objetivo: number;  // multiplicador da meta: 0.85 perder, 1 manter, 1.1 ganhar
};

export type Serie = { kg: number; reps: number };
export type ExercicioFeito = { id: string; nome: string; series: Serie[] };

export type Treino = {
  data: string;
  rotina: string;
  nome: string;
  inicio: number;
  fim: number;
  exercicios: ExercicioFeito[];
};

export type SerieAtual = Serie & { ok: boolean };
export type TreinoAtual = {
  rotina: string;
  inicio: number;
  exercicios: { id: string; series: SerieAtual[] }[];
  descansoAte: number | null;
};

export type TipoRefeicao = 'cafe' | 'almoco' | 'lanche' | 'jantar';
export type Refeicao = {
  id: string;
  refeicao: TipoRefeicao;
  alimento: string;
  gramas: number;
  kcal: number;
  p: number;
  c: number;
  g: number;
};

/* Foto ou vídeo de uma publicação. O arquivo em si fica em lib/midia.ts; aqui só a referência e as medidas. */
export type Midia = { id: string; tipo: 'imagem' | 'video'; largura: number; altura: number; duracao?: number };

export type Comentario = { id: string; autor: string; texto: string; quando: number };

export type Post = {
  id: string;
  autor: string;
  texto: string;
  destaque?: string;
  quando: number;
  midia?: Midia[];
  grupo?: string;   // id do grupo onde foi publicado; sem isso, vai para o feed geral
};

export type CategoriaGrupo = 'treino' | 'corrida' | 'dieta' | 'constancia' | 'outro';

/* Grupo criado pela pessoa. Os grupos de demonstração ficam em dados.ts (CLUBES); entrar em qualquer um é estado.clubes[id]. */
export type Grupo = {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaGrupo;
  privado: boolean;
  cor: number;       // posição em CORES_GRUPO (lib/grupos.ts)
  dono: string;
  criado: number;
  codigo: string;    // código de convite
  meta?: string;
};

export type Recado = {
  id: string;
  criado: number;
  entrega: string;   // data em que o recado pode ser ouvido
  pergunta: string;
  segundos: number;
  uri: string;
};

export type Estado = {
  v: 1;
  usuario: Usuario | null;
  perfil: Perfil;
  treinos: Treino[];
  treinoAtual: TreinoAtual | null;
  refeicoes: Record<string, Refeicao[]>;
  agua: Record<string, number>;
  checkins: Record<string, boolean>;
  pesos: { data: string; kg: number }[];
  posts: Post[];
  curtidas: Record<string, boolean>;
  comentarios: Record<string, Comentario[]>;   // por id da publicação
  grupos: Grupo[];                             // os que a pessoa criou
  clubes: Record<string, boolean>;             // grupos em que a pessoa está (de demonstração ou criados por ela)
  recados: Recado[];
  semeado: boolean;
};
