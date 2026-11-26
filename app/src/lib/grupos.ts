/* Clubes da comunidade: as cores das capas e as categorias. Os clubes em si vêm do servidor (api/social.ts). */
import type { NomeIcone } from '../componentes/Icone';
import type { CategoriaGrupo } from '../tipos';

/* capas: pares de cor (topo, fundo), todos na família do roxo do app */
export const CORES_GRUPO: readonly (readonly [string, string])[] = [
  ['#585858', '#252525'],
  ['#7b7b7b', '#3c3c3c'],
  ['#676767', '#222222'],
  ['#808080', '#3d3d3d'],
  ['#777777', '#3a3a3a'],
  ['#4a4a4a', '#171717'],
];

export const CATEGORIAS: { id: CategoriaGrupo; nome: string; icone: NomeIcone }[] = [
  { id: 'treino', nome: 'Treino', icone: 'treino' },
  { id: 'corrida', nome: 'Corrida', icone: 'pista' },
  { id: 'dieta', nome: 'Dieta', icone: 'dieta' },
  { id: 'constancia', nome: 'Constância', icone: 'chama' },
  { id: 'outro', nome: 'Outro', icone: 'grupo' },
];

export const categoria = (id: CategoriaGrupo) => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];
