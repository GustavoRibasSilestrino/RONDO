/* Grupos da comunidade: junta os de demonstração (dados.ts) com os que a pessoa criou, e guarda as cores e categorias. */
import type { NomeIcone } from '../componentes/Icone';
import { CLUBES, RANKING_BASE } from '../dados';
import type { CategoriaGrupo, Estado } from '../tipos';

/* capas: pares de cor (topo, fundo), todos na família do roxo do app */
export const CORES_GRUPO: readonly (readonly [string, string])[] = [
  ['#6d28d9', '#2e1065'],
  ['#8b5cf6', '#4c1d95'],
  ['#7c3aed', '#1e1b4b'],
  ['#a855f7', '#581c87'],
  ['#6366f1', '#312e81'],
  ['#4b4570', '#17142b'],
];

export const CATEGORIAS: { id: CategoriaGrupo; nome: string; icone: NomeIcone }[] = [
  { id: 'treino', nome: 'Treino', icone: 'treino' },
  { id: 'corrida', nome: 'Corrida', icone: 'pista' },
  { id: 'dieta', nome: 'Dieta', icone: 'dieta' },
  { id: 'constancia', nome: 'Constância', icone: 'chama' },
  { id: 'outro', nome: 'Outro', icone: 'grupo' },
];

export const categoria = (id: CategoriaGrupo) => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];

export type GrupoVista = {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaGrupo;
  privado: boolean;
  cor: number;
  dono: string;
  membros: number;
  meta?: string;
  progresso?: number;   // só nos de demonstração: o andamento da meta coletiva
  codigo?: string;      // só nos que a pessoa criou
  meu: boolean;         // a pessoa está no grupo
  proprio: boolean;     // a pessoa criou o grupo
};

export function listarGrupos(estado: Estado): GrupoVista[] {
  const demo: GrupoVista[] = CLUBES.map((c) => {
    const meu = !!estado.clubes[c.id];
    return { id: c.id, nome: c.nome, descricao: c.descricao, categoria: c.categoria, privado: false, cor: c.cor, dono: 'RONDO', membros: c.membros + (meu ? 1 : 0), meta: c.meta, progresso: c.progresso, meu, proprio: false };
  });
  const meus: GrupoVista[] = estado.grupos.map((g) => ({
    id: g.id, nome: g.nome, descricao: g.descricao, categoria: g.categoria, privado: g.privado, cor: g.cor, dono: g.dono,
    membros: 1, meta: g.meta, codigo: g.codigo, meu: !!estado.clubes[g.id], proprio: true,
  }));
  return [...meus, ...demo];
}

/* nomes para o grupo de rostinhos: nos de demonstração, gente do ranking; nos criados, só você */
export const membrosAmostra = (g: GrupoVista): string[] => (g.proprio ? ['Você'] : RANKING_BASE.slice(0, 4).map((r) => r.nome));

/* código de convite: 6 letras e números, sem 0/O/1/I para não confundir */
export function novoCodigo(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return s;
}
