/* O anel de story em volta de um avatar: roxo quando há story novo, apagado quando já foi visto, sem anel quando não há.
   Com `mais`, ganha o botãozinho de + para criar um story. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { cores, estilos } from '../../tema';
import { Icone } from '../Icone';

type Props = {
  tamanho: number;                         // o diâmetro do avatar de dentro
  estado: 'novo' | 'visto' | 'nenhum';
  children: React.ReactNode;
  aoPressionar?: () => void;
  rotulo?: string;
  mais?: boolean;
  aoMais?: () => void;
};

export function AnelStory({ tamanho, estado, children, aoPressionar, rotulo, mais, aoMais }: Props) {
  const total = tamanho + 12;
  const cor = estado === 'novo' ? cores.destaque : estado === 'visto' ? cores.linha2 : 'transparent';
  return (
    <View style={{ width: total, height: total }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        disabled={!aoPressionar}
        onPress={aoPressionar}
        style={[st.anel, { width: total, height: total, borderRadius: total / 2, borderColor: cor, borderWidth: estado === 'nenhum' ? 0 : 2.5 }]}
      >
        <View style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, overflow: 'hidden' }}>{children}</View>
      </Pressable>
      {mais ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Criar um story" onPress={aoMais} hitSlop={8} style={[st.mais, { right: -2, bottom: -2 }]}>
          <Icone nome="mais" tamanho={15} cor="#ffffff" espessura={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  anel: { alignItems: 'center', justifyContent: 'center' },
  mais: { position: 'absolute', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte, borderWidth: 2.5, borderColor: cores.fundo },
}));
