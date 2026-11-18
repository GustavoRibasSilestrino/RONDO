/* Os treinos da pessoa: os que ela criou ou enviou. Os sugeridos (lib/treinoSugerido.ts) e os fixos (dados.ts) continuam valendo
   só para achar treinos e exercícios do histórico. */
import { ROTINAS, type Exercicio, type Rotina } from '../dados';
import type { Estado } from '../tipos';
import { rotinasSugeridas } from './treinoSugerido';
import { MUSCULOS_DA_ROTINA, type GrupoMuscular } from './musculos';

type ComRotinas = Pick<Estado, 'rotinasProprias'> & { perfilFit?: Estado['perfilFit']; perfil?: Estado['perfil'] };

/* os treinos que a pessoa jogou na lixeira: guardados no perfil (toda conta tem); os de antes podem estar em perfilFit */
export const treinosOcultos = (e: ComRotinas): string[] => [...new Set([...(e.perfil?.treinosOcultos ?? []), ...(e.perfilFit?.treinosOcultos ?? [])])];

/* desde 2026-11-18 (pedido do dono) o app não sugere mais treinos: a lista é só a dos treinos que a pessoa criou ou enviou */
export const todasRotinas = (e: ComRotinas): Rotina[] => [...(e.rotinasProprias ?? [])];
/* para achar no histórico: tudo o que o app já conheceu, inclusive os sugeridos e os fixos antigos */
const conhecidas = (e: ComRotinas): Rotina[] => [...todasRotinas(e), ...rotinasSugeridas(e.perfilFit), ...ROTINAS];
export const todosExercicios = (e: ComRotinas): Exercicio[] => todasRotinas(e).flatMap((r) => r.exercicios);
export const exercicioDe = (e: ComRotinas, id: string): Exercicio | undefined => conhecidas(e).flatMap((r) => r.exercicios).find((x) => x.id === id);
export const rotinaDe = (e: ComRotinas, id: string): Rotina | undefined => conhecidas(e).find((r) => r.id === id);
export const musculosDe = (r: Rotina): GrupoMuscular[] => r.musculos ?? MUSCULOS_DA_ROTINA[r.id] ?? [];

/* grava um treino próprio: troca o que tem o mesmo id ou acrescenta */
export function guardarRotina(e: Estado, r: Rotina): void {
  const i = e.rotinasProprias.findIndex((x) => x.id === r.id);
  if (i >= 0) e.rotinasProprias[i] = r; else e.rotinasProprias.push(r);
}

/* tempo estimado de um treino próprio: cerca de 4 min por série (carga, descanso), no mínimo 15 */
export const minutosDe = (exercicios: Exercicio[]): number => Math.max(15, exercicios.reduce((t, x) => t + x.series, 0) * 4);
