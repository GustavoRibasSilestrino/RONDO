/* O alto-falante do RONDIN: liga e desliga a voz dele (fica guardado no aparelho e vale para todas as falas). Botão só de
   ícone, com nome para leitores de tela e o estado "pressionado" anunciado. 44x44 de área de toque. */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useVozDesligada } from '../lib/rondinVoz';
import { Icone } from './Icone';

const ROTULOS = {
  pt: { desligar: 'Desligar a voz do RONDIN', ligar: 'Ligar a voz do RONDIN' },
  en: { desligar: "Mute RONDIN's voice", ligar: "Unmute RONDIN's voice" },
  es: { desligar: 'Silenciar la voz de RONDIN', ligar: 'Activar la voz de RONDIN' },
};

export function BotaoVoz({ idioma = 'pt', style }: { idioma?: 'pt' | 'en' | 'es'; style?: object }) {
  const [desligada, setDesligada] = useVozDesligada();
  const r = ROTULOS[idioma];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={desligada ? r.ligar : r.desligar}
      accessibilityState={{ selected: desligada }}
      onPress={() => setDesligada(!desligada)}
      hitSlop={6}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.botao, (hovered || pressed) && st.ativo, pressed && { opacity: 0.85 }, style]}
    >
      <Icone nome={desligada ? 'somDesligado' : 'somLigado'} tamanho={20} cor={desligada ? 'rgba(255,255,255,0.55)' : '#ffffff'} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  botao: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(196,168,255,0.22)',
  },
  ativo: { backgroundColor: 'rgba(167,139,250,0.16)', borderColor: 'rgba(196,168,255,0.45)' },
});
