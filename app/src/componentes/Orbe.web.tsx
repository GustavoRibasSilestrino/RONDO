/* O RONDIN no navegador: uma bolha líquida e brilhante (rosa, lilás e azul-piscina) desenhada num canvas a 60 quadros por
   segundo. No celular usa Orbe.tsx (SVG). A matemática da forma está em lib/bolha.ts.

   Ela está sempre viva: o contorno ondula devagar, as cores giram por dentro como líquido e os pontinhos de brilho piscam.
   Quando ele fala, as ondas ficam mais fundas e a bolha pulsa com a voz; pensando, as cores giram mais rápido. O brilho
   grande acompanha o cursor (a luz parece vir de onde a pessoa está) e cada toque, ou cada tecla (prop `pulso`), dá um
   "susto" que faz a bolha tremer. `hud` liga a auréola de luz em volta (para quando ele é o centro da tela). */
import React, { useEffect, useRef } from 'react';
import { BRILHOS, brilhoDoPonto, contorno, manchas, relevo, ritmo } from '../lib/bolha';
import { EstadoOrbe, amplitude } from '../lib/orbe';
import { useMovimentoReduzido } from '../lib/movimento';

type Props = {
  tamanho: number; estado: EstadoOrbe;
  hud?: boolean;                 // a auréola de luz em volta (o RONDIN em destaque)
  pulso?: number;                // cada vez que este número muda, a bolha treme (ex.: a cada tecla digitada)
  aoPressionar?: () => void;     // tocar na bolha
  rotulo?: string;               // o que o toque faz, para leitores de tela
};

