/* Selos de conta ao lado do nome. Três tipos, todos com o fundo preenchido, o check branco e uma insígnia pequena no canto:
   - profissional: azul, com maleta
   - famoso: roxo, com estrela
   - dono: amarelo, com coroa
   O tipo vem da API (campo `selo`) e só o banco o define. */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type TipoSelo = 'profissional' | 'famoso' | 'dono';

const COR: Record<TipoSelo, string> = { profissional: '#0a6cff', famoso: '#7a0cf5', dono: '#fbb305' };
const NOME: Record<TipoSelo, string> = { profissional: 'Profissional verificado', famoso: 'Conta verificada de pessoa pública', dono: 'Dono do RONDO' };

/* contorno ondulado do selo: um círculo com 10 ondas suaves */
const ondulada = (cx: number, cy: number, r: number, amp: number, ondas: number): string => {
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const rr = r + amp * Math.cos(a * ondas);
    pts.push(`${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `${pts.join('')}Z`;
};
const FORMA = ondulada(11.2, 11.2, 9.4, 0.55, 10);

/* estrela de cinco pontas centrada em (cx, cy) */
const estrela = (cx: number, cy: number, re: number, ri: number): string =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? ri : re;
    return `${i ? 'L' : 'M'}${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join('') + 'Z';

const CX = 18.2;   // centro da insígnia do canto
const CY = 18.2;

function Insignia({ tipo }: { tipo: TipoSelo }) {
  if (tipo === 'profissional') {
    return (
      <>
        <Rect x={CX - 2.6} y={CY - 1.5} width={5.2} height={3.9} rx={0.7} fill="#ffffff" />
        <Path d={`M${CX - 1.1} ${CY - 1.5}v-.9a.6.6 0 0 1 .6-.6h1a.6.6 0 0 1 .6.6v.9`} fill="none" stroke="#ffffff" strokeWidth={0.8} strokeLinecap="round" />
      </>
    );
  }
  if (tipo === 'famoso') return <Path d={estrela(CX, CY + 0.2, 2.9, 1.2)} fill="#ffffff" />;
  return (
    <>
      <Path d={`M${CX - 2.7} ${CY + 1.4}L${CX - 3} ${CY - 1.9}l1.9 1.6 1.2-2.2 1.2 2.2 1.9-1.6-.3 3.3z`} fill="#ffffff" strokeLinejoin="round" />
      <Rect x={CX - 2.7} y={CY + 1.9} width={5.4} height={0.9} rx={0.45} fill="#ffffff" />
    </>
  );
}

export function Selo({ tipo, tamanho = 20 }: { tipo: TipoSelo; tamanho?: number }) {
  const cor = COR[tipo];
  return (
    <View accessible accessibilityLabel={NOME[tipo]}>
      <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
        <Path d={FORMA} fill={cor} />
        <Path d="M7 11.6l3.1 3.1 5.2-5.8" fill="none" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={CX} cy={CY} r={4.9} fill={cor} stroke="#ffffff" strokeWidth={0.9} />
        <Insignia tipo={tipo} />
      </Svg>
    </View>
  );
}

/* a API só manda textos livres: aceita apenas os tipos conhecidos */
export const tipoDeSelo = (s?: string | null): TipoSelo | null => (s === 'profissional' || s === 'famoso' || s === 'dono' ? s : null);
