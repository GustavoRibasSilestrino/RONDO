import type { CSSProperties } from "react";

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mq = (q: string) => typeof matchMedia !== "undefined" && matchMedia(q).matches;
export const reduceMotion = mq("(prefers-reduced-motion: reduce)");
export const finePointer = mq("(hover: hover) and (pointer: fine)");
/* variáveis CSS inline (--x) sem brigar com o tipo CSSProperties */
export const vars = (o: Record<string, string | number>) => o as CSSProperties;
/* a linha do tempo do dia vira lista quando falta largura ou altura para o palco fixo (igual ao CSS de styles/day.css) */
export const STACK_QUERY = "(max-width: 980px), (max-height: 620px)";
