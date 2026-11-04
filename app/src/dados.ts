/* Conteúdo fixo do app: rotinas de treino, alimentos, perguntas do dia, clubes e a comunidade de exemplo. */
import type { CategoriaGrupo, Perfil, TipoRefeicao } from './tipos';

export const perfilPadrao = (): Perfil => ({ sexo: 'm', idade: 28, peso: 78, altura: 178, atividade: 1.55, objetivo: 1 });

/* ---------- treino ---------- */
export type Exercicio = {
  id: string;
  nome: string;
  series: number;
  faixa: [number, number];   // faixa de repetições
  passo: number;             // kg por toque no "+" e no "−"
  inicial: number;           // carga inicial sugerida (kg)
};
export type Rotina = { id: string; nome: string; minutos: number; exercicios: Exercicio[] };

export const ROTINAS: Rotina[] = [
  {
    id: 'a', nome: 'Peito e Tríceps', minutos: 55,
    exercicios: [
      { id: 'supino', nome: 'Supino reto', series: 3, faixa: [6, 8], passo: 2.5, inicial: 70 },
      { id: 'inclinado', nome: 'Supino inclinado', series: 3, faixa: [8, 10], passo: 2, inicial: 24 },
      { id: 'crucifixo', nome: 'Crucifixo', series: 3, faixa: [10, 12], passo: 1, inicial: 14 },
      { id: 'triceps', nome: 'Tríceps corda', series: 3, faixa: [10, 12], passo: 2.5, inicial: 25 },
    ],
  },
  {
    id: 'b', nome: 'Costas e Bíceps', minutos: 50,
    exercicios: [
      { id: 'puxada', nome: 'Puxada na frente', series: 3, faixa: [8, 10], passo: 2.5, inicial: 55 },
      { id: 'remada', nome: 'Remada baixa', series: 3, faixa: [8, 10], passo: 2.5, inicial: 50 },
      { id: 'rosca', nome: 'Rosca direta', series: 3, faixa: [10, 12], passo: 1, inicial: 14 },
    ],
  },
  {
    id: 'c', nome: 'Pernas', minutos: 60,
    exercicios: [
      { id: 'agachamento', nome: 'Agachamento', series: 3, faixa: [6, 8], passo: 2.5, inicial: 80 },
      { id: 'legpress', nome: 'Leg press', series: 3, faixa: [10, 12], passo: 5, inicial: 160 },
      { id: 'extensora', nome: 'Cadeira extensora', series: 3, faixa: [12, 15], passo: 2.5, inicial: 40 },
    ],
  },
];

export const TODOS_EXERCICIOS: Exercicio[] = ROTINAS.flatMap((r) => r.exercicios);
export const exercicioPorId = (id: string): Exercicio | undefined => TODOS_EXERCICIOS.find((e) => e.id === id);

/* ---------- dieta: valores por 100 g, aproximados e no estilo da Tabela TACO ---------- */
export type Alimento = { id: string; nome: string; kcal: number; p: number; c: number; g: number };