export function Orbe({ tamanho, estado, hud, pulso, aoPressionar, rotulo }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const reduzido = useMovimentoReduzido();
  const susto = useRef(0);                         // 0 a 1: o tremor de um toque, que vai sumindo
  const mira = useRef({ x: -0.35, y: -0.45 });     // de onde vem a luz (-1 a 1)

  const primeiro = useRef(true);
  useEffect(() => {
    if (primeiro.current) { primeiro.current = false; return; }
    susto.current = Math.min(1, susto.current + 0.55);
  }, [pulso]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = tamanho * dpr;
    canvas.height = tamanho * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const c = tamanho / 2;
    const R = tamanho * (hud ? 0.31 : 0.36);
    let quadroId = 0, anterior = performance.now(), tempo = 3, forca = 0.08, voz = 0, lx = mira.current.x, ly = mira.current.y;

    const aoMover = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(240, window.innerWidth / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / Math.max(240, window.innerHeight / 2);
      mira.current = { x: Math.max(-0.75, Math.min(0.75, dx)), y: Math.max(-0.75, Math.min(0.75, dy)) };
    };
    if (!reduzido) window.addEventListener('pointermove', aoMover, { passive: true });

    const tracar = (pts: [number, number][]) => {
      const n = pts.length;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < n; i += 1) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
      }
      ctx.closePath();
    };
    const mancha = (x: number, y: number, r: number, cor: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${cor},${a.toFixed(3)})`);
      g.addColorStop(1, `rgba(${cor},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };

    const desenhar = (agora: number) => {
      const dt = Math.min(0.1, Math.max(0, (agora - anterior) / 1000));
      anterior = agora;
      const e = estadoRef.current;
      const { onda, velocidade } = ritmo(e);
      if (!reduzido) tempo += dt * velocidade;
      voz += ((e === 'falando' ? amplitude(e, agora / 1000) : 0) - voz) * Math.min(1, dt * 10);
      susto.current = Math.max(0, susto.current - dt * 1.6);
      forca += (onda + voz * 0.05 + susto.current * 0.09 - forca) * Math.min(1, dt * 6);
      lx += (mira.current.x - lx) * Math.min(1, dt * 3);
      ly += (mira.current.y - ly) * Math.min(1, dt * 3);
      const t = reduzido ? 3 : tempo;
      const raio = R * (1 + voz * 0.045 + susto.current * 0.03);

      ctx.clearRect(0, 0, tamanho, tamanho);

      /* a auréola: luz rosa e lilás atrás da bolha, que respira e cresce com a voz */
      if (hud) {
        const forte = 0.3 + 0.18 * voz + 0.05 * Math.sin(t * 1.1);
        const halo = ctx.createRadialGradient(c, c + R * 0.1, R * 0.5, c, c, tamanho * 0.5);
        halo.addColorStop(0, `rgba(214,120,255,${forte.toFixed(3)})`);
        halo.addColorStop(0.5, `rgba(140,80,255,${(forte * 0.35).toFixed(3)})`);
        halo.addColorStop(1, 'rgba(90,40,200,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, tamanho, tamanho);
      }

      const pts = contorno(c, c, raio, t, forca);
      ctx.save();
      tracar(pts);
      ctx.clip();

      /* a base: lilás em cima, rosa no meio, azul-piscina embaixo */
      const base = ctx.createLinearGradient(c, c - raio, c, c + raio);
      base.addColorStop(0, '#d79bff');
      base.addColorStop(0.42, '#e05acc');
      base.addColorStop(0.75, '#a560ee');
      base.addColorStop(1, '#5fd2f2');
      ctx.fillStyle = base;
      ctx.fillRect(c - raio * 1.3, c - raio * 1.3, raio * 2.6, raio * 2.6);

      /* as manchas que giram por dentro: o líquido */
      for (const m of manchas(t)) mancha(c + m.x * raio, c + m.y * raio, m.r * raio, m.cor, m.forca * 0.75);

      /* o relevo: cada calombo ganha um brilho rosado por dentro e cada dobra uma sombra roxa, alongada para o centro */
      for (const p of relevo(t)) {
        const ca = Math.cos(p.a), sa = Math.sin(p.a);
        if (p.calombo) {
          mancha(c + ca * raio * 0.6, c + sa * raio * 0.6, raio * 0.4, '255,210,252', 0.34 * p.peso);
        } else {
          ctx.save();
          ctx.translate(c + ca * raio * 0.78, c + sa * raio * 0.78);
          ctx.rotate(p.a);
          ctx.scale(1.3, 0.5);
          mancha(0, 0, raio * 0.48, '62,10,110', 0.62 * p.peso);
          ctx.restore();
        }
      }

      /* volume: a borda escurece um pouco, do lado contrário à luz */
      const sombra = ctx.createRadialGradient(c + lx * raio * 0.35, c + ly * raio * 0.35, raio * 0.35, c, c, raio * 1.08);
      sombra.addColorStop(0, 'rgba(40,10,70,0)');
      sombra.addColorStop(0.75, 'rgba(60,15,100,0.12)');
      sombra.addColorStop(1, 'rgba(45,10,80,0.58)');
      ctx.fillStyle = sombra;
      ctx.fillRect(c - raio * 1.3, c - raio * 1.3, raio * 2.6, raio * 2.6);

      /* o reflexo grande e macio, do lado de onde vem a luz */
      ctx.save();
      ctx.translate(c + lx * raio * 0.45, c + ly * raio * 0.5);
      ctx.rotate(-0.5);
      ctx.scale(1, 0.62);
      mancha(0, 0, raio * 0.48, '255,255,255', 0.32);
      ctx.restore();
      /* e um reflexo pequeno e mais forte dentro dele */
      mancha(c + lx * raio * 0.55, c + ly * raio * 0.6, raio * 0.12, '255,255,255', 0.5);

      /* luz de borda azulada embaixo (o reflexo do chão) */
      mancha(c - raio * 0.2, c + raio * 0.95, raio * 0.6, '160,240,255', 0.35);

      /* os pontinhos de brilho, o "molhado" */
      for (const b of BRILHOS) {
        const a = reduzido ? 0.6 : brilhoDoPonto(b.fase, t);
        mancha(c + b.x * raio, c + b.y * raio, b.r * raio * 3, '255,255,255', 0.9 * a);
      }
      ctx.restore();

      /* o fio de luz no contorno, mais claro do lado da luz */
      tracar(pts);
      const fio = ctx.createLinearGradient(c + lx * raio, c + ly * raio, c - lx * raio, c - ly * raio);
      fio.addColorStop(0, 'rgba(255,255,255,0.7)');
      fio.addColorStop(0.5, 'rgba(255,220,255,0.12)');
      fio.addColorStop(1, 'rgba(170,240,255,0.4)');
      ctx.strokeStyle = fio;
      ctx.lineWidth = Math.max(1, tamanho / 240);
      ctx.stroke();

      if (!reduzido) quadroId = requestAnimationFrame(desenhar);
    };
    quadroId = requestAnimationFrame(desenhar);
    return () => { cancelAnimationFrame(quadroId); window.removeEventListener('pointermove', aoMover); };
  }, [tamanho, reduzido, hud]);

  const tocar = () => { susto.current = Math.min(1, susto.current + 0.8); aoPressionar?.(); };
  if (!aoPressionar) return <canvas ref={ref} style={{ width: tamanho, height: tamanho, display: 'block' }} aria-hidden="true" />;
  return (
    <canvas
      ref={ref} role="button" tabIndex={0} aria-label={rotulo}
      onClick={tocar}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tocar(); } }}
      style={{ width: tamanho, height: tamanho, display: 'block', cursor: 'pointer', borderRadius: '50%', touchAction: 'manipulation' }}
    />
  );
}
