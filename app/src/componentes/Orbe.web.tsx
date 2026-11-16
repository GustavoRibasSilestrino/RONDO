/* O orbe do RONDIN no navegador. Desde 2026-11-16 a esfera é o vídeo do RONDIN 3D feito no Blender (brand/rondin-3d,
   servido em public/rondin/), girando em laço e sem som; o fundo preto do vídeo some com `mix-blend-mode: screen`. Em volta,
   num canvas atrás do vídeo: com `hud`, a auréola de luz roxa, que respira e cresce quando ele fala ou o cursor chega, e
   as ondas de cada toque (ou de cada tecla, pela prop `pulso`). A voz continua aparecendo: enquanto ele fala ou ouve, a
   esfera pulsa e acende um pouco. (Os pontos que se espalhavam com o cursor eram da esfera desenhada; saíram com o vídeo,
   por escolha do dono.) Parado para quem pede menos movimento. No celular usa Orbe.tsx. */
import React, { useEffect, useRef } from 'react';
import { EstadoOrbe, amplitude } from '../lib/orbe';
import { useMovimentoReduzido } from '../lib/movimento';

const DURACAO_ONDA = 0.75;   // segundos que a onda de um toque leva para sumir
/* no ar o app mora em /app (experiments.baseUrl); rodando local, na raiz */
const BASE = typeof location !== 'undefined' && location.pathname.startsWith('/app') ? '/app' : '';
const VIDEO = `${BASE}/rondin/rondin-3d.mp4`;
const POSTER = `${BASE}/rondin/rondin-3d.jpg`;

type Props = {
  tamanho: number; estado: EstadoOrbe;
  hud?: boolean;                 // a auréola e as ondas em volta da esfera
  pulso?: number;                // cada vez que este número muda, o orbe solta uma onda (ex.: a cada tecla digitada)
  aoPressionar?: () => void;     // tocar no orbe
  rotulo?: string;               // o que o toque faz, para leitores de tela
};

export function Orbe({ tamanho, estado, hud, pulso, aoPressionar, rotulo }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const reduzido = useMovimentoReduzido();
  const ondas = useRef<number[]>([]);          // instante em que cada onda começou
  const dentro = useRef(false);                // o cursor está em cima

  /* uma onda nova quando a prop `pulso` muda (a primeira leitura não conta) */
  const primeiro = useRef(true);
  useEffect(() => {
    if (primeiro.current) { primeiro.current = false; return; }
    ondas.current.push(performance.now());
  }, [pulso]);

  /* o vídeo gira sozinho; para quem pede menos movimento, fica no primeiro quadro */
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (reduzido) v.pause(); else v.play().catch(() => { /* o navegador segurou: fica o primeiro quadro */ });
  }, [reduzido]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = tamanho * dpr;
    canvas.height = tamanho * dpr;
    ctx.scale(dpr, dpr);
    const c = tamanho / 2;
    const R = tamanho * 0.36;                    // o raio da esfera dentro do vídeo
    const fio = Math.max(1, tamanho / 210);      // espessura das ondas, proporcional ao tamanho
    let amp = 0, anterior = 0, quadroId = 0, brilho = 0;
    const t0 = performance.now();
    const lilas = (a: number) => `rgba(196,168,255,${a.toFixed(3)})`;

    const desenhar = (agora: number) => {
      const t = reduzido ? 2 : (agora - t0) / 1000;
      const dt = Math.min(0.1, Math.max(0, (agora - anterior) / 1000));
      anterior = agora;
      brilho += ((dentro.current ? 1 : 0) - brilho) * Math.min(1, dt * 8);
      const alvo = reduzido ? 0.06 : amplitude(estadoRef.current, t) + 0.1 * brilho;
      amp += (alvo - amp) * Math.min(1, dt * 9);   // suaviza: o orbe não pula de um estado a outro
      ctx.clearRect(0, 0, tamanho, tamanho);
      if (hud) {
        /* a auréola de luz roxa atrás da esfera */
        const forca = 0.34 + 0.22 * amp + 0.12 * brilho + 0.04 * Math.sin(t * 1.3);
        const halo = ctx.createRadialGradient(c, c, R * 0.2, c, c, tamanho * 0.5);
        halo.addColorStop(0, `rgba(176,128,255,${Math.min(0.62, forca).toFixed(3)})`);
        halo.addColorStop(0.45, `rgba(124,58,237,${(forca * 0.42).toFixed(3)})`);
        halo.addColorStop(1, 'rgba(91,33,182,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, tamanho, tamanho);
        /* as ondas dos toques */
        ondas.current = ondas.current.filter((inicio) => agora - inicio < DURACAO_ONDA * 1000);
        for (const inicio of ondas.current) {
          const p = (agora - inicio) / (DURACAO_ONDA * 1000), suave = 1 - (1 - p) * (1 - p);
          ctx.strokeStyle = lilas(0.6 * (1 - p)); ctx.lineWidth = fio * 1.4;
          ctx.beginPath(); ctx.arc(c, c, R * 1.02 + (tamanho * 0.47 - R) * suave, 0, Math.PI * 2); ctx.stroke();
        }
      }
      /* a voz: a esfera pulsa e acende um pouco enquanto ele fala ou ouve */
      const v = video.current;
      if (v) {
        v.style.transform = `translate(-50%, -50%) scale(${(1 + 0.12 * amp).toFixed(4)})`;
        v.style.filter = `brightness(${(1 + 0.35 * amp + 0.12 * brilho).toFixed(3)})`;
      }
      if (!reduzido) quadroId = requestAnimationFrame(desenhar);
    };
    quadroId = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(quadroId);
  }, [tamanho, reduzido, hud]);

  const tocar = () => { ondas.current.push(performance.now()); aoPressionar?.(); };
  const lado = Math.round(tamanho * 0.9);   // o vídeo é recortado na esfera: com 90% do orbe, ela fica do tamanho de antes
  const conteudo = (
    <>
      <canvas ref={ref} style={{ position: 'absolute', inset: 0, width: tamanho, height: tamanho }} aria-hidden="true" />
      <video
        ref={video} src={VIDEO} poster={POSTER} muted loop playsInline autoPlay={!reduzido} preload="auto" aria-hidden="true"
        width={lado} height={lado}
        style={{ position: 'absolute', left: '50%', top: '50%', width: lado, height: lado, transform: 'translate(-50%, -50%)', borderRadius: '50%', objectFit: 'cover', mixBlendMode: 'screen', pointerEvents: 'none' }}
      />
    </>
  );
  const base: React.CSSProperties = { position: 'relative', width: tamanho, height: tamanho, flex: 'none' };
  const sobre = { onPointerEnter: () => { dentro.current = true; }, onPointerLeave: () => { dentro.current = false; } };
  if (!aoPressionar) return <div style={base} aria-hidden="true" {...sobre}>{conteudo}</div>;
  return (
    <div
      role="button" tabIndex={0} aria-label={rotulo} {...sobre}
      onClick={tocar}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tocar(); } }}
      style={{ ...base, cursor: 'pointer', borderRadius: '50%', touchAction: 'manipulation' }}
    >
      {conteudo}
    </div>
  );
}
