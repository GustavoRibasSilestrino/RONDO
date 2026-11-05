/* Os treinos que o app conhece: os fixos de dados.ts mais os que a pessoa criou ou enviou. */
import { ROTINAS, type Exercicio, type Rotina } from '../dados';
import type { Estado } from '../tipos';
import { MUSCULOS_DA_ROTINA, type GrupoMuscular } from './musculos';

type ComRotinas = Pick<Estado, 'rotinasProprias'>;

export const todasRotinas = (e: ComRotinas): Rotina[] => [...ROTINAS, ...(e.rotinasProprias ?? [])];
export const todosExercicios = (e: ComRotinas): Exercicio[] => todasRotinas(e).flatMap((r) => r.exercicios);
export const exercicioDe = (e: ComRotinas, id: string): Exercicio | undefined => todosExercicios(e).find((x) => x.id === id);
export const rotinaDe = (e: ComRotinas, id: string): Rotina | undefined => todasRotinas(e).find((r) => r.id === id);
export const musculosDe = (r: Rotina): GrupoMuscular[] => r.musculos ?? MUSCULOS_DA_ROTINA[r.id] ?? [];

/* tempo estimado de um treino próprio: cerca de 4 min por série (carga, descanso), no mínimo 15 */
export const minutosDe = (exercicios: Exercicio[]): number => Math.max(15, exercicios.reduce((t, x) => t + x.series, 0) * 4);
