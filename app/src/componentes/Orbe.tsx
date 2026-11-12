/* O RONDIN no celular: a mesma bolha líquida do navegador (Orbe.web.tsx), em SVG, redesenhada cerca de 30 vezes por
   segundo. A matemática da forma está em lib/bolha.ts. Tem menos camadas que a do navegador, para não pesar no aparelho:
   a base em degradê, as manchas de cor que giram por dentro, o volume na borda, o reflexo e os pontinhos de brilho. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { BRILHOS, brilhoDoPonto, caminhoSuave, contorno, manchas, relevo, ritmo } from '../lib/bolha';
import { EstadoOrbe, amplitude } from '../lib/orbe';
import { useMovimentoReduzido } from '../lib/movimento';

const INTERVALO = 33;   // ms entre quadros (cerca de 30 por segundo)

type Props = {
  tamanho: number; estado: EstadoOrbe;
  hud?: boolean;                 // a auréola de luz em volta (o RONDIN em destaque)
  pulso?: number;                // cada vez que este número muda, a bolha treme
  aoPressionar?: () => void;     // tocar na bolha
  rotulo?: string;               // o que o toque faz, para leitores de tela
};

let contador = 0;   // ids únicos dos degradês, para duas bolhas na mesma tela não trocarem as cores

export function Orbe({ tamanho, estado, hud, pulso, aoPressionar, rotulo }: Props) {
  const reduzido = useMovimentoReduzido();
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const id = useRef(`b${(contador += 1)}`).current;
  const [, redesenhar] = useState(0);
  const tempo = useRef(3);
  const forca = useRef(0.08);
  const voz = useRef(0);
  const susto = useRef(0);

  const primeiro = useRef(true);
  useEffect(() => {
    if (primeiro.current) { primeiro.current = false; return; }
    susto.current = Math.min(1, susto.current + 0.55);
  }, [pulso]);

  useEffect(() => {
    if (reduzido) { redesenhar((v) => v + 1); return undefined; }
    let anterior = Date.now();
    const timer = setInterval(() => {
      const agora = Date.now();
      const dt = Math.min(0.1, (agora - anterior) / 1000);
      anterior = agora;
      const e = estadoRef.current;
      const { onda, velocidade } = ritmo(e);
      tempo.current += dt * velocidade;
      voz.current += ((e === 'falando' ? amplitude(e, agora / 1000) : 0) - voz.current) * Math.min(1, dt * 10);
      susto.current = Math.max(0, susto.current - dt * 1.6);
      forca.current += (onda + voz.current * 0.05 + susto.current * 0.09 - forca.current) * Math.min(1, dt * 6);
      redesenhar((v) => v + 1);
    }, INTERVALO);
    return () => clearInterval(timer);
  }, [reduzido]);

  const c = tamanho / 2;
  const t = tempo.current;
  const raio = tamanho * (hud ? 0.31 : 0.36) * (1 + voz.current * 0.045 + susto.current * 0.03);
  const d = caminhoSuave(contorno(c, c, raio, t, forca.current));
  const cores = manchas(t);
  const relevos = relevo(t);
  const lx = -0.35, ly = -0.45;   // a luz vem de cima, à esquerda

  const desenho = (
    <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`}>
      <Defs>
        <LinearGradient id={`${id}base`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#d79bff" />
          <Stop offset="0.42" stopColor="#e05acc" />
          <Stop offset="0.75" stopColor="#a560ee" />
          <Stop offset="1" stopColor="#5fd2f2" />
        </LinearGradient>
        {cores.map((m, i) => (
          <RadialGradient key={i} id={`${id}m${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={`rgb(${m.cor})`} stopOpacity={m.forca * 0.75} />
            <Stop offset="1" stopColor={`rgb(${m.cor})`} stopOpacity={0} />
          </RadialGradient>
        ))}
        <RadialGradient id={`${id}sombra`} cx="50%" cy="50%" r="50%" fx={`${50 + lx * 18}%`} fy={`${50 + ly * 18}%`}>
          <Stop offset="0.35" stopColor="#280a46" stopOpacity={0} />
          <Stop offset="0.75" stopColor="#3c0f64" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#2d0a50" stopOpacity={0.58} />
        </RadialGradient>
        <RadialGradient id={`${id}luz`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity={0.36} />
          <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}calombo`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffd2fc" stopOpacity={0.34} />
          <Stop offset="1" stopColor="#ffc8fa" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}dobra`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#3e0a6e" stopOpacity={0.62} />
          <Stop offset="1" stopColor="#460e78" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}chao`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#a0f0ff" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#a0f0ff" stopOpacity={0} />
        </RadialGradient>
        {hud ? (
          <RadialGradient id={`${id}halo`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.3" stopColor="#d678ff" stopOpacity={0.3 + 0.18 * voz.current} />
            <Stop offset="0.65" stopColor="#8c50ff" stopOpacity={0.1} />
            <Stop offset="1" stopColor="#5a28c8" stopOpacity={0} />
          </RadialGradient>
        ) : null}
        <ClipPath id={`${id}corte`}><Path d={d} /></ClipPath>
      </Defs>

      {hud ? <Circle cx={c} cy={c} r={c} fill={`url(#${id}halo)`} /> : null}
      <G clipPath={`url(#${id}corte)`}>
        <Path d={d} fill={`url(#${id}base)`} />
        {cores.map((m, i) => <Circle key={i} cx={c + m.x * raio} cy={c + m.y * raio} r={m.r * raio} fill={`url(#${id}m${i})`} />)}
        {relevos.map((p, i) => {
          const x = c + Math.cos(p.a) * raio * (p.calombo ? 0.62 : 0.78), y = c + Math.sin(p.a) * raio * (p.calombo ? 0.62 : 0.78);
          return p.calombo
            ? <Circle key={`r${i}`} cx={x} cy={y} r={raio * 0.42} fill={`url(#${id}calombo)`} opacity={p.peso} />
            : <Ellipse key={`r${i}`} cx={x} cy={y} rx={raio * 0.62} ry={raio * 0.24} fill={`url(#${id}dobra)`} opacity={p.peso} rotation={(p.a * 180) / Math.PI} origin={`${x}, ${y}`} />;
        })}
        <Circle cx={c} cy={c} r={raio * 1.08} fill={`url(#${id}sombra)`} />
        <Ellipse cx={c + lx * raio * 0.45} cy={c + ly * raio * 0.5} rx={raio * 0.55} ry={raio * 0.34} fill={`url(#${id}luz)`} rotation={-28} origin={`${c + lx * raio * 0.45}, ${c + ly * raio * 0.5}`} />
        <Circle cx={c + lx * raio * 0.55} cy={c + ly * raio * 0.6} r={raio * 0.14} fill={`url(#${id}luz)`} />
        <Circle cx={c - raio * 0.2} cy={c + raio * 0.95} r={raio * 0.6} fill={`url(#${id}chao)`} />
        {BRILHOS.map((b, i) => (
          <Circle key={i} cx={c + b.x * raio} cy={c + b.y * raio} r={b.r * raio * 1.4} fill="#ffffff" opacity={0.8 * (reduzido ? 0.6 : brilhoDoPonto(b.fase, t))} />
        ))}
      </G>
      <Path d={d} fill="none" stroke="#ffffff" strokeOpacity={0.3} strokeWidth={Math.max(1, tamanho / 240)} />
    </Svg>
  );

  if (!aoPressionar) return desenho;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={rotulo}
      onPress={() => { susto.current = Math.min(1, susto.current + 0.8); aoPressionar(); }}
      style={({ pressed }) => ({ width: tamanho, height: tamanho, borderRadius: tamanho / 2, opacity: pressed ? 0.9 : 1 })}
    >
      {desenho}
    </Pressable>
  );
}
