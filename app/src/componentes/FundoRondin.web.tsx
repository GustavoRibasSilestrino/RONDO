/* O fundo das telas do RONDIN (a conversa, a inicial e as cenas dele), no navegador: PRETO, liso (desde 2026-11-27, pedido do
   dono: "tire o degradê em verde do fundo... deixe full preto, somente o rondin verde"). Saíram as névoas verdes, as ondas de
   voz que se abriam do orbe até as bordas e a poeira de luz (estão no histórico do Git, em FundoRondin.web.tsx e FundoRondin.tsx,
   antes desta data). O verde fica só na esfera (componentes/Orbe). No celular, FundoRondin.tsx faz o mesmo. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { EstadoOrbe } from '../lib/orbe';

type Props = { estado: EstadoOrbe; cx?: number; cy?: number };

export function FundoRondin(_props: Props) {
  return <View pointerEvents="none" aria-hidden style={[StyleSheet.absoluteFill, { backgroundColor: '#000000' }]} />;
}
