/* O fundo das telas do RONDIN no celular: PRETO, liso (desde 2026-11-27, pedido do dono: "tire o degradê em verde do fundo...
   deixe full preto, somente o rondin verde"). Saíram as névoas verdes, as ondas de voz e a poeira de luz (estão no histórico do
   Git, antes desta data). O verde fica só na esfera (componentes/Orbe). No navegador, FundoRondin.web.tsx faz o mesmo. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { EstadoOrbe } from '../lib/orbe';

type Props = { estado: EstadoOrbe; cx?: number; cy?: number };

export function FundoRondin(_props: Props) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />;
}
