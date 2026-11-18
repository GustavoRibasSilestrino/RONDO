/* Cabeçalho fixo do app, de vidro. À esquerda, a chama da sequência (em todas as telas) e, só no feed, o sino das notificações;
   no MEIO, o nome da aba em que a pessoa está ("Feed", "Treinos", "Comunidade", "Dieta"), para o topo não ficar vazio (pedido do
   dono, 2026-11-18); à direita, a busca (no feed) ou o botão de OPÇÕES da aba, que abre as configurações dela (Treino, Dieta e
   Comunidade). O nome some só se o grupo da esquerda e o botão da direita não deixarem espaço para ele. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, estilos, larguraMax, VIDRO } from '../tema';
import { Icone } from './Icone';
import { SeloSequencia } from './SeloSequencia';
import { T } from './Ui';

export const ALTURA_CABECALHO = 56;
const LADO = 50;   // o espaço de cada botão das pontas

/* `mostrarSino`: o sino das notificações só aparece no feed (e na própria tela de notificações, para fechá-la) */
type Props = {
  titulo: string;
  aoBuscar?: () => void;
  aoOpcoes?: () => void;   // o botão de opções da aba (abre as configurações dela)
  rotuloOpcoes?: string;
  mostrarSino: boolean; naoLidas: number; aberto: boolean; aoAbrirNotificacoes: () => void;
};

export function CabecalhoApp({ titulo, aoBuscar, aoOpcoes, rotuloOpcoes, mostrarSino, naoLidas, aberto, aoAbrirNotificacoes }: Props) {
  const insets = useSafeAreaInsets();
  const [largura, setLargura] = useState(0);
  const [fimEsquerda, setFimEsquerda] = useState(0);
  /* o nome fica no centro exato; com pouco espaço (grupo da esquerda largo), ele encolhe a fonte; sem espaço, some */
  const metade = largura / 2 - Math.max(fimEsquerda, LADO) - 8;
  const tam = metade >= titulo.length * 5.6 ? 17 : metade >= titulo.length * 4.6 ? 14.5 : 0;
  return (
    <View style={[st.fundo, { paddingTop: insets.top, height: insets.top + ALTURA_CABECALHO }]}>
      <View style={st.linha} onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
        <View style={st.esquerda} onLayout={(e) => setFimEsquerda(e.nativeEvent.layout.x + e.nativeEvent.layout.width)}>
          <View style={st.joia}><SeloSequencia /></View>
          {mostrarSino ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={naoLidas > 0 ? `Notificações: ${naoLidas} novas` : 'Notificações'}
              accessibilityState={{ selected: aberto }}
              onPress={aoAbrirNotificacoes}
              hitSlop={2}
              style={st.sino}
            >
              <Icone nome="sino" tamanho={24} cor={cores.texto} />
              {naoLidas > 0 ? (
                <View style={st.selo}>
                  <T tam={10.5} peso="500" cor="#ffffff">{naoLidas > 9 ? '9+' : String(naoLidas)}</T>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>

        {tam > 0 ? (
          <View pointerEvents="none" style={st.titulo}>
            <T tam={tam} peso="500" style={{ letterSpacing: -0.2 }} linhas={1}>{titulo}</T>
          </View>
        ) : null}

        {aoBuscar ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Buscar pessoas" onPress={aoBuscar} style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [st.direita, (hovered || pressed) && st.direitaSobre]}>
            <Icone nome="busca" tamanho={23} cor={cores.texto} />
          </Pressable>
        ) : aoOpcoes ? (
          <Pressable accessibilityRole="button" accessibilityLabel={rotuloOpcoes ?? `Opções de ${titulo}`} onPress={aoOpcoes} style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [st.direita, (hovered || pressed) && st.direitaSobre]}>
            <Icone nome="opcoes" tamanho={24} cor={cores.texto} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  fundo: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: cores.cabecalho, borderBottomWidth: 1, borderBottomColor: cores.linha, alignItems: 'center', zIndex: 20, ...VIDRO },
  linha: { width: '100%', maxWidth: larguraMax, height: ALTURA_CABECALHO, justifyContent: 'center', paddingHorizontal: 12 },
  esquerda: { position: 'absolute', left: 10, flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  joia: { marginRight: 3 },
  titulo: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  direita: { position: 'absolute', right: 6, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  direitaSobre: { backgroundColor: cores.cartao2 },
  sino: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  selo: { position: 'absolute', top: 3, right: -1, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
}));
