/* Tipos do que o app guarda no aparelho. Datas são "AAAA-MM-DD"; momentos são milissegundos (Date.now()). */
import type { Rotina } from './dados';

export type Sexo = 'm' | 'f';

/* `arroba` é o nome de usuário (sem o @) e `foto` é o id da foto de perfil (guardada em lib/midia.ts); sem eles, vale o nome e a inicial. */
export type Usuario = { email: string; nome: string; arroba?: string; foto?: string; papel?: string; verificado?: boolean; pro?: boolean; marketing?: boolean; selo?: string | null };

export type Perfil = {
  sexo: Sexo;
  idade: number;
  peso: number;      // kg
  altura: number;    // cm
  atividade: number; // multiplicador: 1.2 sedentário, 1.375 leve, 1.55 moderado, 1.725 intenso
  objetivo: number;  // multiplicador da meta: 0.85 perder, 1 manter, 1.1 ganhar
};

/* O que o RONDIN pergunta no cadastro e o app guarda no perfil da conta (chave "perfilFit" no servidor).
   Os textos são ids estáveis (ver lib/rondinRoteiro.ts), não frases, para poder mudar o texto sem perder dados. */
export type PerfilFit = {
  sotaque: string;          // o sotaque que a pessoa escolheu para o RONDIN
  objetivo: string;
  sexo: 'm' | 'f' | 'nd';
  altura: number;           // cm
  peso: number;             // kg
  pesoMeta: number;         // kg
  experiencia: string;
  diasSemana: number;
  local: string;
  duracao: number;          // minutos por treino
  horario: string;
  foco: string[];
  lesoes: string[];
  dia: string;              // movimento fora do treino
  dieta: string;
  sono: string;
  agua: string;
  trilha: string;
  motivacao: string;        // o jeito que a pessoa quer ser motivada
  inimigo: string;
  meta90: string;           // o que quer ouvir das pessoas em 90 dias
  criadoEm: string;         // ISO
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
export type Midia = { id: string; tipo: 'imagem' | 'video'; largura: number; altura: number; duracao?: number; url?: string };   // url: o arquivo no servidor, para os outros verem

export type CategoriaGrupo = 'treino' | 'corrida' | 'dieta' | 'constancia' | 'outro';

/* Publicações, cheers, comentários, seguidores e clubes ficam no servidor, compartilhados entre as pessoas (api/social.ts).
   Aqui só o resumo da pessoa, guardado no aparelho para o nível e as medalhas funcionarem sem rede. Não sobe para o servidor. */
export type ResumoSocial = { id: number; posts: number; cheersDados: number; seguindo: number; seguidores: number; comentarios: number; clubesCriados: number; naoLidas: number };

export type Recado = {
  id: string;
  criado: number;
  entrega: string;   // data em que o recado pode ser ouvido
  pergunta: string;
  segundos: number;
  uri: string;
  onda?: number[];   // o volume da gravação resumido em barras (0 a 1), para desenhar a onda
};

/* O lado público do perfil: descrição, títulos exibidos (ids de lib/nivel.ts) e publicações em destaque (ids de Post). */
export type PerfilSocial = { bio: string; titulos: string[]; destaques: string[] };

/* Avisos locais do perfil (medalhas e profissionais); os de cheers, comentários e seguidores vêm do servidor. `ref` é o id da medalha, quando for uma. */
export type Notificacao = { id: string; tipo: 'cheers' | 'comentario' | 'seguidor' | 'medalha' | 'profissional'; texto: string; quando: number; lida: boolean; ref?: string };


export type Estado = {
  v: 1;
  usuario: Usuario | null;
  perfil: Perfil;
  perfilFit: PerfilFit | null;                 // as respostas do RONDIN no cadastro (objetivo, rotina, sotaque...); null em contas antigas
  treinos: Treino[];
  treinoAtual: TreinoAtual | null;
  rotinasProprias: Rotina[];                   // treinos que a pessoa criou ou enviou; somam-se aos fixos de dados.ts
  refeicoes: Record<string, Refeicao[]>;
  agua: Record<string, number>;
  checkins: Record<string, boolean>;
  pesos: { data: string; kg: number }[];
  social: ResumoSocial;                        // o que o servidor diz sobre a atividade social da pessoa
  perfilSocial: PerfilSocial;
  semeadoSocial: boolean;
  recados: Recado[];
  notificacoes: Notificacao[];
  storiesVistos: Record<string, boolean>;      // stories de outras pessoas que você já viu, pelo id do servidor (os stories ficam no servidor)
  ultimoEmail: string;                         // o e-mail da última conta que entrou neste aparelho: outra conta começa com os dados limpos
  xpExtra: number;                             // XP somado ao da atividade; só o dono da conta usa (vem da API)
  pro: boolean;                                // plano PRO ativo, vindo da API
  tema: 'normal' | 'ultra';                      // a aparência escolhida; o Ultra só vale a partir do nível 15
  nivelAvisado: number | null;                 // o último nível que a pessoa já viu comemorado; null até a primeira leitura
  profissionais: Record<string, boolean>;      // profissionais para quem a pessoa enviou um pedido de contato, por id
  medalhasAvisadas: string[] | null;           // medalhas que já viraram notificação; null até a primeira leitura (as que já estavam abertas não avisam)
  semeado: boolean;
};
