/* Capa de grupo: degradê roxo com o ícone da categoria grande e apagado ao fundo. Serve de cartão, de cabeçalho e de prévia. */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icone } from '../../componentes/Icone';
import { categoria, CORES_GRUPO } from '../../lib/grupos';
import type { CategoriaGrupo } from '../../tipos';

export function Capa({ cor, cat, altura = 84, children }: { cor: number; cat: CategoriaGrupo; altura?: number; children?: React.ReactNode }) {
  const par = CORES_GRUPO[cor % CORES_GRUPO.length];
  return (
    <View style={{ height: altura, borderRadius: 16, overflow: 'hidden' }}>
      <LinearGradient colors={[par[0], par[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={{ position: 'absolute', right: -altura * 0.12, top: -altura * 0.14, opacity: 0.2, transform: [{ rotate: '-12deg' }] }}>
        <Icone nome={categoria(cat).icone} tamanho={Math.round(altura * 1.5)} cor="#ffffff" espessura={1.1} />
      </View>
      {children}
    </View>
  );
}
