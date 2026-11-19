/* Um mascote (browniezinho) recortado da folha de arte: a folha inteira fica atrás de uma janela do tamanho de uma célula,
   deslocada até o mascote certo. Funciona igual no celular e no navegador. `apagado` mostra o mascote que a conta ainda
   não tem (só a silhueta). */
import React from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import { FOLHA, FOLHA_MASCOTES, mascoteDe } from '../lib/mascotes';

export function Mascote({ chave, tamanho, apagado, style }: { chave: string | null | undefined; tamanho: number; apagado?: boolean; style?: StyleProp<ViewStyle> }) {
  const m = mascoteDe(chave);
  if (!m) return null;
  const [cw, ch] = FOLHA.celula;
  const escala = tamanho / ch;   // a altura da célula vira `tamanho`
  const largura = cw * escala;
  return (
    <View
      accessible accessibilityRole="image" accessibilityLabel={apagado ? 'Mascote que você ainda não tem' : `Mascote ${m.nome}`}
      style={[{ width: largura, height: tamanho, overflow: 'hidden' }, style]}
    >
      <Image
        source={FOLHA_MASCOTES}
        accessibilityIgnoresInvertColors
        style={{
          position: 'absolute', width: FOLHA.colunas * cw * escala, height: FOLHA.linhas * ch * escala,
          left: -m.coluna * cw * escala, top: -m.linha * ch * escala,
          opacity: apagado ? 0.18 : 1, tintColor: apagado ? '#ffffff' : undefined,
        }}
      />
    </View>
  );
}
