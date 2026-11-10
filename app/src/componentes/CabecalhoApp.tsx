/* Cabeçalho fixo do app: as notificações à esquerda, o nome RONDO no meio (só no feed) e, no canto de cima à direita, a busca (só no feed)
   e a joia da sequência, em todas as telas. Fundo preto sólido, para a tela rolar por baixo. */
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, estilos, larguraMax } from '../tema';
import { useRolada } from '../lib/rolagem';
import { Icone } from './Icone';
import { SeloSequencia } from './SeloSequencia';
import { T } from './Ui';

export const ALTURA_CABECALHO = 56;

type Props = { aoBuscar?: () => void; aoAbrirPro: () => void; mostrarNome: boolean; naoLidas: number; aberto: boolean; aoAbrirNotificacoes: () => void };

export function CabecalhoApp({ aoBuscar, aoAbrirPro, mostrarNome, naoLidas, aberto, aoAbrirNotificacoes }: Props) {
  const insets = useSafeAreaInsets();
  const rolada = useRolada();   // com a tela rolada, só o nome some; as outras opções ficam
  return (
    <View style={[st.fundo, { paddingTop: insets.top, height: insets.top + ALTURA_CABECALHO }]}>
      <View style={st.linha}>
        <View style={st.esquerda}>
        <Pressable accessibilityRole="button" accessibilityLabel="Plano PRO: assinar ou aumentar o plano" onPress={aoAbrirPro} style={st.sino}>
          <Icone nome="estrela" tamanho={24} cor="#ffffff" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={naoLidas > 0 ? `Notificações: ${naoLidas} novas` : 'Notificações'}
          accessibilityState={{ selected: aberto }}
          onPress={aoAbrirNotificacoes}
          style={st.sino}
        >
          <Icone nome="sino" tamanho={24} cor="#ffffff" />
          {naoLidas > 0 ? (
            <View style={st.selo}>
              <T tam={10.5} peso="500">{naoLidas > 9 ? '9+' : String(naoLidas)}</T>
            </View>
          ) : null}
        </Pressable>
        </View>

        {mostrarNome ? (
          <View pointerEvents="none" style={[st.marca, { opacity: rolada ? 0 : 1 }, Platform.OS === 'web' ? ({ transition: 'opacity 220ms ease' } as object) : null]}>
            <T tam={19} peso="500" style={{ letterSpacing: 6, marginRight: -6 }}>RONDO</T>
          </View>
        ) : null}

        <View style={st.direita}>
          {aoBuscar ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Buscar pessoas" onPress={aoBuscar} style={st.busca}>
              <Icone nome="busca" tamanho={23} cor="#ffffff" />
            </Pressable>
          ) : null}
          <SeloSequencia />
        </View>
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  fundo: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: cores.cabecalho, borderBottomWidth: 1, borderBottomColor: cores.linha, alignItems: 'center', zIndex: 20 },
  linha: { width: '100%', maxWidth: larguraMax, height: ALTURA_CABECALHO, justifyContent: 'center', paddingHorizontal: 12 },
  direita: { position: 'absolute', right: 12, flexDirection: 'row', alignItems: 'center', gap: 2 },
  busca: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  esquerda: { position: 'absolute', left: 4, flexDirection: 'row', alignItems: 'center' },
  sino: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  selo: { position: 'absolute', top: 3, right: 1, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  marca: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
}));
