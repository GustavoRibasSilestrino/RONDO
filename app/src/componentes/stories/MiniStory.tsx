/* A miniatura de um story: a foto, ou o texto sobre o fundo colorido. */
import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { FUNDOS_STORY } from '../../lib/stories';
import { useUriMidia } from '../../lib/midia';
import type { Midia } from '../../tipos';
import { T } from '../Ui';

type Props = { midia?: Midia; texto?: string; fundo?: number; style?: StyleProp<ViewStyle>; tamanhoTexto?: number };

function Foto({ id, url }: { id: string; url?: string }) {
  const uri = useUriMidia(id, url);
  return uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : null;
}

export function MiniStory({ midia, texto, fundo = 0, style, tamanhoTexto = 11 }: Props) {
  return (
    <View style={[{ overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: midia ? '#161616' : FUNDOS_STORY[fundo % FUNDOS_STORY.length], padding: 6 }, style]}>
      {midia ? <Foto id={midia.id} url={midia.url} /> : <T tam={tamanhoTexto} peso="500" centro linhas={4} cor="#ffffff">{texto}</T>}
    </View>
  );
}
