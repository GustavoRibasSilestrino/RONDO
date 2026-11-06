/* O orbe do RONDIN no navegador: canvas, com ~1.100 pontos a 60 quadros por segundo. No celular usa Orbe.tsx (SVG). */
import React, { useEffect, useMemo, useRef } from 'react';
import { CAMPOS, EstadoOrbe, amplitude, corDoPonto, esfera, quadro } from '../lib/orbe';
import { useMovimentoReduzido } from '../lib/movimento';

const N = 1100;

export function Orbe({ tamanho, estado }: { tamanho: number; estado: EstadoOrbe }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const reduzido = useMovimentoReduzido();
  const pts = useMemo(() => esfera(N), []);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = tamanho * dpr;
    canvas.height = tamanho * dpr;
    ctx.scale(dpr, dpr);
    const saida = new Float32Array(N * CAMPOS);
    const R = tamanho * 0.36;
    let amp = 0;
    let anterior = 0;
    let quadroId = 0;
    const t0 = performance.now();

    const desenhar = (agora: number) => {
      const t = reduzido ? 2 : (agora - t0) / 1000;
      const dt = Math.min(0.1, Math.max(0, (agora - anterior) / 1000));
      anterior = agora;
      const alvo = reduzido ? 0.06 : amplitude(estadoRef.current, t);
      amp += (alvo - amp) * Math.min(1, dt * 9);   // suaviza: o orbe não pula de um estado a outro
      quadro(pts, t, amp, R, tamanho / 2, tamanho / 2, saida);
      ctx.clearRect(0, 0, tamanho, tamanho);
      for (const passe of [0, 1]) {   // primeiro os pontos de trás, depois os da frente
        for (let i = 0; i < N; i += 1) {
          const o = i * CAMPOS;
          if (saida[o + 5] !== passe) continue;
          ctx.globalAlpha = saida[o + 3];
          ctx.fillStyle = corDoPonto(saida[o + 4], saida[o + 3]);
          ctx.beginPath();
          ctx.arc(saida[o], saida[o + 1], Math.max(0.35, saida[o + 2]), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (!reduzido) quadroId = requestAnimationFrame(desenhar);
    };
    quadroId = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(quadroId);
  }, [tamanho, reduzido, pts]);

  return <canvas ref={ref} style={{ width: tamanho, height: tamanho, display: 'block' }} aria-hidden="true" />;
}
