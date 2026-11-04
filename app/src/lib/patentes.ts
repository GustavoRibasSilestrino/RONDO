/* Patente da conta: a medalha de nível que aparece em destaque no perfil. Sobe com o nível (lib/nivel.ts). */
import type { ImageSourcePropType } from 'react-native';

export type Patente = { id: string; nome: string; nivel: number; img: ImageSourcePropType; verso: ImageSourcePropType };

export const PATENTES: Patente[] = [
  { id: 'bronze', nome: 'Bronze I', nivel: 2, img: require('../../assets/medalhas3d/bronze.png'), verso: require('../../assets/medalhas3d/bronze-verso.png') },
  { id: 'prata', nome: 'Prata II', nivel: 5, img: require('../../assets/medalhas3d/prata.png'), verso: require('../../assets/medalhas3d/prata-verso.png') },
  { id: 'ouro', nome: 'Ouro III', nivel: 8, img: require('../../assets/medalhas3d/ouro.png'), verso: require('../../assets/medalhas3d/ouro-verso.png') },
  { id: 'platina', nome: 'Platina IV', nivel: 12, img: require('../../assets/medalhas3d/platina.png'), verso: require('../../assets/medalhas3d/platina-verso.png') },
  { id: 'diamante', nome: 'Diamante V', nivel: 18, img: require('../../assets/medalhas3d/diamante.png'), verso: require('../../assets/medalhas3d/diamante-verso.png') },
  { id: 'kora', nome: 'KORA', nivel: 25, img: require('../../assets/medalhas3d/kora.png'), verso: require('../../assets/medalhas3d/kora-verso.png') },
];

/* a patente atual (a maior já alcançada) e a próxima; antes do nível 2, ainda não há patente */
export function patenteDe(nivel: number): { atual: Patente | null; proxima: Patente | null } {
  let atual: Patente | null = null;
  for (const p of PATENTES) if (nivel >= p.nivel) atual = p;
  const proxima = PATENTES.find((p) => p.nivel > nivel) ?? null;
  return { atual, proxima };
}
