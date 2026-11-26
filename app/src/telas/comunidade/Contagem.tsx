/* A contagem regressiva para o desafio começar: dias, horas, minutos e segundos, em quatro peças de placar (o toque de jogo do
   app). Os números são da Poppins com algarismos de largura fixa (na fonte de pixel o 5 parecia um S); os nomes, em pixel. Anda a cada segundo; chegando a zero, avisa quem está em volta
   (aoZerar) para recarregar o desafio, que passa a "rolando". */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { T } from '../../componentes/Ui';
import { faltaPara } from '../../lib/desafios';
import { cores, estilos } from '../../tema';

const dois = (n: number) => String(n).padStart(2, '0');

export function Contagem({ inicio, pequena, aoZerar }: { inicio: string; pequena?: boolean; aoZerar?: () => void }) {
  const [resta, setResta] = useState(() => faltaPara(inicio));
  const zerou = useRef(false);
  useEffect(() => {
    const id = setInterval(() => setResta(faltaPara(inicio)), 1000);
    return () => clearInterval(id);
  }, [inicio]);
  useEffect(() => {
    if (resta > 0 || zerou.current) return;
    zerou.current = true;
    aoZerar?.();
  }, [resta, aoZerar]);

  const s = Math.floor(resta / 1000);
  const partes: [string, string][] = [
    [dois(Math.floor(s / 86400)), 'dias'],
    [dois(Math.floor((s % 86400) / 3600)), 'horas'],
    [dois(Math.floor((s % 3600) / 60)), 'min'],
    [dois(s % 60), 'seg'],
  ];
  return (
    <View
      accessible accessibilityRole="timer"
      accessibilityLabel={`Começa em ${Number(partes[0][0])} dias, ${Number(partes[1][0])} horas e ${Number(partes[2][0])} minutos`}
      style={st.linha}
    >
      {partes.map(([n, nome]) => (
        <View key={nome} style={[st.peca, pequena && st.pecaPequena]}>
          <T tam={pequena ? 22 : 28} peso="500" cor={cores.destaque2} style={{ fontVariant: ['tabular-nums'], letterSpacing: -0.5 }}>{n}</T>
          <T tam={11} pixel cor={cores.texto3} style={{ letterSpacing: 0.8, marginTop: 1 }}>{nome}</T>
        </View>
      ))}
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  linha: { flexDirection: 'row', gap: 8 },
  peca: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14,
    backgroundColor: `rgba(${cores.tom},0.12)`, borderWidth: 1, borderColor: `rgba(${cores.tom},0.26)`,
  },
  pecaPequena: { paddingVertical: 7, borderRadius: 12 },
}));
