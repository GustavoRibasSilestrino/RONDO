/* O botão redondo de ouvir um recado. Do diário, recebe o recado (o áudio pode estar no IndexedDB do navegador: lib/audioGuardado.ts);
   da conversa, recebe o endereço do rascunho que acabou de ser gravado. Sem áudio (o navegador limpou os dados), fica apagado. */
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useUriDoRecado } from '../lib/audioGuardado';
import { cores } from '../tema';
import type { Recado } from '../tipos';
import { Icone } from './Icone';

function Reprodutor({ uri, tamanho, rotulo }: { uri: string; tamanho: number; rotulo: string }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={status.playing ? `Pausar: ${rotulo}` : `Ouvir: ${rotulo}`}
      onPress={() => {
        if (status.playing) { player.pause(); return; }
        if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.1)) player.seekTo(0);
        player.play();
      }}
      style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2, borderWidth: 1, borderColor: cores.linha2 }}
    >
      <Icone nome={status.playing ? 'parar' : 'tocar'} tamanho={Math.round(tamanho * 0.4)} />
    </Pressable>
  );
}

export function OuvirRecado({ recado, uri, tamanho = 44, rotulo = 'recado' }: { recado?: Pick<Recado, 'id' | 'uri'>; uri?: string; tamanho?: number; rotulo?: string }) {
  const resolvido = useUriDoRecado(recado, uri);
  if (!resolvido) {
    return (
      <View accessibilityLabel="Áudio indisponível neste aparelho" style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2, opacity: 0.5 }}>
        <Icone nome="tocar" tamanho={Math.round(tamanho * 0.4)} cor={cores.texto3} />
      </View>
    );
  }
  return <Reprodutor key={resolvido} uri={resolvido} tamanho={tamanho} rotulo={rotulo} />;
}
