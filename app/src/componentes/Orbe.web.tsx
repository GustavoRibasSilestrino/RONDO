/* O orbe do RONDIN no navegador: canvas, com ~1.100 pontos a 60 quadros por segundo. No celular usa Orbe.tsx (SVG).
   Com `hud`, o orbe ganha a moldura de instrumento (a cara de "Jarvis"): um espectro de voz em volta da esfera, que sobe
   quando ele fala; um anel de arcos girando; um anel de marcações girando ao contrário; e um feixe que varre o anel de fora.
   E fica vivo: a esfera se inclina na direção do cursor, tudo acende quando o cursor passa por cima e cada toque (ou cada
   tecla, pela prop `pulso`) solta uma onda. Tudo é desenhado no mesmo canvas, num laço só. */
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
  const mira = useRef({ x: 0, y: 0, dentro: false });   // para onde o cursor puxa a esfera (-1 a 1) e se ele está em cima

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
    const c = tamanho / 2;
    const R = tamanho * (hud ? 0.3 : 0.36);
    const rEspectro = tamanho * 0.372, rArcos = tamanho * 0.436, rMarcas = tamanho * 0.476;
    const fio = Math.max(1, tamanho / 210);   // espessura dos traços, proporcional ao tamanho
    let amp = 0, anterior = 0, quadroId = 0, brilho = 0, mx = 0, my = 0, varre = 0;
    const t0 = performance.now();

    /* o cursor: a esfera se inclina na direção dele, de qualquer lugar da janela */
    const aoMover = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(200, window.innerWidth / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / Math.max(200, window.innerHeight / 2);
      mira.current.x = Math.max(-1, Math.min(1, dx));
      mira.current.y = Math.max(-1, Math.min(1, dy));
      mira.current.dentro = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < r.width / 2;
    };
    if (hud && !reduzido) window.addEventListener('pointermove', aoMover, { passive: true });

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
    return () => { cancelAnimationFrame(quadroId); window.removeEventListener('pointermove', aoMover); };
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
