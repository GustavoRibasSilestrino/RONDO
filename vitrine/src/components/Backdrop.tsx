import { useEffect, useRef } from "react";
import { onFrame } from "../lib/frame";
import { clamp, reduceMotion } from "../lib/util";

/* Horizonte (degradê fixo), trilho lateral e o eco da rolagem.
   Para não travar: as variáveis vão direto para quem usa (títulos com eco, horizonte, trilho), nunca para o <html>
   (mudar uma variável no <html> recalcula o estilo da página inteira); a altura da página fica guardada (sem medir a
   cada quadro); e o laço só roda enquanto há rolagem ou o trilho ainda está chegando no lugar. */
export function Backdrop() {
  const sky = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const skyEl = sky.current!, railEl = rail.current!, root = document.documentElement;
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

    let lastY = scrollY, vel = 0, railYou = scrollY / max, railGhost = railYou * 0.88, off: (() => void) | null = null;
    const tick = (_: number, dt: number) => {
      const y = scrollY;
      vel += ((y - lastY) / dt - vel) * (1 - Math.pow(0.82, dt));   // px por quadro de 60 Hz; o decaimento depende do tempo
      lastY = y;
      const ga = Math.min(Math.abs(vel) / 26, 1).toFixed(3), gy = clamp(vel * 1.4, -26, 26).toFixed(1);
      echoes.forEach((el, i) => { set(el, `ga${i}`, "--ga", ga); set(el, `gy${i}`, "--gy", gy); });
      const p = clamp(y / max, 0, 1);
      railYou += (p - railYou) * 0.22;
      railGhost += (p * 0.88 - railGhost) * 0.05;
      set(railEl, "y1", "--y1", railYou.toFixed(4));
      set(railEl, "y2", "--y2", railGhost.toFixed(4));
      set(skyEl, "skyo", "--skyo", (1 - 0.6 * p).toFixed(3));
      // parado e tudo no lugar: o laço dorme até a próxima rolagem
      if (Math.abs(vel) < 0.02 && Math.abs(p - railYou) < 0.0005 && Math.abs(p * 0.88 - railGhost) < 0.0005) { off?.(); off = null; }
    };
    const wake = () => { if (!off) off = onFrame(tick); };
    wake();
    addEventListener("scroll", wake, { passive: true });
    return () => { off?.(); ro.disconnect(); removeEventListener("resize", measure); removeEventListener("scroll", wake); };
  }, []);

  return (
    <>
      <div className="sky" ref={sky} aria-hidden="true" />
      <div className="rail" ref={rail} aria-hidden="true"><i className="rail-ghost" /><i className="rail-you" /></div>
    </>
  );
}
