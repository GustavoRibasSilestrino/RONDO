/* Cabeçalho fixo do app: as notificações à esquerda, o nome KORA no meio (só no feed). Fundo preto sólido, para a tela rolar por baixo. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, larguraMax, estilos } from '../tema';
import { Icone } from './Icone';
import { T } from './Ui';

export const ALTURA_CABECALHO = 56;

type Props = { mostrarNome: boolean; mostrarTema: boolean; temaBloqueado: boolean; aoTrocarTema: () => void; naoLidas: number; aberto: boolean; aoAbrirNotificacoes: () => void };

export function CabecalhoApp({ mostrarNome, mostrarTema, temaBloqueado, aoTrocarTema, naoLidas, aberto, aoAbrirNotificacoes }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.fundo, { paddingTop: insets.top, height: insets.top + ALTURA_CABECALHO }]}>
      <View style={st.linha}>
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

        {mostrarNome ? (
          <View pointerEvents="none" style={st.marca}>
            <T tam={19} peso="500" style={{ letterSpacing: 6, marginRight: -6 }}>KORA</T>
          </View>
        ) : null}
        {mostrarTema ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={temaBloqueado ? 'Trocar o tema, bloqueado até o nível 15' : 'Trocar o tema'}
            onPress={aoTrocarTema}
            style={st.tema}
          >
            <Icone nome="tema" tamanho={23} cor="#ffffff" />
            {temaBloqueado ? <View style={st.cadeado}><Icone nome="cadeado" tamanho={10} cor="#ffffff" espessura={2.2} /></View> : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  fundo: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: cores.fundo, borderBottomWidth: 1, borderBottomColor: cores.linha, alignItems: 'center', zIndex: 20 },
  linha: { width: '100%', maxWidth: larguraMax, height: ALTURA_CABECALHO, justifyContent: 'center', paddingHorizontal: 12 },
  tema: { position: 'absolute', right: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cadeado: { position: 'absolute', right: 5, bottom: 7, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  sino: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  selo: { position: 'absolute', top: 3, right: 1, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  marca: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
}));
