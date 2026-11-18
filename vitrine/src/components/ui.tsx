import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode, type RefObject } from "react";
import { gsap } from "../lib/gsap";
import { finePointer, reduceMotion, vars } from "../lib/util";
import { NOME, SIMBOLO } from "../marca";

/* ---------- símbolo da marca ---------- */
/* a marca nova (2026-11-18): o R sozinho (Mark) e o nome RONDO (Nome), traçados da arte do dono (src/marca.ts) */
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${SIMBOLO.largura} ${SIMBOLO.altura}`} aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d={SIMBOLO.d} />
    </svg>
  );
}

/* a marca em roxo (Logotipo RONDO.png, 2026-11-18): o nome branco dentro da pílula roxa, e o R branco no quadrado roxo. Mesmas
   proporções da arte; o roxo é o dela (#2d0161), com um fio lilás bem fino para a peça não sumir no fundo preto do site. */
const ROXO_MARCA = "#2d0161";
const PAD_X = 78, PAD_Y = 72;
export function NomePilula({ className }: { className?: string }) {
  const w = NOME.largura + PAD_X * 2, h = NOME.altura + PAD_Y * 2;
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <rect x="3" y="3" width={w - 6} height={h - 6} rx={92} fill={ROXO_MARCA} stroke="rgba(196,168,255,.35)" strokeWidth="6" />
      <path fill="#fff" fillRule="evenodd" transform={`translate(${PAD_X} ${PAD_Y})`} d={NOME.d} />
    </svg>
  );
}
export function IconeMarca({ className }: { className?: string }) {
  const L = 1024, rw = L * 0.6, e = rw / SIMBOLO.largura;
  const x = (L - rw) / 2 + rw * 0.015, y = (L - SIMBOLO.altura * e) / 2 - SIMBOLO.altura * e * 0.01;
  return (
    <svg className={className} viewBox={`0 0 ${L} ${L}`} aria-hidden="true">
      <rect x="6" y="6" width={L - 12} height={L - 12} rx={L * 0.23} fill={ROXO_MARCA} stroke="rgba(196,168,255,.35)" strokeWidth="12" />
      <path fill="#fff" fillRule="evenodd" transform={`translate(${x} ${y}) scale(${e})`} d={SIMBOLO.d} />
    </svg>
  );
}

export function Nome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${NOME.largura} ${NOME.altura}`} aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d={NOME.d} />
    </svg>
  );
}

/* ---------- revelar ao rolar ---------- */
type RevealProps = {
  as?: ElementType; className?: string; children?: ReactNode; style?: CSSProperties; id?: string; "aria-label"?: string;
  onSubmit?: (e: React.FormEvent) => void; innerRef?: RefObject<HTMLElement | null>;
};
export function Reveal({ as: Tag = "div", className = "", children, innerRef, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const setRef = (el: HTMLElement | null) => { ref.current = el; if (innerRef) innerRef.current = el; };
  /* GSAP + ScrollTrigger: sobe e aparece uma vez, quando o bloco chega perto do meio da tela */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;
    const subida = window.innerWidth <= 520 ? 32 : 24;
    const anim = gsap.fromTo(el, { opacity: 0, y: subida }, {
      opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
    return () => { anim.scrollTrigger?.kill(); anim.kill(); };
  }, []);
  return <Tag ref={setRef} className={`${className} reveal`} {...rest}>{children}</Tag>;
}

/* ---------- títulos: eco ao rolar e entrada palavra por palavra ---------- */
export type Part = string | { t: string; cls: string };
type TitleProps = { as?: ElementType; parts: Part | Part[]; echo?: boolean; split?: boolean; className?: string; style?: CSSProperties };
export function Title({ as: Tag = "h2", parts, echo = true, split = true, className = "", style }: TitleProps) {
  const list = Array.isArray(parts) ? parts : [parts];
  const text = list.map((p) => (typeof p === "string" ? p : p.t)).join("").replace(/\s+/g, " ").trim();
  const doSplit = split && !reduceMotion;
  const ref = useRef<HTMLElement>(null);
  /* GSAP + ScrollTrigger: as palavras sobem uma a uma de dentro da máscara quando o título chega à tela */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !doSplit) return;
    const palavras = el.querySelectorAll(".w > span");
    const anim = gsap.fromTo(palavras, { yPercent: 108 }, {
      yPercent: 0, duration: 0.95, ease: "power4.out", stagger: 0.055,
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
    return () => { anim.scrollTrigger?.kill(); anim.kill(); };
  }, [doSplit]);
  const words = (s: string, key: number) =>
    s.split(/(\s+)/).filter(Boolean).map((tok, j) =>
      /^\s+$/.test(tok) ? tok : (
        <span className="w" aria-hidden="true" key={`${key}-${j}`}><span>{tok}</span></span>
      ));
  const body = list.map((p, k) => {
    const s = typeof p === "string" ? p : p.t;
    const inner = doSplit ? words(s, k) : s;
    return typeof p === "string" ? <span key={k} style={{ display: "contents" }}>{inner}</span> : <span key={k} className={p.cls}>{inner}</span>;
  });
  const cls = ["display", echo ? "echo" : "", doSplit ? "js-split" : "", className].filter(Boolean).join(" ");
  return (
    <Tag ref={ref} className={cls} style={style} data-echo={echo ? text : undefined} aria-label={doSplit ? text : undefined}>
      {body}
    </Tag>
  );
}

