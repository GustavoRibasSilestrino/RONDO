/* Capa de grupo: degradê roxo com o ícone da categoria grande e apagado ao fundo. Serve de cartão, de cabeçalho e de prévia. */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icone, type NomeIcone } from '../../componentes/Icone';
import { categoria, CORES_GRUPO } from '../../lib/grupos';
import type { CategoriaGrupo } from '../../tipos';

/* `icone`: no lugar do ícone da categoria (os desafios usam o troféu); `raio`: o canto (as miniaturas são menores) */
export function Capa({ cor, cat, icone, altura = 84, raio = 16, children }: { cor: number; cat?: CategoriaGrupo; icone?: NomeIcone; altura?: number; raio?: number; children?: React.ReactNode }) {
  const par = CORES_GRUPO[cor % CORES_GRUPO.length];
  return (
    <View style={{ height: altura, borderRadius: raio, overflow: 'hidden' }}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: par[0] }]} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -altura * 0.12, top: -altura * 0.14, opacity: 0.2, transform: [{ rotate: '-12deg' }] }}>
        <Icone nome={icone ?? categoria(cat ?? 'outro').icone} tamanho={Math.round(altura * 1.5)} cor="#ffffff" espessura={1.1} />
      </View>
      {children}
    </View>
  );
}
