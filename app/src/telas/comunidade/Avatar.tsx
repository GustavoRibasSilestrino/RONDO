/* Rostinho redondo com a foto ou a inicial. A cor vem do nome, dentro da família do roxo; "você" é sempre o roxo da marca
   e mostra a sua foto de perfil, quando houver uma. */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { useUriMidia } from '../../lib/midia';
import { cores, DEGRADE, FIM_DIAGONAL, INICIO_DIAGONAL, temaAtual } from '../../tema';

const TONS = ['#4c1d95', '#5b21b6', '#6d28d9', '#4338ca', '#6b21a8', '#3730a3'];

/* a foto, pelo id guardado no aparelho */
export function FotoRedonda({ id, tamanho }: { id: string; tamanho: number }) {
  const uri = useUriMidia(id);
  if (!uri) return null;
  return <Image source={{ uri }} accessibilityIgnoresInvertColors style={{ position: 'absolute', width: tamanho, height: tamanho, borderRadius: tamanho / 2 }} resizeMode="cover" />;
}

export function Avatar({ nome, voce, tamanho = 38, foto, semFoto }: { nome: string; voce?: boolean; tamanho?: number; foto?: string; semFoto?: boolean }) {
  const { estado } = useLoja();
  const tom = TONS[[...nome].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TONS.length];
  const idFoto = semFoto ? undefined : foto ?? (voce ? estado.usuario?.foto : undefined);   // semFoto: a prévia da edição, depois de remover a foto
  const inicial = (voce && nome === 'Você' ? estado.usuario?.nome ?? nome : nome).charAt(0).toUpperCase();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: voce ? cores.violeta : tom }}
    >
      {voce && temaAtual() === 'normal' ? <LinearGradient pointerEvents="none" colors={DEGRADE.roxo} start={INICIO_DIAGONAL} end={FIM_DIAGONAL} style={StyleSheet.absoluteFill} /> : null}
      <T tam={Math.round(tamanho * 0.37)} peso="500" cor="#ffffff">{inicial}</T>
      {idFoto ? <FotoRedonda id={idFoto} tamanho={tamanho} /> : null}
    </View>
  );
}
