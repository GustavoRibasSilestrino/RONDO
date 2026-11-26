/* O ícone que troca o tema (desde 2026-11-26, pedido do dono): só o ícone, num botão redondo de vidro. No tema escuro mostra o
   sol (vai para o claro); no claro, a lua (volta para o escuro). A escolha fica guardada (estado/tema.tsx). */
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useTema } from '../estado/tema';
import { cores, estilos } from '../tema';
import { Icone } from './Icone';
import { Vidro } from './Vidro';

export function BotaoTema({ tamanho = 40 }: { tamanho?: number }) {
  const { tema, alternar } = useTema();
  const claro = tema === 'claro';
  return (
    <Vidro interativo style={[st.botao, { width: tamanho, height: tamanho, borderRadius: tamanho / 2 }]}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel="Tema claro"
        accessibilityHint={claro ? 'Volta para o tema escuro' : 'Troca para o tema claro'}
        accessibilityState={{ checked: claro }}
        hitSlop={4}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
          alternar();
        }}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.toque, (pressed || hovered) && st.sobre]}
      >
        <Icone nome={claro ? 'lua' : 'sol'} tamanho={Math.round(tamanho * 0.52)} cor={cores.texto} />
      </Pressable>
    </Vidro>
  );
}

const st = estilos(() => StyleSheet.create({
  botao: { overflow: 'hidden', backgroundColor: `rgba(${cores.tinta},0.07)`, borderWidth: 1, borderColor: cores.linha2 },
  toque: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sobre: { backgroundColor: cores.cartao2 },
}));
