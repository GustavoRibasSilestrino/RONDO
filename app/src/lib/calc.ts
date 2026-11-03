/* Regras do app: força estimada, progressão de carga, metas de dieta, constância e comparação com o ontem.
   São as fórmulas do documento do produto. Tudo é cálculo sobre o que a pessoa registra. */
import type { Estado, ExercicioFeito, Perfil, Serie } from '../tipos';
import { diaDaSemana, iso, somarDias } from './datas';

/* ---------- treino ---------- */
export const epley = (kg: number, reps: number): number => kg * (1 + reps / 30);   // 1RM estimado
export const volumeDe = (series: Serie[]): number => series.reduce((t, s) => t + s.kg * s.reps, 0);

const melhorDoExercicio = (e: ExercicioFeito): number => Math.max(...e.series.map((s) => epley(s.kg, s.reps)));

const sessoesDe = (estado: Estado, exId: string) =>
  estado.treinos.filter((t) => t.exercicios.some((e) => e.id === exId)).sort((a, b) => a.fim - b.fim);

export function melhor1RM(estado: Estado, exId: string): number {
  let melhor = 0;
  for (const t of estado.treinos) {
    for (const e of t.exercicios) if (e.id === exId) melhor = Math.max(melhor, melhorDoExercicio(e));
  }
  return melhor;
}

/* última sessão em que o exercício apareceu */
export function ultimaVez(estado: Estado, exId: string): { data: string; series: Serie[] } | null {
  const lista = sessoesDe(estado, exId);
  const t = lista[lista.length - 1];
  if (!t) return null;
  const e = t.exercicios.find((x) => x.id === exId);
  return e ? { data: t.data, series: e.series } : null;
}

/* progressão dupla: se todas as séries bateram o topo da faixa de repetições, sobe de 2 a 5%; senão, mantém */
export function proximaCarga(ultimo: { series: Serie[] } | null, faixa: [number, number]): { kg: number; sobe: boolean } | null {
  if (!ultimo) return null;
  const kg = Math.max(...ultimo.series.map((s) => s.kg));
  const noTopo = ultimo.series.every((s) => s.reps >= faixa[1]);
  if (!noTopo) return { kg, sobe: false };
  const novo = Math.round((kg * 1.035) / 0.5) * 0.5;
  return { kg: Math.max(novo, kg + 0.5), sobe: true };
}

/* estagnação: 3 semanas ou mais sem melhorar o 1RM */
export function estagnado(estado: Estado, exId: string, hoje: Date): boolean {
  const corte = somarDias(hoje, -21).getTime();
  const todas = sessoesDe(estado, exId).map((t) => {
    const e = t.exercicios.find((x) => x.id === exId) as ExercicioFeito;
    return { ts: t.fim, rm: melhorDoExercicio(e) };
  });
  const recentes = todas.filter((s) => s.ts >= corte);
  const antigas = todas.filter((s) => s.ts < corte);
  if (recentes.length < 3 || antigas.length === 0) return false;
  return Math.max(...recentes.map((s) => s.rm)) <= Math.max(...antigas.map((s) => s.rm)) + 0.01;
}

/* ---------- dieta ---------- */
export const tmb = (p: Perfil): number => 10 * p.peso + 6.25 * p.altura - 5 * p.idade + (p.sexo === 'm' ? 5 : -161);   // Mifflin-St Jeor

export function metaKcal(p: Perfil): number {
  const piso = p.sexo === 'm' ? 1500 : 1200;   // sem metas extremas
  return Math.max(piso, Math.round(tmb(p) * p.atividade * p.objetivo));
}

export function macrosMeta(p: Perfil, kcal: number): { p: number; c: number; g: number } {
  const prot = Math.round(p.peso * 2);
  const gord = Math.round(p.peso * 0.9);
  return { p: prot, g: gord, c: Math.max(0, Math.round((kcal - prot * 4 - gord * 9) / 4)) };
}

export function macrosDe(a: { kcal: number; p: number; c: number; g: number }, gramas: number) {
  const f = gramas / 100;
  return { kcal: Math.round(a.kcal * f), p: +(a.p * f).toFixed(1), c: +(a.c * f).toFixed(1), g: +(a.g * f).toFixed(1) };
}

