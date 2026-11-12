/* O orbe do RONDIN no navegador: canvas, com ~1.100 pontos a 60 quadros por segundo. No celular usa Orbe.tsx (SVG).
   Só a esfera de pontos (a moldura de instrumento em volta saiu em 2026-11-12, a pedido do dono). Com `hud`, ganha a
   auréola de luz roxa atrás, inclina na direção do cursor, acende com o cursor em cima e cada toque (ou cada tecla, pela
   prop `pulso`) solta uma onda em volta. Tudo é desenhado no mesmo canvas, num laço só.
   Só os pontos onde o cursor passa se soltam e fogem dele, abrindo um buraco que anda junto; o resto da esfera fica
   inteiro, e cada ponto volta ao lugar no seu ritmo. Com o dedo vale o mesmo enquanto ele arrasta; soltou, a esfera se
   refaz. Parado para quem pede menos movimento.
   Desde 2026-11-12 tem o visual do RONDIN 3D feito no Blender (brand/rondin-3d): um miolo escuro esconde em parte os
   pontos de trás, e os acesos da frente ganham um brilho em volta. */
import React, { useEffect, useMemo, useRef } from 'react';
import { CAMPOS, EstadoOrbe, amplitude, corDoPonto, esfera, quadro } from '../lib/orbe';
import { useMovimentoReduzido } from '../lib/movimento';

const N = 1100;
const DURACAO_ONDA = 0.75;   // segundos que a onda de um toque leva para sumir

type Props = {
  tamanho: number; estado: EstadoOrbe;
  hud?: boolean;                 // a moldura de instrumento em volta da esfera
  pulso?: number;                // cada vez que este número muda, o orbe solta uma onda (ex.: a cada tecla digitada)
  aoPressionar?: () => void;     // tocar no orbe
  rotulo?: string;               // o que o toque faz, para leitores de tela
};

