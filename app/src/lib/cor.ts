/* Contas de cor (#rrggbb): misturar duas cores, a luminância e o contraste (as fórmulas do WCAG). Usadas para pintar telas
   com a cor de cada mascote e ainda garantir a leitura do texto por cima (telas/perfil/TelaMascote.tsx). */

const rgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c: number[]): string => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;

/* `t` de 0 (só a) a 1 (só b) */
export const misturar = (a: string, b: string, t: number): string => {
  const x = rgb(a), y = rgb(b);
  return hex(x.map((v, i) => v + (y[i] - v) * t));
};

export const rgba = (h: string, a: number): string => `rgba(${rgb(h).join(',')},${a})`;

const linear = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
export const luminancia = (h: string): number => { const [r, g, b] = rgb(h).map(linear); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contraste = (a: string, b: string): number => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* a cor escurecida (sobre fundo claro) ou clareada (sobre fundo escuro) só o necessário para ter `minimo` de contraste com o fundo */
export function comContraste(cor: string, fundo: string, minimo: number): string {
  const para = luminancia(fundo) > 0.18 ? '#000000' : '#ffffff';
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const c = misturar(cor, para, Math.min(1, t));
    if (contraste(c, fundo) >= minimo) return c;
  }
  return para;
}
