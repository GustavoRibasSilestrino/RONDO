/* Água em mililitros (desde 2026-11-18; antes eram 8 copos). A meta ideal é a referência comum de 35 ml por kg de peso, entre 1,5 e
   4,5 L, arredondada de 50 em 50 ml. Os registros antigos eram em copos (números pequenos, até 8): cada copo vale 250 ml. */
import type { Estado, Perfil } from '../tipos';

export const COPO_ML = 250;
export const GARRAFA_ML = 500;

/* o valor guardado no dia, em ml (os antigos, em copos, viram ml) */
export const mlDe = (valor: number | undefined): number => {
  const v = valor ?? 0;
  return v > 0 && v <= 20 ? v * COPO_ML : v;
};
export const aguaDoDia = (e: Pick<Estado, 'agua'>, dia: string): number => mlDe(e.agua[dia]);

export const metaAgua = (p: Pick<Perfil, 'peso'>): number => {
  const ml = Math.round(((p.peso || 70) * 35) / 50) * 50;
  return Math.min(4500, Math.max(1500, ml));
};
export const bateuAgua = (e: Pick<Estado, 'agua' | 'perfil'>, dia: string): boolean => aguaDoDia(e, dia) >= metaAgua(e.perfil);

/* "1,25 L" */
export const litros = (ml: number): string => `${(ml / 1000).toFixed(ml % 100 === 0 ? 1 : 2).replace('.', ',')} L`;