export const ALIMENTOS: Alimento[] = [
  { id: 'arroz', nome: 'Arroz branco cozido', kcal: 128, p: 2.5, c: 28.1, g: 0.2 },
  { id: 'arroz-int', nome: 'Arroz integral cozido', kcal: 124, p: 2.6, c: 25.8, g: 1.0 },
  { id: 'feijao', nome: 'Feijão carioca cozido', kcal: 76, p: 4.8, c: 13.6, g: 0.5 },
  { id: 'feijao-p', nome: 'Feijão preto cozido', kcal: 77, p: 4.5, c: 14.0, g: 0.5 },
  { id: 'frango', nome: 'Peito de frango grelhado', kcal: 159, p: 32.0, c: 0, g: 2.5 },
  { id: 'patinho', nome: 'Patinho grelhado', kcal: 219, p: 35.9, c: 0, g: 7.3 },
  { id: 'ovo', nome: 'Ovo cozido', kcal: 146, p: 13.3, c: 0.6, g: 9.5 },
  { id: 'pao', nome: 'Pão francês', kcal: 300, p: 8.0, c: 58.6, g: 3.1 },
  { id: 'pao-int', nome: 'Pão integral', kcal: 253, p: 9.4, c: 49.9, g: 3.7 },
  { id: 'banana', nome: 'Banana prata', kcal: 98, p: 1.3, c: 26.0, g: 0.1 },
  { id: 'maca', nome: 'Maçã', kcal: 56, p: 0.3, c: 15.2, g: 0 },
  { id: 'mamao', nome: 'Mamão papaia', kcal: 40, p: 0.5, c: 10.4, g: 0.1 },
  { id: 'laranja', nome: 'Laranja pera', kcal: 37, p: 1.0, c: 8.9, g: 0.1 },
  { id: 'batata-doce', nome: 'Batata-doce cozida', kcal: 77, p: 0.6, c: 18.4, g: 0.1 },
  { id: 'batata', nome: 'Batata inglesa cozida', kcal: 52, p: 1.2, c: 11.9, g: 0 },
  { id: 'aveia', nome: 'Aveia em flocos', kcal: 394, p: 13.9, c: 66.6, g: 8.5 },
  { id: 'leite', nome: 'Leite integral', kcal: 61, p: 2.9, c: 4.3, g: 3.2 },
  { id: 'iogurte', nome: 'Iogurte natural', kcal: 51, p: 4.1, c: 1.9, g: 3.0 },
  { id: 'minas', nome: 'Queijo minas frescal', kcal: 264, p: 17.4, c: 3.2, g: 20.2 },
  { id: 'macarrao', nome: 'Macarrão cozido', kcal: 102, p: 3.4, c: 19.9, g: 0.5 },
  { id: 'alface', nome: 'Alface', kcal: 11, p: 1.3, c: 1.7, g: 0.2 },
  { id: 'tomate', nome: 'Tomate', kcal: 15, p: 1.1, c: 3.1, g: 0.2 },
  { id: 'brocolis', nome: 'Brócolis cozido', kcal: 25, p: 2.1, c: 4.4, g: 0.5 },
  { id: 'cenoura', nome: 'Cenoura cozida', kcal: 30, p: 0.8, c: 6.7, g: 0.2 },
  { id: 'azeite', nome: 'Azeite de oliva', kcal: 884, p: 0, c: 0, g: 100 },
];

export const REFEICOES: { id: TipoRefeicao; nome: string }[] = [
  { id: 'cafe', nome: 'Café da manhã' },
  { id: 'almoco', nome: 'Almoço' },
  { id: 'lanche', nome: 'Lanche' },
  { id: 'jantar', nome: 'Jantar' },
];

export const NIVEIS_ATIVIDADE = [
  { valor: 1.2, nome: 'Sedentário' },
  { valor: 1.375, nome: 'Leve' },
  { valor: 1.55, nome: 'Moderado' },
  { valor: 1.725, nome: 'Intenso' },
];
export const OBJETIVOS = [
  { valor: 0.85, nome: 'Perder' },
  { valor: 1, nome: 'Manter' },
  { valor: 1.1, nome: 'Ganhar' },
];

