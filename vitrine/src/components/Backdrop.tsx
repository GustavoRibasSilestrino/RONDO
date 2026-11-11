import { useEffect, useRef } from "react";
import { onFrame } from "../lib/frame";
import { clamp, reduceMotion } from "../lib/util";

/* Horizonte (degradê fixo) e o eco da rolagem nos títulos. (O trilho lateral, com as duas bolinhas, saiu em 2026-11-10.)
   Para não travar: as variáveis vão direto para quem usa (títulos com eco, horizonte), nunca para o <html> (mudar uma variável
   no <html> recalcula o estilo da página inteira); a altura da página fica guardada (sem medir a cada quadro); e o laço só
   roda enquanto há rolagem. */
export function Backdrop() {
  const sky = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const skyEl = sky.current!, root = document.documentElement;
    const echoes = [...document.querySelectorAll<HTMLElement>(".echo")];
    const last = new Map<string, string>();
    const set = (el: HTMLElement, key: string, name: string, value: string) => {
      if (last.get(key) === value) return;   // só escreve quando o valor muda
      last.set(key, value);
      el.style.setProperty(name, value);
    };

    let max = 1;
    const measure = () => { max = Math.max(1, root.scrollHeight - innerHeight); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    addEventListener("resize", measure);

    let lastY = scrollY, vel = 0, off: (() => void) | null = null;
    const tick = (_: number, dt: number) => {
      const y = scrollY;
      vel += ((y - lastY) / dt - vel) * (1 - Math.pow(0.82, dt));   // px por quadro de 60 Hz; o decaimento depende do tempo
      lastY = y;
      const ga = Math.min(Math.abs(vel) / 26, 1).toFixed(3), gy = clamp(vel * 1.4, -26, 26).toFixed(1);
      echoes.forEach((el, i) => { set(el, `ga${i}`, "--ga", ga); set(el, `gy${i}`, "--gy", gy); });
      set(skyEl, "skyo", "--skyo", (1 - 0.6 * clamp(y / max, 0, 1)).toFixed(3));
      if (Math.abs(vel) < 0.02) { off?.(); off = null; }   // parado: o laço dorme até a próxima rolagem
    };
    const wake = () => { if (!off) off = onFrame(tick); };
    wake();
    addEventListener("scroll", wake, { passive: true });
    return () => { off?.(); ro.disconnect(); removeEventListener("resize", measure); removeEventListener("scroll", wake); };
  }, []);

  return <div className="sky" ref={sky} aria-hidden="true" />;
}
