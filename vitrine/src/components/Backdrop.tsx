import { useEffect, useRef } from "react";
import { onFrame } from "../lib/frame";
import { clamp, reduceMotion } from "../lib/util";

/* Horizonte (degradê fixo), trilho lateral e o eco da rolagem.
   O trilho: o ponto cheio é você e acompanha a rolagem; o anel vazio é o seu ontem, que vem logo atrás, mais devagar.
   Para o movimento ser liso: os pontos andam por transform (a placa de vídeo move, com fração de pixel; por `top` o navegador
   arredonda para pixel inteiro e o ponto lento anda aos soquinhos) e a aproximação depende do tempo, não do número de
   quadros (igual a 60, 120 ou 144 Hz, e sem pulo quando um quadro atrasa).
   Para não travar: as variáveis vão direto para quem usa (títulos com eco, horizonte), nunca para o <html> (mudar uma variável
   no <html> recalcula o estilo da página inteira); a altura da página e a do trilho ficam guardadas (sem medir a cada
   quadro); e o laço só roda enquanto há rolagem ou o trilho ainda está chegando no lugar. */
const ATRAS = 0.88;          // o ontem para um pouco antes de você
const PASSO_VOCE = 0.2;      // quanto do caminho você anda por quadro de 60 Hz
const PASSO_ONTEM = 0.055;   // o ontem vem mais devagar

export function Backdrop() {
  const sky = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const you = useRef<HTMLElement>(null);
  const ghost = useRef<HTMLElement>(null);

  useEffect(() => {
    const skyEl = sky.current!, railEl = rail.current!, youEl = you.current!, ghostEl = ghost.current!, root = document.documentElement;
    const echoes = [...document.querySelectorAll<HTMLElement>(".echo")];
    const last = new Map<string, string>();
    const set = (el: HTMLElement, key: string, name: string, value: string) => {
      if (last.get(key) === value) return;   // só escreve quando o valor muda
      last.set(key, value);
      el.style.setProperty(name, value);
    };

    let max = 1, alto = 0;
    /* o ponto no trilho: `pos` vai de 0 (alto) a 1 (fim), em pixels com fração */
    const por = (el: HTMLElement, key: string, pos: number) => {
      const valor = `translate3d(-50%, ${(pos * alto).toFixed(2)}px, 0) translateY(-50%)`;
      if (last.get(key) === valor) return;
      last.set(key, valor);
      el.style.transform = valor;
    };
    let railYou = 0, railGhost = 0;
    const measure = () => {
      max = Math.max(1, root.scrollHeight - innerHeight);
      alto = railEl.clientHeight;
      por(youEl, "y1", railYou); por(ghostEl, "y2", railGhost);   // a janela mudou de tamanho: os pontos voltam ao lugar certo
    };
    measure();
    railYou = clamp(scrollY / max, 0, 1);
    railGhost = railYou * ATRAS;
    por(youEl, "y1", railYou);
    por(ghostEl, "y2", railGhost);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    addEventListener("resize", measure);

    /* movimento reduzido: sem perseguição nem eco; os pontos só mostram onde a página está */
    if (reduceMotion) {
      const direto = () => { railYou = clamp(scrollY / max, 0, 1); railGhost = railYou * ATRAS; por(youEl, "y1", railYou); por(ghostEl, "y2", railGhost); };
      addEventListener("scroll", direto, { passive: true });
      return () => { ro.disconnect(); removeEventListener("resize", measure); removeEventListener("scroll", direto); };
    }

    let lastY = scrollY, vel = 0, off: (() => void) | null = null;
    const tick = (_: number, dt: number) => {
      const y = scrollY;
      vel += ((y - lastY) / dt - vel) * (1 - Math.pow(0.82, dt));   // px por quadro de 60 Hz; o decaimento depende do tempo
      lastY = y;
      const ga = Math.min(Math.abs(vel) / 26, 1).toFixed(3), gy = clamp(vel * 1.4, -26, 26).toFixed(1);
      echoes.forEach((el, i) => { set(el, `ga${i}`, "--ga", ga); set(el, `gy${i}`, "--gy", gy); });
      const p = clamp(y / max, 0, 1);
      railYou += (p - railYou) * (1 - Math.pow(1 - PASSO_VOCE, dt));
      railGhost += (p * ATRAS - railGhost) * (1 - Math.pow(1 - PASSO_ONTEM, dt));
      set(skyEl, "skyo", "--skyo", (1 - 0.6 * p).toFixed(3));
      // parado e tudo no lugar (menos de um décimo de pixel de distância): encosta no destino e o laço dorme até a próxima rolagem
      const folga = 0.1 / Math.max(1, alto);
      const chegou = Math.abs(vel) < 0.02 && Math.abs(p - railYou) < folga && Math.abs(p * ATRAS - railGhost) < folga;
      if (chegou) { railYou = p; railGhost = p * ATRAS; }
      por(youEl, "y1", railYou);
      por(ghostEl, "y2", railGhost);
      if (chegou) { off?.(); off = null; }
    };
    const wake = () => { if (!off) off = onFrame(tick); };
    wake();
    addEventListener("scroll", wake, { passive: true });
    return () => { off?.(); ro.disconnect(); removeEventListener("resize", measure); removeEventListener("scroll", wake); };
  }, []);

  return (
    <>
      <div className="sky" ref={sky} aria-hidden="true" />
      <div className="rail" ref={rail} aria-hidden="true"><i className="rail-ghost" ref={ghost} /><i className="rail-you" ref={you} /></div>
    </>
  );
}
