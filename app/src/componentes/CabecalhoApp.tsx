/* Cabeçalho fixo do app. No canto de cima à esquerda, a chama da sequência (em todas as telas), seguida das notificações (o plano PRO
   mora no Perfil, no botão de estrela do topo);
   no meio, o nome RONDO (só no feed); no canto de cima à direita, só a busca (só no feed). Fundo preto sólido, para a tela rolar por baixo. */
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, estilos, larguraMax } from '../tema';
import { useRolada } from '../lib/rolagem';
import { Icone } from './Icone';
import { SeloSequencia } from './SeloSequencia';
import { T } from './Ui';

export const ALTURA_CABECALHO = 56;

/* largura do nome no meio, no tamanho normal e no justo (medidas no navegador), e o respiro mínimo em volta dele */
const NOME = 100, NOME_JUSTO = 74, RESPIRO = 8;
const DIREITA = 50;   // o espaço que a busca ocupa no canto direito

type Props = { aoBuscar?: () => void; mostrarNome: boolean; naoLidas: number; aberto: boolean; aoAbrirNotificacoes: () => void };

export function CabecalhoApp({ aoBuscar, mostrarNome, naoLidas, aberto, aoAbrirNotificacoes }: Props) {
  const insets = useSafeAreaInsets();
  const rolada = useRolada();   // com a tela rolada, só o nome some; as outras opções ficam
  /* o nome fica no centro exato da barra. Em tela estreita, o grupo da esquerda chega perto dele: então o nome aperta; se ainda
     assim não couber no centro, vai para o meio do espaço livre entre o grupo da esquerda e a busca; e só some se nem ali couber
     (a joia e os botões têm prioridade) */
  const [largura, setLargura] = useState(0);
  const [fimEsquerda, setFimEsquerda] = useState(0);
  const sobra = largura / 2 - fimEsquerda - RESPIRO;   // do fim do grupo da esquerda até o meio da barra
  const livre = largura - DIREITA - fimEsquerda - RESPIRO * 2;   // o vão entre o grupo da esquerda e a busca
  const nome = !largura || !fimEsquerda || sobra >= NOME / 2 ? 'normal' : sobra >= NOME_JUSTO / 2 ? 'justo' : livre >= NOME_JUSTO ? 'deslocado' : 'some';
  return (
    <View style={[st.fundo, { paddingTop: insets.top, height: insets.top + ALTURA_CABECALHO }]}>
      <View style={st.linha} onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
        <View style={st.esquerda} onLayout={(e) => setFimEsquerda(e.nativeEvent.layout.x + e.nativeEvent.layout.width)}>
          <View style={st.joia}><SeloSequencia /></View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={naoLidas > 0 ? `Notificações: ${naoLidas} novas` : 'Notificações'}
            accessibilityState={{ selected: aberto }}
            onPress={aoAbrirNotificacoes}
            hitSlop={2}
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

        {mostrarNome && nome !== 'some' ? (
          <View pointerEvents="none" style={[st.marca, nome === 'deslocado' && { left: fimEsquerda + RESPIRO, right: DIREITA + RESPIRO }, { opacity: rolada ? 0 : 1 }, Platform.OS === 'web' ? ({ transition: 'opacity 220ms ease' } as object) : null]}>
            {nome === 'normal'
              ? <T tam={19} peso="500" style={{ letterSpacing: 6, marginRight: -6 }}>RONDO</T>
              : <T tam={16} peso="500" style={{ letterSpacing: 3, marginRight: -3 }}>RONDO</T>}
          </View>
        ) : null}

        {aoBuscar ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Buscar pessoas" onPress={aoBuscar} style={st.busca}>
            <Icone nome="busca" tamanho={23} cor="#ffffff" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  fundo: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: cores.cabecalho, borderBottomWidth: 1, borderBottomColor: cores.linha, alignItems: 'center', zIndex: 20 },
  linha: { width: '100%', maxWidth: larguraMax, height: ALTURA_CABECALHO, justifyContent: 'center', paddingHorizontal: 12 },
  esquerda: { position: 'absolute', left: 10, flexDirection: 'row', alignItems: 'center' },
  joia: { marginRight: 3 },
  busca: { position: 'absolute', right: 6, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sino: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },   /* 38 de largura para o nome caber no meio; o alvo de toque chega a 44 com o hitSlop */
  selo: { position: 'absolute', top: 3, right: -1, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  marca: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
}));
