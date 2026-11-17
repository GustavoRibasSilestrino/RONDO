/* O anel de story em volta de um avatar: roxo quando há story novo, apagado quando já foi visto, sem anel quando não há.
   Com `mais`, ganha o botãozinho de + para criar um story. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { cores, estilos, VIDRO } from '../../tema';
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
          <Icone nome="mais" tamanho={15} cor={cores.texto} espessura={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  anel: { alignItems: 'center', justifyContent: 'center' },
  /* o + do story: de vidro, como os outros botões (2026-11-17) */
  mais: { position: 'absolute', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1.5, borderColor: '#ffffff', boxShadow: '0 4px 10px -4px rgba(42,22,80,0.5)', ...VIDRO },
}));
