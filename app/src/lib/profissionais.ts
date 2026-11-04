/* Profissionais verificados: nutricionistas (registro no CRN) e profissionais de educação física (registro no CREF).
   Em modo demonstração a lista é fictícia. Com a API, só aparecem profissionais com o registro conferido pela RONDO. */
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

export const PROFISSIONAIS: Profissional[] = [
  { id: 'n1', tipo: 'nutricionista', nome: 'Dra. Helena Duarte', registro: 'CRN-3 48213', especialidades: ['Emagrecimento', 'Reeducação alimentar'], cidade: 'São Paulo, SP', atende: 'Online e presencial', nota: 4.9, avaliacoes: 212, preco: 'R$ 180 a consulta', sobre: 'Plano alimentar flexível, sem cortar o que você gosta.' },
  { id: 'n2', tipo: 'nutricionista', nome: 'Rafael Moura', registro: 'CRN-4 11942', especialidades: ['Nutrição esportiva', 'Hipertrofia'], cidade: 'Rio de Janeiro, RJ', atende: 'Online', nota: 4.8, avaliacoes: 167, preco: 'R$ 150 a consulta', sobre: 'Dieta para quem treina pesado e quer ganhar massa magra.' },
  { id: 'n3', tipo: 'nutricionista', nome: 'Dra. Camila Vasques', registro: 'CRN-1 30577', especialidades: ['Gestantes', 'Saúde da mulher'], cidade: 'Brasília, DF', atende: 'Online', nota: 5.0, avaliacoes: 89, preco: 'R$ 200 a consulta', sobre: 'Acompanhamento da gestação ao pós-parto.' },
  { id: 'n4', tipo: 'nutricionista', nome: 'Dr. Pedro Aranha', registro: 'CRN-2 22891', especialidades: ['Diabetes', 'Saúde metabólica'], cidade: 'Porto Alegre, RS', atende: 'Online e presencial', nota: 4.7, avaliacoes: 134, preco: 'R$ 170 a consulta', sobre: 'Controle de glicemia sem abrir mão do sabor.' },
  { id: 'n5', tipo: 'nutricionista', nome: 'Júlia Nogueira', registro: 'CRN-9 05163', especialidades: ['Vegetarianismo', 'Veganismo'], cidade: 'Belo Horizonte, MG', atende: 'Online', nota: 4.9, avaliacoes: 98, preco: 'R$ 140 a consulta', sobre: 'Proteína e nutrientes completos em uma dieta sem carne.' },
  { id: 'n6', tipo: 'nutricionista', nome: 'Dr. Bruno Teixeira', registro: 'CRN-5 09876', especialidades: ['Performance', 'Corrida'], cidade: 'Salvador, BA', atende: 'Online', nota: 4.8, avaliacoes: 121, preco: 'R$ 160 a consulta', sobre: 'Estratégia de carboidratos para provas e treinos longos.' },

  { id: 'e1', tipo: 'educador', nome: 'Lucas Andrade', registro: 'CREF 034512-G/SP', especialidades: ['Hipertrofia', 'Força'], cidade: 'São Paulo, SP', atende: 'Online e presencial', nota: 4.9, avaliacoes: 301, preco: 'a partir de R$ 220 por mês', sobre: 'Periodização e progressão de carga, com ajuste a cada semana.' },
  { id: 'e2', tipo: 'educador', nome: 'Fernanda Lopes', registro: 'CREF 019876-G/RJ', especialidades: ['Emagrecimento', 'Funcional'], cidade: 'Rio de Janeiro, RJ', atende: 'Online', nota: 4.8, avaliacoes: 244, preco: 'a partir de R$ 180 por mês', sobre: 'Treinos curtos e intensos para quem tem pouco tempo.' },
  { id: 'e3', tipo: 'educador', nome: 'Thiago Barbosa', registro: 'CREF 045321-G/MG', especialidades: ['Corrida', 'Resistência'], cidade: 'Belo Horizonte, MG', atende: 'Online e presencial', nota: 4.9, avaliacoes: 176, preco: 'a partir de R$ 200 por mês', sobre: 'Do primeiro 5 km à meia maratona.' },
  { id: 'e4', tipo: 'educador', nome: 'Mariana Cruz', registro: 'CREF 027744-G/DF', especialidades: ['Treino feminino', 'Gestantes'], cidade: 'Brasília, DF', atende: 'Online', nota: 5.0, avaliacoes: 112, preco: 'a partir de R$ 190 por mês', sobre: 'Treino seguro e forte em todas as fases.' },
  { id: 'e5', tipo: 'educador', nome: 'Rodrigo Pinheiro', registro: 'CREF 038190-G/RS', especialidades: ['Reabilitação', 'Mobilidade'], cidade: 'Porto Alegre, RS', atende: 'Presencial', nota: 4.7, avaliacoes: 93, preco: 'a partir de R$ 250 por mês', sobre: 'Volta ao treino depois de lesão, com cuidado.' },
  { id: 'e6', tipo: 'educador', nome: 'Isabela Fontes', registro: 'CREF 051203-G/BA', especialidades: ['Calistenia', 'Mobilidade'], cidade: 'Salvador, BA', atende: 'Online', nota: 4.8, avaliacoes: 138, preco: 'a partir de R$ 170 por mês', sobre: 'Força com o peso do corpo, em casa ou no parque.' },
];

export const ROTULO_TIPO: Record<TipoProfissional, { plural: string; singular: string; registro: string }> = {
  nutricionista: { plural: 'Nutricionistas', singular: 'nutricionista', registro: 'CRN' },
  educador: { plural: 'Educação física', singular: 'profissional de educação física', registro: 'CREF' },
};
