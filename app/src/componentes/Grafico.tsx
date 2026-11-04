/* Gráficos simples em SVG: linha, barras e calendário de constância. */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { cores, FONTE } from '../tema';

/* ---------- linha com marcadores ---------- */
export type Ponto = { x: number; y: number; destaque?: boolean };

export function GraficoLinha({ pontos, largura, altura = 150, cor = cores.destaque2, formato = (v: number) => String(Math.round(v)) }: { pontos: Ponto[]; largura: number; altura?: number; cor?: string; formato?: (v: number) => string }) {
  if (pontos.length < 2) return <View style={{ width: largura, height: altura }} />;
  const mx = 10, topo = 12, base = 22;
  const xs = pontos.map((p) => p.x), ys = pontos.map((p) => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const folga = (Math.max(...ys) - Math.min(...ys)) * 0.15 || 1;
  const yMin = Math.min(...ys) - folga, yMax = Math.max(...ys) + folga;
  const ex = (x: number) => mx + ((x - xMin) / (xMax - xMin || 1)) * (largura - mx * 2);
  const ey = (y: number) => topo + (1 - (y - yMin) / (yMax - yMin || 1)) * (altura - topo - base);
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${ex(p.x).toFixed(1)} ${ey(p.y).toFixed(1)}`).join('');
  const area = `${linha}L${ex(xMax).toFixed(1)} ${altura - base}L${ex(xMin).toFixed(1)} ${altura - base}Z`;
  const ultimo = pontos[pontos.length - 1];
  return (
    <Svg width={largura} height={altura}>
      <Line x1={mx} x2={largura - mx} y1={altura - base} y2={altura - base} stroke={cores.linha2} strokeWidth={1} />
      <Path d={area} fill="rgba(139,92,246,0.12)" />
      <Path d={linha} stroke={cor} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {pontos.map((p, i) => (p.destaque ? <Circle key={i} cx={ex(p.x)} cy={ey(p.y)} r={4} fill={cores.bom} /> : null))}
      <Circle cx={ex(ultimo.x)} cy={ey(ultimo.y)} r={5} fill="#ffffff" stroke="rgba(139,92,246,0.5)" strokeWidth={5} />
      <SvgText x={ex(ultimo.x)} y={Math.max(topo, ey(ultimo.y) - 12)} fill={cores.texto} fontSize={12} fontFamily={FONTE['500']} textAnchor="end">{formato(ultimo.y)}</SvgText>
    </Svg>
  );
}

/* ---------- barras ---------- */
export function GraficoBarras({ valores, rotulos, largura, altura = 120 }: { valores: number[]; rotulos: string[]; largura: number; altura?: number }) {
  const max = Math.max(...valores, 1);
  const base = 18;
  const folga = 6;
  const w = (largura - folga * (valores.length - 1)) / valores.length;
  return (
    <Svg width={largura} height={altura}>
      {valores.map((v, i) => {
        const h = (v / max) * (altura - base - 6);
        const ultimo = i === valores.length - 1;
        return (
          <React.Fragment key={i}>
            <Rect x={i * (w + folga)} y={altura - base - h} width={w} height={Math.max(h, 2)} rx={3} fill={ultimo ? cores.destaque2 : 'rgba(139,92,246,0.45)'} />
            <SvgText x={i * (w + folga) + w / 2} y={altura - 4} fill={cores.texto3} fontSize={10} fontFamily={FONTE['300']} textAnchor="middle">{rotulos[i]}</SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/* ---------- calendário de constância (colunas = semanas, linhas = dias) ---------- */
export function MapaCalor({ semanas, largura }: { semanas: { ativo: boolean; folga?: boolean; futuro?: boolean }[][]; largura: number }) {
  const folga = 4;
  const lado = (largura - folga * (semanas.length - 1)) / semanas.length;
  const altura = lado * 7 + folga * 6;
  return (
    <Svg width={largura} height={altura}>
      {semanas.map((sem, c) =>
        sem.map((dia, l) => (
          <Rect
            key={`${c}-${l}`}
            x={c * (lado + folga)} y={l * (lado + folga)} width={lado} height={lado} rx={2.5}
            fill={dia.futuro ? 'transparent' : dia.ativo ? cores.destaque : dia.folga ? 'transparent' : 'rgba(255,255,255,0.06)'}
            stroke={dia.folga && !dia.ativo ? cores.texto3 : 'none'} strokeDasharray={dia.folga && !dia.ativo ? '3 2' : undefined} strokeWidth={1}
          />
        )),
      )}
    </Svg>
  );
}
