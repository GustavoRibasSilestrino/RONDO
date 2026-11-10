/* A sequência no cabeçalho: a chama (ChamaJoia, plana e sem contorno) e o número de dias seguidos. Fica no canto de cima, à esquerda, em todas as telas;
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
        style={({ pressed }) => [st.selo, pressed && { opacity: 0.7 }]}
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
  /* sem contorno e sem fundo: só a chama e o número, como os outros ícones do cabeçalho */
  selo: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: 6 },
}));
