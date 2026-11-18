/* A tela cheia de opções de cada aba (pedido do dono, 2026-11-18): o botão de opções do cabeçalho abre "Configurações do treino",
   "Configurações da dieta" ou as opções da Comunidade. Vidro claro, como o resto: no alto, o voltar e o título; embaixo, grupos
   de linhas num cartão de vidro (uma linha fina entre elas). Fecha no voltar, no voltar do Android ou passando o dedo para a
   direita (componentes/Deslizar.tsx). Dentro de uma seção (por exemplo, editar as metas), o voltar volta para a lista. */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, estilos, larguraMax, VIDRO } from '../tema';
import { DeslizarParaVoltar } from './Deslizar';
import { Icone, NomeIcone } from './Icone';
import { T } from './Ui';

type Props = {
  aberto: boolean; aoFechar: () => void; titulo: string;
  /* uma seção aberta por cima da lista: o voltar e o deslizar voltam para a lista, não fecham a tela */
  secao?: string | null; aoSairDaSecao?: () => void;
  children: React.ReactNode;
};

export function PaginaOpcoes({ aberto, aoFechar, titulo, secao, aoSairDaSecao, children }: Props) {
  const insets = useSafeAreaInsets();
  const voltar = () => (secao && aoSairDaSecao ? aoSairDaSecao() : aoFechar());
  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={voltar} statusBarTranslucent>
      <View style={st.tela}>
        <DeslizarParaVoltar aoVoltar={voltar} style={st.coluna}>
          <View style={[st.topo, { marginTop: insets.top + 6 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={secao ? `Voltar para ${titulo}` : 'Voltar'} onPress={voltar} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.voltar, (pressed || hovered) && st.voltarSobre]}>
              <Icone nome="voltar" tamanho={22} cor={cores.texto} />
            </Pressable>
            <View pointerEvents="none" style={st.titulo}><T tam={17} peso="500" linhas={1}>{secao ?? titulo}</T></View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 40, gap: 22 }}>
            {children}
          </ScrollView>
        </DeslizarParaVoltar>
      </View>
    </Modal>
  );
}

/* um grupo de linhas: o nome do grupo em cima (frase curta, sem caixa-alta) e o cartão de vidro */
export function GrupoOpcoes({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  const filhos = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      {titulo ? <T tam={13} peso="500" cor={cores.texto2} style={{ paddingHorizontal: 4 }}>{titulo}</T> : null}
      <View style={st.grupo}>
        {filhos.map((f, i) => <React.Fragment key={i}>{i > 0 ? <View style={st.divisa} /> : null}{f}</React.Fragment>)}
      </View>
    </View>
  );
}

/* uma linha: ícone, título, um detalhe à direita (por exemplo, a meta) e a seta quando abre algo */
export function LinhaOpcao({ icone, titulo, sub, valor, aoPressionar }: { icone: NomeIcone; titulo: string; sub?: string; valor?: string; aoPressionar?: () => void }) {
  const miolo = (
    <>
      <View style={st.icone}><Icone nome={icone} tamanho={19} cor={cores.texto} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T tam={15} peso="400" linhas={1}>{titulo}</T>
        {sub ? <T tam={12.5} cor={cores.texto2} style={{ marginTop: 1 }}>{sub}</T> : null}
      </View>
      {valor ? <T tam={14.5} peso="500" linhas={1}>{valor}</T> : null}
      {aoPressionar ? <Icone nome="setaDireita" tamanho={17} cor={cores.texto3} /> : null}
    </>
  );
  if (!aoPressionar) return <View accessible accessibilityLabel={valor ? `${titulo}: ${valor}` : titulo} style={st.linha}>{miolo}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={titulo} onPress={aoPressionar} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.linha, (pressed || hovered) && st.linhaSobre]}>
      {miolo}
    </Pressable>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { width: '100%', maxWidth: larguraMax, backgroundColor: cores.fundo },
  topo: { height: 52, justifyContent: 'center', paddingHorizontal: 10 },
  voltar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  voltarSobre: { backgroundColor: cores.cartao2 },
  titulo: { position: 'absolute', left: 60, right: 60, alignItems: 'center' },
  grupo: { borderRadius: 20, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, overflow: 'hidden', ...VIDRO },
  divisa: { height: StyleSheet.hairlineWidth, backgroundColor: cores.linha2, marginLeft: 62 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 56 },
  linhaSobre: { backgroundColor: 'rgba(255,255,255,0.16)' },
  icone: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
}));
