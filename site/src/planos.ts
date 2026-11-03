export type Plano = {
  id: string;
  nome: string;
  preco: string;
  publico: "usuario" | "profissional";
  destaque?: boolean;
  itens: string[];
};

export const planos: Plano[] = [
  {
    id: "pro-mensal",
    nome: "PRO",
    preco: "R$ 14,90",
    publico: "usuario",
    destaque: true,
    itens: ["Ranking com prêmios mensais", "Clubes VIP", "Estatísticas completas", "Recursos de IA (em breve)"],
  },
  {
    id: "profissional",
    nome: "Profissional",
    preco: "R$ 59",
    publico: "profissional",
    itens: ["Perfil verificado na busca", "Até 25 alunos", "Montagem de planos e painel", "Chat com alunos"],
  },
  {
    id: "profissional-plus",
    nome: "Profissional+",
    preco: "R$ 99",
    publico: "profissional",
    itens: ["Alunos ilimitados", "Rascunhos e resumos por IA", "Tudo do plano Profissional"],
  },
];
