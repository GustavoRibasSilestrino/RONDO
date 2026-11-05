/* Profissionais verificados: nutricionistas (registro no CRN) e profissionais de educação física (registro no CREF). */
export type TipoProfissional = 'nutricionista' | 'educador';

export type Profissional = {
  id: string;
  tipo: TipoProfissional;
  nome: string;
  registro: string;        // CRN ou CREF
  especialidades: string[];
  cidade: string;
  atende: 'Online' | 'Presencial' | 'Online e presencial';
  nota: number;
  avaliacoes: number;
  preco: string;
  sobre: string;
};

/* Só aparecem profissionais com o registro conferido pela equipe. A API ainda não lista os verificados, então a lista começa vazia. */
export const PROFISSIONAIS: Profissional[] = [];

export const ROTULO_TIPO: Record<TipoProfissional, { plural: string; singular: string; registro: string }> = {
  nutricionista: { plural: 'Nutricionistas', singular: 'nutricionista', registro: 'CRN' },
  educador: { plural: 'Educação física', singular: 'profissional de educação física', registro: 'CREF' },
};
