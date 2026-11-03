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

export type Post = { id: string; autor: string; texto: string; destaque?: string; quando: number };

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
  clubes: Record<string, boolean>;
  recados: Recado[];
  semeado: boolean;
};
