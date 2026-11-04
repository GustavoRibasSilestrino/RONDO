/* Seguir é a conexão: quem você segue aparece no filtro "Seguindo" do feed. Botão pequeno em forma de pílula. */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Icone } from '../../componentes/Icone';
import { T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { cores, estilos } from '../../tema';

export function BotaoSeguir({ nome }: { nome: string }) {
  const { estado, commit } = useLoja();
  const seguindo = !!estado.seguindo[nome];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: seguindo }}
      accessibilityLabel={seguindo ? `Deixar de seguir ${nome}` : `Seguir ${nome}`}
      onPress={() => commit((e) => { e.seguindo[nome] = !e.seguindo[nome]; })}
      hitSlop={6}
      style={[st.pilula, seguindo && st.seguindo]}
    >
      {seguindo ? <Icone nome="ok" tamanho={13} cor={cores.destaque2} /> : null}
      <T tam={12.5} peso="500" cor={seguindo ? cores.destaque2 : '#ffffff'}>{seguindo ? 'Seguindo' : 'Seguir'}</T>
    </Pressable>
  );
}

const st = estilos(() => StyleSheet.create({
  pilula: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, backgroundColor: cores.destaqueForte, borderWidth: 1, borderColor: cores.destaqueForte },
  seguindo: { backgroundColor: 'transparent', borderColor: 'rgba(196,168,255,0.4)' },
}));
