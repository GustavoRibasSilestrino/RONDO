/* A onda do recado: o volume da voz resumido em barras. Funções puras, usadas pela gravação e pelo diário. */
export const BARRAS = 40;

/* volume em dBFS (-160 a 0) para a altura da barra (0 a 1) */
export const nivelDe = (db: number | undefined): number => (db === undefined ? 0 : Math.min(1, Math.max(0.06, (db + 55) / 55)));

/* onda de enfeite, para quando ainda não há som */
export const ONDA_PARADA: number[] = Array.from({ length: BARRAS }, (_, i) => Math.min(1, (18 + Math.abs(Math.sin(i * 1.7) * 52) + ((i * 37) % 22)) / 100));

/* resume a gravação inteira em BARRAS barras, para guardar e mostrar no diário */
export function resumir(niveis: number[]): number[] {
  if (!niveis.length) return [];
  return Array.from({ length: BARRAS }, (_, i) => {
    const de = Math.floor((i / BARRAS) * niveis.length), ate = Math.max(de + 1, Math.floor(((i + 1) / BARRAS) * niveis.length));
    const fatia = niveis.slice(de, ate);
    return Math.round((fatia.reduce((a, b) => a + b, 0) / fatia.length) * 100) / 100;
  });
}
