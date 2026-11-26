/* A foto do perfil com o mascote da pessoa sentado ao lado, no canto de baixo à esquerda (desde 2026-11-19). Tocar no mascote
   faz ele dar um pulinho e falar: no seu perfil, uma verdade sobre os seus treinos (lib/falasMascote.ts); no perfil de outra
   pessoa, quem ele é. Sem mascote, só a foto. */
import React, { useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useLoja } from '../estado/loja';
import { escolherFala } from '../lib/falasMascote';
import { mascoteDe } from '../lib/mascotes';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, estilos } from '../tema';
import { Mascote } from './Mascote';
import { T } from './Ui';

/* `nomeProprio`: o nome que o dono deu ao mascote com o lápis (o de outra pessoa vem do perfil dela; o meu, da conta).
   `aoFalar`: quem usa mostra o balão onde houver espaço (o perfil põe numa linha de largura inteira, 2026-11-26); sem ele, o
   balão aparece aqui embaixo da foto. */
export function FotoComMascote({ chave, tamanhoFoto, dono, nomeProprio, aoFalar, children }: { chave: string | null | undefined; tamanhoFoto: number; dono?: string; nomeProprio?: string | null; aoFalar?: (fala: string | null) => void; children: React.ReactNode }) {
  const { estado } = useLoja();
  const reduzido = useMovimentoReduzido();
  const info = mascoteDe(chave);
  const [fala, setFala] = useState<string | null>(null);
  const pulo = useRef(new Animated.Value(0)).current;
  const sumir = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (!info) return <>{children}</>;
  const tam = Math.round(tamanhoFoto * 0.62);
  const nomeDele = (dono ? nomeProprio : estado.usuario?.mascoteNome) || info.nome;

  const mostrar = (f: string | null) => { if (aoFalar) aoFalar(f); else setFala(f); };
  const tocar = () => {
    mostrar(dono ? `${nomeDele}, mascote ${info.raridade.nome.toLowerCase()} de ${dono}.` : escolherFala(estado, new Date(), []).texto);
    if (sumir.current) clearTimeout(sumir.current);
    sumir.current = setTimeout(() => mostrar(null), 6000);
    if (reduzido) return;
    pulo.setValue(0);
    Animated.sequence([
      Animated.timing(pulo, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulo, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  };

  return (
    <View style={{ width: tamanhoFoto + tam * 0.45 }}>
      {/* a foto e o mascote num bloco só: o mascote fica preso à foto, e não desce para cima do balão quando ele aparece
          (antes ele era preso à base do bloco todo; corrigido em 2026-11-26) */}
      <View>
      <View style={{ alignSelf: 'flex-end' }}>{children}</View>
      <Pressable
        accessibilityRole="button" accessibilityLabel={dono ? `${nomeDele}, o mascote de ${dono}` : `${nomeDele}, o seu mascote. Tocar para ele falar`}
        onPress={tocar} hitSlop={6} style={[st.mascote, { width: tam * (127 / 130), height: tam }]}
      >
        <Animated.View style={{ transform: [{ translateY: pulo.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }] }}>
          <Mascote chave={info.chave} tamanho={tam} />
        </Animated.View>
      </Pressable>
      </View>
      {fala && !aoFalar ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar a fala do mascote" onPress={() => setFala(null)} style={st.balao}>
          <T tam={13} style={{ lineHeight: 18 }}>{fala}</T>
        </Pressable>
      ) : null}
    </View>
  );
}

/* o balão da fala, para quem mostra a fala fora da foto (com `aoFalar`): ocupa a largura que tiver */
export function BalaoMascote({ fala, aoFechar }: { fala: string | null; aoFechar: () => void }) {
  if (!fala) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Fechar a fala do mascote" onPress={aoFechar} style={[st.balao, st.balaoLargo]}>
      <T tam={13.5} style={{ lineHeight: 19 }}>{fala}</T>
    </Pressable>
  );
}

const st = estilos(() => StyleSheet.create({
  mascote: { position: 'absolute', left: 0, bottom: -4, zIndex: 3 },
  /* (pedido do dono, 2026-11-25: o balão ficava por cima do nome e do nível) ele entra no lugar, embaixo da foto, e empurra o
     que vem depois enquanto aparece; o fundo é opaco, para nada transparecer por trás */
  balao: {
    marginTop: 12, width: 240, padding: 12, borderRadius: 16, borderTopLeftRadius: 6,
    borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.tinta === '255,255,255' ? '#191919' : '#ffffff',   // opaco nos dois temas
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  balaoLargo: { width: '100%', alignSelf: 'stretch' },
}));