/* ---------- luz que segue o cursor, dentro dos cards ---------- */
export function Spot() {
  return finePointer ? <i className="spot" aria-hidden="true" /> : null;
}
export function useSpotlight() {
  useEffect(() => {
    if (!finePointer) return;
    const sel = ".tool, .panel, .pro, .plan, .s-card";
    const move = (e: PointerEvent) => {
      const c = (e.target as Element | null)?.closest?.(sel) as HTMLElement | null;
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", `${e.clientX - r.left}px`);
      c.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => document.removeEventListener("pointermove", move);
  }, []);
}

/* ---------- animações sem fim só rodam na tela ----------
   O contorno dos botões, a respiração do hero, a chama e o pulso do dia de hoje pausam quando saem da tela
   (classe .is-off, ver styles/base.css): continuam iguais, só param de gastar quando ninguém está vendo. */
const SEMPRE = ".btn, .hero-in, .flame, .heat .c.today";
export function usePauseOffscreen() {
  useEffect(() => {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("is-off", !e.isIntersecting)));
    // todos esses elementos já existem quando a página monta (o menu do celular fica sempre no DOM)
    document.querySelectorAll(SEMPRE).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ---------- botões: o primário é atraído pelo cursor ---------- */
type BtnProps = {
  href?: string; kind?: "primary" | "ghost"; small?: boolean; type?: "button" | "submit"; disabled?: boolean;
  className?: string; children: ReactNode;
};
export function Btn({ href, kind = "primary", small, type = "button", disabled, className = "", children }: BtnProps) {
  const cls = `btn btn-${kind}${small ? " btn-sm" : ""} ${className}`.trim();
  const magnet = kind === "primary" && finePointer && !reduceMotion;
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget, r = el.getBoundingClientRect();
    el.style.setProperty("--tx", `${((e.clientX - r.left) / r.width - 0.5) * 10}px`);
    el.style.setProperty("--ty", `${((e.clientY - r.top) / r.height - 0.5) * 8}px`);
  };
  const onLeave = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.removeProperty("--tx");
    e.currentTarget.style.removeProperty("--ty");
  };
  const hooks = magnet ? { onPointerMove: onMove, onPointerLeave: onLeave } : {};
  return href
    ? <a href={href} className={cls} {...hooks}>{children}</a>
    : <button type={type} className={cls} disabled={disabled} aria-busy={disabled || undefined} {...hooks}>{children}</button>;
}

/* ---------- seção ---------- */
export function Section({ id, tone, children }: { id: string; tone?: "tint" | "tint-2"; children: ReactNode }) {
  return (
    <section className={`section${tone ? ` ${tone}` : ""}`} id={id}>
      {children}
    </section>
  );
}

/* contador que sobe até o valor (usado no +12% e no streak) */
export function useCountUp(target: number, run: boolean, delay: number, dur: number, pow = 4) {
  const [v, setV] = useState(run ? 0 : target);
  const raf = useRef(0);
  useEffect(() => {
    if (!run) { setV(target); return; }
    const t0 = performance.now() + delay;
    const tick = (t: number) => {
      const k = Math.min(Math.max((t - t0) / dur, 0), 1);
      setV(Math.round(target * (1 - Math.pow(1 - k, pow))));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, run, delay, dur, pow]);
  return v;
}
