import { useEffect, useRef } from "react";
import { onFrame } from "../lib/frame";
import { clamp, reduceMotion } from "../lib/util";

/* Horizonte (degradê fixo), trilho lateral e o eco da rolagem.
   O laço escreve variáveis CSS no <html>: --ga/--gy (eco dos títulos) e --skyo (brilho do horizonte). */
const lastVar = new Map<string, string>();
function setVar(el: HTMLElement, key: string, name: string, value: string) {
  if (lastVar.get(key) === value) return;   // o laço roda a cada quadro: só escreve quando o valor muda
  lastVar.set(key, value);
  el.style.setProperty(name, value);
}

export function Backdrop() {
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const root = document.documentElement, railEl = rail.current!;
    let lastY = scrollY, vel = 0, railYou = 0, railGhost = 0;
    return onFrame((_, dt) => {
      const y = scrollY;
      vel += ((y - lastY) / dt - vel) * (1 - Math.pow(0.82, dt));   // px por quadro de 60 Hz; o decaimento depende do tempo
      lastY = y;
      setVar(root, "ga", "--ga", Math.min(Math.abs(vel) / 26, 1).toFixed(3));
      setVar(root, "gy", "--gy", clamp(vel * 1.4, -26, 26).toFixed(1));
      const max = root.scrollHeight - innerHeight, p = max > 0 ? y / max : 0;
      railYou += (p - railYou) * 0.22;
      railGhost += (p * 0.88 - railGhost) * 0.05;
      setVar(railEl, "y1", "--y1", railYou.toFixed(4));
      setVar(railEl, "y2", "--y2", railGhost.toFixed(4));
      setVar(root, "skyo", "--skyo", (1 - 0.6 * p).toFixed(3));
    });
  }, []);

  return (
    <>
      <div className="sky" aria-hidden="true" />
      <div className="rail" ref={rail} aria-hidden="true"><i className="rail-ghost" /><i className="rail-you" /></div>
    </>
  );
}
