/* Um QR code desenhado em SVG (qrcode-generator, sem dependências). Fundo branco com margem, como os leitores esperam,
   nos dois temas. */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import qrcode from 'qrcode-generator';

export function CodigoQR({ texto, tamanho = 200, rotulo }: { texto: string; tamanho?: number; rotulo: string }) {
  const { n, d } = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(texto);
    q.make();
    const total = q.getModuleCount();
    let caminho = '';
    for (let l = 0; l < total; l++) for (let c = 0; c < total; c++) if (q.isDark(l, c)) caminho += `M${c + 4} ${l + 4}h1v1h-1z`;
    return { n: total + 8, d: caminho };   // 4 módulos de margem de cada lado
  }, [texto]);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={rotulo} style={{ width: tamanho, height: tamanho, borderRadius: 12, overflow: 'hidden' }}>
      <Svg width={tamanho} height={tamanho} viewBox={`0 0 ${n} ${n}`}>
        <Rect x={0} y={0} width={n} height={n} fill="#ffffff" />
        <Path d={d} fill="#000000" />
      </Svg>
    </View>
  );
}