export function totaisDia(estado: Estado, d: string) {
  return (estado.refeicoes[d] ?? []).reduce(
    (t, x) => ({ kcal: t.kcal + x.kcal, p: t.p + x.p, c: t.c + x.c, g: t.g + x.g }),
    { kcal: 0, p: 0, c: 0, g: 0 },
  );
}

/* ---------- constância ---------- */
export const diaAtivo = (estado: Estado, d: string): boolean =>
  estado.treinos.some((t) => t.data === d) || (estado.refeicoes[d]?.length ?? 0) >= 2 || !!estado.checkins[d];

/* dias seguidos com registro; uma falta isolada por semana (janela de 7 dias) não quebra a sequência */
export function streakAtual(estado: Estado, hoje: Date): number {
  let streak = 0;
  let ultimaFalta: number | null = null;
  for (let i = 0; i < 400; i++) {
    const d = iso(somarDias(hoje, -i));
    if (diaAtivo(estado, d)) { streak++; continue; }
    if (i === 0) continue;                                   // hoje ainda pode acontecer
    if (ultimaFalta !== null && i - ultimaFalta < 7) break;  // segunda falta na mesma janela
    ultimaFalta = i;
  }
  return streak;
}

export const inicioDaSemana = (d: Date): Date => somarDias(d, -diaDaSemana(d));

export type StatsSemana = { treinos: number; volume: number; refeicoes: number; agua: number };

/* até onde comparar: hoje, se já tem registro; senão ontem (hoje ainda está começando e não deve pesar contra você) */
export function diaDaComparacao(estado: Estado, hoje: Date): Date {
  return diaAtivo(estado, iso(hoje)) || (estado.agua[iso(hoje)] ?? 0) > 0 ? hoje : somarDias(hoje, -1);
}

/* números da semana até o mesmo dia da semana (0 = semana do dia de comparação, 1 = semana anterior) */
export function statsSemana(estado: Estado, hoje: Date, semanasAtras: number): StatsSemana {
  const fim = diaDaComparacao(estado, hoje);
  const decorridos = diaDaSemana(fim) + 1;
  const ini = somarDias(inicioDaSemana(fim), -7 * semanasAtras);
  let treinos = 0, volume = 0, refeicoes = 0, agua = 0;
  for (let i = 0; i < decorridos; i++) {
    const d = iso(somarDias(ini, i));
    for (const t of estado.treinos) {
      if (t.data !== d) continue;
      treinos++;
      volume += t.exercicios.reduce((v, e) => v + volumeDe(e.series), 0);
    }
    refeicoes += (estado.refeicoes[d] ?? []).length;
    agua += estado.agua[d] ?? 0;
  }
  return { treinos, volume, refeicoes, agua: agua / decorridos };
}

export type Comparacao = { treinos: number | null; volume: number | null; refeicoes: number | null; agua: number | null; geral: number | null };

/* variação em % de cada número e a média geral (o "+12%" do Você vs. Yesteryou) */
export function comparar(cur: StatsSemana, prev: StatsSemana): Comparacao {
  const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : null);
  const d = {
    treinos: pct(cur.treinos, prev.treinos),
    volume: pct(cur.volume, prev.volume),
    refeicoes: pct(cur.refeicoes, prev.refeicoes),
    agua: pct(cur.agua, prev.agua),
  };
  const v = Object.values(d).filter((x): x is number => x !== null);
  return { ...d, geral: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null };
}

/* pontos da semana no ranking: constância, nunca peso perdido ou aparência */
export function pontosSemana(estado: Estado, hoje: Date): number {
  let pts = 0;
  const ini = inicioDaSemana(hoje);
  for (let i = 0; i <= diaDaSemana(hoje); i++) {
    const d = iso(somarDias(ini, i));
    if (estado.treinos.some((t) => t.data === d)) pts += 30;
    if ((estado.refeicoes[d]?.length ?? 0) >= 3) pts += 20;
    if (estado.checkins[d]) pts += 10;
    if ((estado.agua[d] ?? 0) >= 8) pts += 5;
  }
  return pts;
}
