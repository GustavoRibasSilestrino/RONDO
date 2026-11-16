/* O orbe do RONDIN no celular. Desde 2026-11-16 a esfera é o vídeo do RONDIN 3D feito no Blender (brand/rondin-3d, em
   assets/rondin/), girando em laço e sem som, pelo expo-video. No navegador usa Orbe.web.tsx. Com `hud`, a auréola de luz
   roxa atrás, que cresce quando ele fala; a voz também aparece na esfera, que pulsa um pouco enquanto ele fala ou ouve.
   O celular não tem o modo de mistura do navegador, então o vídeo fica recortado num círculo (o fundo dele é preto, como o
   miolo da esfera). Tocar nele chama `aoPressionar`. Parado para quem pede menos movimento. */
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { EstadoOrbe, amplitude } from '../lib/orbe';
import { useMovimentoReduzido } from '../lib/movimento';

const VIDEO = require('../../assets/rondin/rondin-3d.mp4');
const INTERVALO = 80;   // ms entre atualizações do pulsar (cerca de 12 por segundo: o giro é do próprio vídeo)

type Props = {
  tamanho: number; estado: EstadoOrbe;
  hud?: boolean;                 // a auréola em volta da esfera
  pulso?: number;                // só no navegador (a onda a cada tecla)
  aoPressionar?: () => void;     // tocar no orbe
  rotulo?: string;               // o que o toque faz, para leitores de tela
};

export function Orbe({ tamanho, estado, hud, aoPressionar, rotulo }: Props) {
  const reduzido = useMovimentoReduzido();
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const [amp, setAmp] = useState(0.06);
  const player = useVideoPlayer(VIDEO, (p) => { p.loop = true; p.muted = true; });

  useEffect(() => {
    if (reduzido) player.pause(); else player.play();
  }, [player, reduzido]);

  useEffect(() => {
    if (reduzido) { setAmp(0.06); return undefined; }
    const t0 = Date.now();
    let atual = 0;
    const id = setInterval(() => {
      atual += (amplitude(estadoRef.current, (Date.now() - t0) / 1000) - atual) * 0.35;
      setAmp((a) => (Math.abs(a - atual) > 0.004 ? atual : a));
    }, INTERVALO);
    return () => clearInterval(id);
  }, [reduzido]);

  const c = tamanho / 2;
  const lado = Math.round(tamanho * 0.84);
  const halo = hud ? (
    <Svg width={tamanho} height={tamanho} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <RadialGradient id="halo-rondin" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#b080ff" stopOpacity={Math.min(0.62, 0.34 + 0.22 * amp)} />
          <Stop offset="0.45" stopColor="#7c3aed" stopOpacity={(0.34 + 0.22 * amp) * 0.42} />
          <Stop offset="1" stopColor="#5b21b6" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c} fill="url(#halo-rondin)" />
    </Svg>
  ) : null;

  const desenho = (
    <View style={{ width: tamanho, height: tamanho, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      {halo}
      <View style={{ width: lado, height: lado, borderRadius: lado / 2, overflow: 'hidden', backgroundColor: '#000', transform: [{ scale: 1 + 0.12 * amp }] }}>
        <VideoView player={player} style={{ width: lado, height: lado }} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />
      </View>
    </View>
  );
  if (!aoPressionar) return desenho;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={rotulo} onPress={aoPressionar} style={({ pressed }) => ({ width: tamanho, height: tamanho, borderRadius: tamanho / 2, opacity: pressed ? 0.85 : 1 })}>
      {desenho}
    </Pressable>
  );
}
