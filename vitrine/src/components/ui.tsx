import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode, type RefObject } from "react";
import { gsap } from "../lib/gsap";
import { useSeen } from "../lib/hooks";
import { finePointer, reduceMotion, vars } from "../lib/util";

/* ---------- símbolo da marca ---------- */
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="290 370 690 520" aria-hidden="true">
      <path fill="currentColor" d="M304 376H762C872 376 950 452 950 538C950 622 882 698 762 698H714L970 886H784C752 886 732 876 714 862L398 610C410 598 428 588 448 588H758C788 588 806 566 806 543C806 518 786 498 758 498H424Z" />
      <path fill="currentColor" fillOpacity=".7" d="M398 610C372 632 356 668 346 700L292 864H478L532 722Z" />
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
  href?: string; kind?: "primary" | "ghost"; small?: boolean; type?: "button" | "submit";
  className?: string; children: ReactNode;
};
export function Btn({ href, kind = "primary", small, type = "button", className = "", children }: BtnProps) {
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
    : <button type={type} className={cls} {...hooks}>{children}</button>;
}

/* ---------- seção com o batimento no topo ---------- */
const PULSE_X = [28, 64, 41, 72, 36, 58];
function Ecg({ k }: { k: number }) {
  const x = PULSE_X[k % 6] * 10;   // onde o pulso cai, em um eixo de 0 a 1000
  const [ref, seen] = useSeen<SVGSVGElement>(0.6, reduceMotion);
  return (
    <svg ref={ref} className={`ecg${seen || reduceMotion ? " on" : ""}`} viewBox="0 0 1000 26" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength={1} d={`M0 13H${x - 40}l7-3 8 3H${x - 12}l5-2 4 2 4 0 6-11 8 24 7-17 5 5H1000`} />
      <path pathLength={1} className="beat" d={`M${x - 12} 13l5-2 4 2 4 0 6-11 8 24 7-17 5 5`} />
    </svg>
  );
}
export function Section({ id, tone, ecg, children }: { id: string; tone?: "tint" | "tint-2"; ecg: number; children: ReactNode }) {
  return (
    <section className={`section${tone ? ` ${tone}` : ""}`} id={id}>
      {children}
      <Ecg k={ecg} />
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
