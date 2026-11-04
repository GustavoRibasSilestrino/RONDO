import type { CSSProperties } from "react";

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mq = (q: string) => typeof matchMedia !== "undefined" && matchMedia(q).matches;
export const reduceMotion = mq("(prefers-reduced-motion: reduce)");
export const finePointer = mq("(hover: hover) and (pointer: fine)");
/* variáveis CSS inline (--x) sem brigar com o tipo CSSProperties */
export const vars = (o: Record<string, string | number>) => o as CSSProperties;
/* a linha do tempo do dia vira lista só quando falta altura para o palco fixo (celular deitado; igual ao CSS de styles/day.css).
   No celular em pé ela continua fixa: a rolagem anda pelos momentos de lado e só depois a página desce. */
export const STACK_QUERY = "(max-height: 520px)";