/* ---------- comunidade ---------- */
/* Grupos de demonstração (números e pessoas de exemplo; em produção vêm da API). `cor` é a posição em CORES_GRUPO. */
export const CLUBES: {
  id: string; nome: string; descricao: string; categoria: CategoriaGrupo; cor: number;
  membros: number; meta: string; progresso: number;
}[] = [
  { id: 'hipertrofia', nome: 'Hipertrofia iniciantes', descricao: 'Para quem está começando a ganhar força. Técnica, cargas e progressão, sem pressa e sem ego.', categoria: 'treino', cor: 0, membros: 2480, meta: 'Somar 500 treinos em novembro', progresso: 0.74 },
  { id: 'corrida', nome: 'Corrida de rua', descricao: 'Do primeiro quilômetro à meia maratona. Divida ritmos, rotas e provas.', categoria: 'corrida', cor: 4, membros: 5120, meta: 'Somar 2.500 km em novembro', progresso: 0.52 },
  { id: 'bairro', nome: 'Academia do bairro', descricao: 'Quem treina na mesma academia combina horários e se cobra com carinho.', categoria: 'treino', cor: 2, membros: 318, meta: 'Somar 300 treinos em novembro', progresso: 0.31 },
  { id: 'refeicoes', nome: 'Refeições registradas', descricao: 'Rotina de refeições anotadas todos os dias. O foco é constância, não restrição.', categoria: 'dieta', cor: 3, membros: 1260, meta: 'Registrar 3.000 refeições em novembro', progresso: 0.41 },
  { id: 'streak30', nome: 'Streak de 30 dias', descricao: 'Para quem quer fechar um mês inteiro sem quebrar a sequência. Uma folga por semana vale.', categoria: 'constancia', cor: 1, membros: 860, meta: 'Todo mundo com 30 dias seguidos', progresso: 0.63 },
];

export const POSTS_BASE: { id: string; autor: string; texto: string; destaque?: string; horas: number; grupo?: string }[] = [
  { id: 'p1', autor: 'Marina Rocha', texto: 'Primeira vez abaixo de 6\'00"/km. Ontem eu achava impossível.', destaque: '5,2 km em 31:08', horas: 0.2, grupo: 'corrida' },
  { id: 'p2', autor: 'Lucas Prado', texto: 'Semana fechada: 5 treinos e todas as refeições registradas.', destaque: '+18% de volume', horas: 1.1 },
  { id: 'p3', autor: 'Bia Almeida', texto: 'Dia de perna pesado. O streak segue vivo.', destaque: 'Streak de 41 dias', horas: 3, grupo: 'streak30' },
  { id: 'p4', autor: 'Tiago Santos', texto: 'Recorde pessoal no agachamento depois de 3 semanas estagnado.', destaque: '140 kg × 5', horas: 6, grupo: 'hipertrofia' },
  { id: 'p5', autor: 'Camila Duarte', texto: 'Meu primeiro 10 km sem parar. O ontem ficou lá atrás.', destaque: '10 km em 58:40', horas: 9, grupo: 'corrida' },
  { id: 'p6', autor: 'Rafa Lima', texto: 'Treino de sábado na academia do bairro, quem vem?', horas: 14, grupo: 'bairro' },
  { id: 'p7', autor: 'Lucas Prado', texto: 'Quinta semana seguida com as quatro refeições anotadas.', horas: 20, grupo: 'refeicoes' },
];

export const RANKING_BASE = [
  { nome: 'Bia Almeida', pontos: 338 },
  { nome: 'Tiago Santos', pontos: 322 },
  { nome: 'Lucas Prado', pontos: 301 },
  { nome: 'Camila Duarte', pontos: 276 },
  { nome: 'Rafa Lima', pontos: 249 },
  { nome: 'Marina Rocha', pontos: 205 },
];

/* ---------- recado de voz ---------- */
export const PERGUNTAS = [
  'Do que você tem orgulho esta semana?',
  'Por que você está começando agora?',
  'O que te tirou do sério hoje?',
  'Qual treino você quase pulou e fez mesmo assim?',
  'Como você quer se sentir daqui a 90 dias?',
  'O que você diria para quem você era ontem?',
  'Qual hábito pequeno está funcionando para você?',
];
export const PRAZOS_RECADO = [
  { dias: 30, nome: '30 dias' },
  { dias: 90, nome: '90 dias' },
  { dias: 180, nome: '6 meses' },
  { dias: 365, nome: '1 ano' },
];
