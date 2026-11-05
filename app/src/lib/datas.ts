/* Datas e números em português, sem depender do suporte a Intl do aparelho. */
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

const dois = (n: number) => String(n).padStart(2, '0');

/* "AAAA-MM-DD" no fuso do aparelho */
export const iso = (d: Date = new Date()): string => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;

export const doIso = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const somarDias = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/* segunda = 0 ... domingo = 6 */
export const diaDaSemana = (d: Date): number => (d.getDay() + 6) % 7;

export const dataCurta = (s: string): string => {
  const d = doIso(s);
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}`;
};
export const dataLonga = (s: string): string => {
  const d = doIso(s);
  return `${dois(d.getDate())} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
export const diaExtenso = (d: Date): string => `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
export const nomeDoDia = (d: Date): string => DIAS[d.getDay()];

/* 82.5 -> "82,5"; 1234.5 -> "1.234,5" */
export const fmt = (n: number, casas = 0): string => {
  const [inteiro, frac] = Math.abs(n).toFixed(casas).split('.');
  const milhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}${milhar}${frac ? `,${frac}` : ''}`;
};
/* inteiros sem casas, quebrados com uma */
export const num = (n: number): string => fmt(n, Number.isInteger(n) ? 0 : 1);

export const mmss = (segundos: number): string => {
  const s = Math.max(0, Math.round(segundos));
  return `${dois(Math.floor(s / 60))}:${dois(s % 60)}`;
};

/* "março de 2026" */
export const mesAno = (d: Date): string => `${MESES[d.getMonth()]} de ${d.getFullYear()}`;

/* "hoje", "ontem" ou "há 3 dias" */
export function haQuanto(data: string): string {
  const dias = Math.round((doIso(iso()).getTime() - doIso(data).getTime()) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  return `há ${dias} dias`;
}