export function Orbe({ tamanho, estado, hud, pulso, aoPressionar, rotulo }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const reduzido = useMovimentoReduzido();
  const pts = useMemo(() => esfera(N), []);
  const ondas = useRef<number[]>([]);          // instante em que cada onda começou
  const mira = useRef({ x: 0, y: 0, dentro: false, desfaz: 0, cx: -9999, cy: -9999 });   // para onde o cursor puxa a esfera (-1 a 1), se está em cima, o quanto os pontos se soltam (0 a 1) e onde está o cursor no canvas

  /* uma onda nova quando a prop `pulso` muda (a primeira leitura não conta) */
  const primeiro = useRef(true);
  useEffect(() => {
    if (primeiro.current) { primeiro.current = false; return; }
    ondas.current.push(performance.now());
  }, [pulso]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = tamanho * dpr;
    canvas.height = tamanho * dpr;
    ctx.scale(dpr, dpr);
    const saida = new Float32Array(N * CAMPOS);
    /* cada ponto tem o seu jeito de se soltar: uma direção, uma distância e uma velocidade de voltar */
    const solto = new Float32Array(N);                 // 0 = no lugar, 1 = solto por inteiro
    const fugaX = new Float32Array(N), fugaY = new Float32Array(N), fugaD = new Float32Array(N), fugaV = new Float32Array(N);
    let semente = 11;
    const rnd = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647; };
    for (let i = 0; i < N; i += 1) {
      const a = rnd() * Math.PI * 2;
      fugaX[i] = Math.cos(a); fugaY[i] = Math.sin(a);
      fugaD[i] = 0.35 + rnd() * 0.75;                  // em raios
      fugaV[i] = 1.6 + rnd() * 3.4;
    }
    const c = tamanho / 2;
    const R = tamanho * 0.36;   // sem a moldura de instrumento (tirada em 2026-11-12): só a esfera
    const fio = Math.max(1, tamanho / 210);   // espessura dos traços, proporcional ao tamanho
    let amp = 0, anterior = 0, quadroId = 0, brilho = 0, mx = 0, my = 0;
    /* o visual do RONDIN 3D (brand/rondin-3d, feito no Blender): o brilho em volta de cada ponto aceso é um "carimbo"
       desenhado uma vez só e repetido em modo de somar luz, que é leve mesmo com 1.100 pontos */
    const carimbo = document.createElement('canvas');
    carimbo.width = carimbo.height = 64;
    const cc = carimbo.getContext('2d');
    if (cc) {
      const g = cc.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(226,206,255,0.9)');
      g.addColorStop(0.25, 'rgba(176,128,255,0.35)');
      g.addColorStop(1, 'rgba(124,58,237,0)');
      cc.fillStyle = g;
      cc.fillRect(0, 0, 64, 64);
    }
    const t0 = performance.now();

    /* o cursor: a esfera se inclina na direção dele, de qualquer lugar da janela; perto dela, os pontos se soltam */
    const aoMover = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const px = e.clientX - (r.left + r.width / 2), py = e.clientY - (r.top + r.height / 2);
      if (hud) {
        mira.current.x = Math.max(-1, Math.min(1, px / Math.max(200, window.innerWidth / 2)));
        mira.current.y = Math.max(-1, Math.min(1, py / Math.max(200, window.innerHeight / 2)));
      }
      const d = Math.hypot(px, py), raioTela = R * (r.width / tamanho);
      mira.current.dentro = d < r.width / 2;
      /* 1 no miolo, caindo até 0 um pouco fora da borda: afastar o cursor monta a esfera de novo, aos poucos */
      mira.current.desfaz = Math.max(0, Math.min(1, 1 - (d - raioTela * 0.25) / (raioTela * 1.15)));
      mira.current.cx = px * (tamanho / r.width) + c;
      mira.current.cy = py * (tamanho / r.height) + c;
    };
    const aoSoltar = (e: PointerEvent) => { if (e.pointerType !== 'mouse') { mira.current.desfaz = 0; mira.current.cx = -9999; } };
    const aoSairDaJanela = () => { mira.current.desfaz = 0; mira.current.dentro = false; mira.current.cx = -9999; };
    if (!reduzido) {
      window.addEventListener('pointermove', aoMover, { passive: true });
      window.addEventListener('pointerup', aoSoltar, { passive: true });
      window.addEventListener('pointercancel', aoSoltar, { passive: true });
      document.documentElement.addEventListener('pointerleave', aoSairDaJanela);
    }

    const lilas = (a: number) => `rgba(196,168,255,${a.toFixed(3)})`;
    const arco = (r: number, de: number, ate: number, cor: string, larg: number) => {
      ctx.strokeStyle = cor; ctx.lineWidth = larg;
      ctx.beginPath(); ctx.arc(c, c, r, de, ate); ctx.stroke();
    };

    const desenharOndas = (agora: number) => {
      ondas.current = ondas.current.filter((inicio) => agora - inicio < DURACAO_ONDA * 1000);
      for (const inicio of ondas.current) {
        const p = (agora - inicio) / (DURACAO_ONDA * 1000), suave = 1 - (1 - p) * (1 - p);
        arco(R * 1.02 + (tamanho * 0.47 - R) * suave, 0, Math.PI * 2, lilas(0.6 * (1 - p)), fio * 1.4);
      }
    };

    const desenhar = (agora: number) => {
      const t = reduzido ? 2 : (agora - t0) / 1000;
      const dt = Math.min(0.1, Math.max(0, (agora - anterior) / 1000));
      anterior = agora;
      const e = estadoRef.current;
      brilho += ((mira.current.dentro ? 1 : 0) - brilho) * Math.min(1, dt * 8);
      const alvo = reduzido ? 0.06 : amplitude(e, t) + 0.1 * brilho;
      amp += (alvo - amp) * Math.min(1, dt * 9);   // suaviza: o orbe não pula de um estado a outro
      mx += (mira.current.x - mx) * Math.min(1, dt * 4);
      my += (mira.current.y - my) * Math.min(1, dt * 4);
      quadro(pts, t, amp, R, c, c, saida, 0.42 + my * 0.5, mx * 0.9);
      /* só os pontos perto do cursor se soltam (pedido do dono): fogem dele, com um redemoinho leve; o resto da esfera fica
         inteiro. Afastou o cursor, cada ponto volta ao lugar no seu ritmo. */
      const cxm = mira.current.cx, cym = mira.current.cy, alcance = R * 0.5;
      for (let i = 0; i < N; i += 1) {
        const o = i * CAMPOS;
        const bx = saida[o], by = saida[o + 1];
        const ax = bx - cxm, ay = by - cym, da = Math.hypot(ax, ay);
        const perto = reduzido || da >= alcance ? 0 : 1 - da / alcance;
        const s = solto[i];
        solto[i] = s + (perto - s) * Math.min(1, dt * fugaV[i] * (perto > s ? 2.2 : 0.7));
        const k = solto[i];
        if (k < 0.002) continue;
        const e2 = k * k * (3 - 2 * k);
        const giroP = t * 0.6 * (fugaV[i] - 3);
        const dx = fugaX[i] * Math.cos(giroP) - fugaY[i] * Math.sin(giroP), dy = fugaX[i] * Math.sin(giroP) + fugaY[i] * Math.cos(giroP);
        const ux = da > 0.01 ? ax / da : dx, uy = da > 0.01 ? ay / da : dy;
        saida[o] = bx + (ux * R * 0.42 + dx * fugaD[i] * R * 0.18) * e2;
        saida[o + 1] = by + (uy * R * 0.42 + dy * fugaD[i] * R * 0.18) * e2;
        saida[o + 3] *= 1 - 0.2 * e2;                  // soltos, ficam um pouco mais leves
      }
      ctx.clearRect(0, 0, tamanho, tamanho);
      /* o destaque: uma auréola de luz roxa atrás da esfera, que respira devagar e cresce quando ele fala ou o cursor chega */
      if (hud) {
        const forca = 0.34 + 0.22 * amp + 0.12 * brilho + 0.04 * Math.sin(t * 1.3);
        const halo = ctx.createRadialGradient(c, c, R * 0.2, c, c, tamanho * 0.5);
        halo.addColorStop(0, `rgba(176,128,255,${Math.min(0.62, forca).toFixed(3)})`);
        halo.addColorStop(0.45, `rgba(124,58,237,${(forca * 0.42).toFixed(3)})`);
        halo.addColorStop(1, 'rgba(91,33,182,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, tamanho, tamanho);
      }
      for (const passe of [0, 1]) {   // primeiro os pontos de trás, depois o miolo escuro, depois os da frente
        if (passe === 1) {
          const vol = 1 + (0.05 + 0.2 * amp) * 0.4;
          const miolo = ctx.createRadialGradient(c, c - R * 0.25, 0, c, c, R * 0.97 * vol);
          miolo.addColorStop(0, 'rgba(10,6,20,0.9)');
          miolo.addColorStop(0.92, 'rgba(5,3,10,0.86)');
          miolo.addColorStop(1, 'rgba(5,3,10,0)');
          ctx.fillStyle = miolo;
          ctx.beginPath();
          ctx.arc(c, c, R * 0.97 * vol, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < N; i += 1) {
          const o = i * CAMPOS;
          if (saida[o + 5] !== passe) continue;
          ctx.globalAlpha = Math.min(1, saida[o + 3] * (passe ? 1.15 : 1));
          ctx.fillStyle = corDoPonto(saida[o + 4], saida[o + 3]);
          ctx.beginPath();
          ctx.arc(saida[o], saida[o + 1], Math.max(0.4, saida[o + 2] * 1.3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      /* o brilho em volta dos pontos acesos da frente, como a luz do 3D */
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N; i += 1) {
        const o = i * CAMPOS;
        const luz = saida[o + 3];
        if (saida[o + 5] !== 1 || luz < 0.5) continue;
        const r = saida[o + 2] * 1.3 * 4.2;
        ctx.globalAlpha = Math.min(0.75, (luz - 0.5) * 1.5);
        ctx.drawImage(carimbo, saida[o] - r, saida[o + 1] - r, r * 2, r * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      /* a moldura de instrumento saiu (pedido do dono): só as ondas dos toques continuam, em volta da esfera */
      if (hud) desenharOndas(agora);
      if (!reduzido) quadroId = requestAnimationFrame(desenhar);
    };
    quadroId = requestAnimationFrame(desenhar);
    return () => {
      cancelAnimationFrame(quadroId);
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('pointerup', aoSoltar);
      window.removeEventListener('pointercancel', aoSoltar);
      document.documentElement.removeEventListener('pointerleave', aoSairDaJanela);
    };
  }, [tamanho, reduzido, pts, hud]);

  const tocar = () => { ondas.current.push(performance.now()); aoPressionar?.(); };
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
