/* O orbe do RONDIN no navegador: canvas, com ~1.100 pontos a 60 quadros por segundo. No celular usa Orbe.tsx (SVG).
   Com `hud`, o orbe ganha a moldura de instrumento (a cara de "Jarvis"): um espectro de voz em volta da esfera, que sobe
   quando ele fala; um anel de arcos girando; um anel de marcações girando ao contrário; e um feixe que varre o anel de fora.
   E fica vivo: a esfera se inclina na direção do cursor, tudo acende quando o cursor passa por cima e cada toque (ou cada
   tecla, pela prop `pulso`) solta uma onda. Tudo é desenhado no mesmo canvas, num laço só.
   Os pontos se desfazem com o cursor: quanto mais perto do centro, mais eles se soltam e se espalham (os que estão perto
   do cursor fogem dele); afastando o cursor, cada ponto volta no seu ritmo e a esfera se monta de novo. Com o dedo vale o
   mesmo enquanto ele arrasta; soltou, a esfera se refaz. Parado para quem pede menos movimento. */
import React, { useEffect, useMemo, useRef } from 'react';
import { CAMPOS, EstadoOrbe, amplitude, barraDoEspectro, corDoPonto, esfera, quadro } from '../lib/orbe';
import { useMovimentoReduzido } from '../lib/movimento';

const N = 1100;
const BARRAS = 72;       // barras do espectro de voz
const MARCAS = 72;       // marcações do anel de fora
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
    const R = tamanho * (hud ? 0.3 : 0.36);
    const rEspectro = tamanho * 0.372, rArcos = tamanho * 0.436, rMarcas = tamanho * 0.476;
    const fio = Math.max(1, tamanho / 210);   // espessura dos traços, proporcional ao tamanho
    let amp = 0, anterior = 0, quadroId = 0, brilho = 0, mx = 0, my = 0, varre = 0;
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

    const desenharHud = (t: number, agora: number) => {
      const e = estadoRef.current;
      const viva = 1 + 0.35 * brilho;   // com o cursor em cima, os traços acendem
      ctx.lineCap = 'round';

      /* espectro de voz: barras em volta da esfera, que sobem com a fala */
      for (let i = 0; i < BARRAS; i += 1) {
        const a = (i / BARRAS) * Math.PI * 2 - Math.PI / 2;
        const nivel = barraDoEspectro(i, t, amp);
        const alto = fio * 1.2 + nivel * tamanho * 0.05;
        const ca = Math.cos(a), sa = Math.sin(a);
        ctx.strokeStyle = lilas(Math.min(1, (0.22 + 0.7 * nivel) * viva));
        ctx.lineWidth = fio * 1.35;
        ctx.beginPath();
        ctx.moveTo(c + ca * rEspectro, c + sa * rEspectro);
        ctx.lineTo(c + ca * (rEspectro + alto), c + sa * (rEspectro + alto));
        ctx.stroke();
      }

      /* anel de arcos: três arcos largos girando, e dois curtos e claros no sentido contrário */
      ctx.lineCap = 'butt';
      arco(rArcos, 0, Math.PI * 2, lilas(0.1 * viva), fio * 0.8);
      const g1 = t * (e === 'pensando' ? 0.9 : 0.24);
      for (let k = 0; k < 3; k += 1) arco(rArcos, g1 + (k * Math.PI * 2) / 3, g1 + (k * Math.PI * 2) / 3 + 1.2, lilas(0.55 * viva), fio * 1.5);
      const g2 = -t * 0.42;
      for (let k = 0; k < 2; k += 1) arco(rArcos - fio * 4.5, g2 + k * Math.PI, g2 + k * Math.PI + 0.42, `rgba(255,255,255,${(0.6 * viva).toFixed(3)})`, fio);

      /* anel de marcações, como o de um instrumento: gira devagar */
      const g3 = -t * 0.06;
      for (let i = 0; i < MARCAS; i += 1) {
        const a = g3 + (i / MARCAS) * Math.PI * 2;
        const longa = i % 6 === 0;
        const ca = Math.cos(a), sa = Math.sin(a);
        ctx.strokeStyle = lilas((longa ? 0.55 : 0.24) * viva);
        ctx.lineWidth = fio * (longa ? 1.3 : 1);
        ctx.beginPath();
        ctx.moveTo(c + ca * (rMarcas - (longa ? fio * 5 : fio * 2.4)), c + sa * (rMarcas - (longa ? fio * 5 : fio * 2.4)));
        ctx.lineTo(c + ca * rMarcas, c + sa * rMarcas);
        ctx.stroke();
      }

      /* o feixe que varre o anel de fora: uma cauda que vai apagando. Corre mais quando ele ouve ou pensa. */
      for (let k = 0; k < 7; k += 1) arco(rMarcas + fio * 2.2, varre - (k + 1) * 0.085, varre - k * 0.085, `rgba(255,255,255,${(0.85 * (1 - k / 7) * viva).toFixed(3)})`, fio * 1.4);

      /* as ondas dos toques e das teclas: um anel que cresce e some */
      ondas.current = ondas.current.filter((inicio) => agora - inicio < DURACAO_ONDA * 1000);
      for (const inicio of ondas.current) {
        const p = (agora - inicio) / (DURACAO_ONDA * 1000), suave = 1 - (1 - p) * (1 - p);
        arco(R * 1.02 + (rMarcas * 1.02 - R) * suave, 0, Math.PI * 2, lilas(0.7 * (1 - p)), fio * 1.6);
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
      varre += dt * (e === 'ouvindo' ? 1.5 : e === 'pensando' ? 3.2 : 0.7);
      quadro(pts, t, amp, R, c, c, saida, 0.42 + my * 0.5, mx * 0.9);
      /* os pontos se soltam: cada um vai para a sua direção (com um redemoinho leve) e foge do cursor; voltando, cada um no seu ritmo */
      const alvoSolto = reduzido ? 0 : mira.current.desfaz;
      const cxm = mira.current.cx, cym = mira.current.cy, alcance = R * 0.75;
      for (let i = 0; i < N; i += 1) {
        const s = solto[i];
        solto[i] = s + (alvoSolto - s) * Math.min(1, dt * fugaV[i] * (alvoSolto > s ? 1.4 : 0.8));
        const k = solto[i];
        if (k < 0.002) continue;
        const e2 = k * k * (3 - 2 * k);
        const o = i * CAMPOS;
        const giroP = t * 0.6 * (fugaV[i] - 3);
        const dx = fugaX[i] * Math.cos(giroP) - fugaY[i] * Math.sin(giroP), dy = fugaX[i] * Math.sin(giroP) + fugaY[i] * Math.cos(giroP);
        let x = saida[o] + dx * fugaD[i] * R * e2, y = saida[o + 1] + dy * fugaD[i] * R * e2;
        const ax = x - cxm, ay = y - cym, da = Math.hypot(ax, ay);
        if (da < alcance && da > 0.01) { const f = (1 - da / alcance) * R * 0.35 * e2; x += (ax / da) * f; y += (ay / da) * f; }
        saida[o] = x; saida[o + 1] = y;
        saida[o + 3] *= 1 - 0.25 * e2;                 // soltos, ficam um pouco mais leves
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
      if (hud) desenharHud(t, agora);
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
