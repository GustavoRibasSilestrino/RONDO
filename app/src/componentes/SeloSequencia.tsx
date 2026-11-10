/* A pílula da sequência: a joia (ChamaJoia) e o número de dias seguidos. Fica no canto de cima, à direita, em todas as telas;
   tocar abre o calendário da constância, com a joia marcada nos dias da sequência. */
import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useLoja } from '../estado/loja';
import { situacaoDaSequencia } from '../lib/calc';
import { cores, estilos } from '../tema';
import { CalendarioMes } from './CalendarioMes';
import { ChamaJoia } from './ChamaJoia';
import { Folha } from './Estrutura';
import { T } from './Ui';

export function SeloSequencia() {
  const { estado } = useLoja();
  const { dias, situacao } = situacaoDaSequencia(estado, new Date());
  const [aberto, setAberto] = useState(false);
  const rotulo = `Sequência de ${dias} ${dias === 1 ? 'dia' : 'dias'}${situacao === 'emRisco' ? ', registre algo hoje para mantê-la' : ''}. Abrir o calendário`;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotulo}
        onPress={() => setAberto(true)}
        hitSlop={6}
        style={({ pressed }) => [st.selo, situacao === 'apagada' && st.seloApagado, pressed && { opacity: 0.8 }]}
      >
        <ChamaJoia tamanho={22} situacao={situacao} />
        <T tam={14.5} peso="500" cor={situacao === 'apagada' ? cores.texto3 : cores.destaque2}>{dias}</T>
      </Pressable>
      <Folha aberta={aberto} aoFechar={() => setAberto(false)} titulo="Sequência">
        <CalendarioMes />
      </Folha>
    </>
  );
}

const st = estilos(() => StyleSheet.create({
  selo: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 11, borderRadius: 999,
    backgroundColor: 'rgba(138,61,255,0.16)', borderWidth: 1, borderColor: 'rgba(196,168,255,0.3)',
  },
  seloApagado: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: cores.linha },
}));
