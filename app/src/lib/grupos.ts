/* Clubes da comunidade: as cores das capas e as categorias. Os clubes em si vêm do servidor (api/social.ts). */
import type { NomeIcone } from '../componentes/Icone';
import type { CategoriaGrupo } from '../tipos';

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
