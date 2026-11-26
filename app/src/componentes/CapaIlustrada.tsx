/* A capa ilustrada do topo de uma aba (Comunidade e Dieta, 2026-11-26, pedidos do dono): a ilustração em pixel art ocupa o alto do
   cartão de ponta a ponta e se funde no painel escuro de baixo; o título grande fica sobre a parte de baixo da imagem, com um
   botão redondo verde ao lado. Embaixo vêm, se houver: pílulas (abas ou escolhas), os números entre duas linhas finas e uma frase.
   O desenho segue uma referência do dono (a tela de detalhe de um livro). O painel é escuro nos dois temas, como um cartão de mídia,
   para o texto branco ler bem sobre a imagem. */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, type ImageSourcePropType, Pressable, StyleSheet, View } from 'react-native';
import { estilos, VERDE } from '../tema';
import { Icone, type NomeIcone } from './Icone';
import { T } from './Ui';
import { Vidro } from './Vidro';

const PAINEL = '#141414';   // escuro nos dois temas: a imagem se funde nele e o texto branco lê bem

type Props = {
  imagem: ImageSourcePropType;
  proporcao: number;            // largura / altura da imagem
  descricaoImagem: string;      // o que a imagem mostra, para o leitor de tela
  titulo: string;
  subtitulo?: string;
  botao?: { icone: NomeIcone; rotulo: string; aoPressionar: () => void };
  children?: React.ReactNode;   // o corpo: pílulas, números e frase (use as peças abaixo)
};

export function CapaIlustrada({ imagem, proporcao, descricaoImagem, titulo, subtitulo, botao, children }: Props) {
  return (
    <View style={st.cartao}>
      <View style={[st.imagemCaixa, { aspectRatio: proporcao }]}>
        <Image source={imagem} style={st.imagem} resizeMode="cover" accessibilityIgnoresInvertColors accessible accessibilityLabel={descricaoImagem} />
        <LinearGradient pointerEvents="none" colors={['rgba(20,20,20,0)', 'rgba(20,20,20,0.55)', PAINEL]} locations={[0.45, 0.75, 1]} style={StyleSheet.absoluteFill} />
        <View style={st.tituloLinha}>
          <View style={{ flex: 1 }}>
            <T tam={32} peso="500" cor="#ffffff" style={st.titulo}>{titulo}</T>
            {subtitulo ? <T tam={13} cor="rgba(255,255,255,0.78)" style={{ marginTop: 2 }}>{subtitulo}</T> : null}
          </View>
          {botao ? (
            <Vidro interativo tom={VERDE.botao} style={st.botao}>
              <Pressable accessibilityRole="button" accessibilityLabel={botao.rotulo} onPress={botao.aoPressionar} hitSlop={4} style={({ pressed }) => [st.botaoToque, pressed && { opacity: 0.8 }]}>
                <Icone nome={botao.icone} tamanho={24} cor="#ffffff" espessura={2} />
              </Pressable>
            </Vidro>
          ) : null}
        </View>
      </View>
      {children ? <View style={st.corpo}>{children}</View> : null}
    </View>
  );
}

/* as pílulas (abas ou escolhas): a escolhida fica branca */
export function PilulasCapa<V extends string>({ opcoes, valor, aoMudar, papel = 'tab' }: { opcoes: { valor: V; nome: string }[]; valor: V; aoMudar: (v: V) => void; papel?: 'tab' | 'button' }) {
  return (
    <View accessibilityRole={papel === 'tab' ? 'tablist' : undefined} style={st.pilulas}>
      {opcoes.map((o) => {
        const ativa = o.valor === valor;
        return (
          <Pressable key={o.valor} accessibilityRole={papel} accessibilityState={{ selected: ativa }} onPress={() => aoMudar(o.valor)} style={({ pressed }) => [st.pilula, ativa && st.pilulaAtiva, pressed && { opacity: 0.85 }]}>
            <T tam={13.5} peso="500" cor={ativa ? '#111111' : '#ffffff'}>{o.nome}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/* os números entre duas linhas finas: o número com o ícone em cima, o nome embaixo */
export function NumerosCapa({ itens }: { itens: { icone: NomeIcone; valor: number | string | undefined; nome: string }[] }) {
  return (
    <View style={st.numeros}>
      {itens.map((x, i) => (
        <React.Fragment key={x.nome}>
          {i ? <View style={st.separador} /> : null}
          <View style={st.numero} accessible accessibilityLabel={`${x.valor ?? 0} ${x.nome}`}>
            <View style={st.numeroLinha}>
              <Icone nome={x.icone} tamanho={15} cor="rgba(255,255,255,0.8)" />
              <T tam={16} peso="500" cor="#ffffff">{x.valor ?? '–'}</T>
            </View>
            <T tam={11.5} cor="rgba(255,255,255,0.7)" linhas={1} centro>{x.nome}</T>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

export function FraseCapa({ children }: { children: React.ReactNode }) {
  return <T tam={13.5} cor="rgba(255,255,255,0.78)" style={{ lineHeight: 20 }}>{children}</T>;
}

const st = estilos(() => StyleSheet.create({
  cartao: { borderRadius: 30, overflow: 'hidden', backgroundColor: PAINEL },
  imagemCaixa: { width: '100%', maxHeight: 340 },
  imagem: { width: '100%', height: '100%' },
  tituloLinha: { position: 'absolute', left: 20, right: 16, bottom: 6, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  titulo: { letterSpacing: -0.8, lineHeight: 38 },
  botao: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', backgroundColor: VERDE.botao, borderWidth: 1, borderColor: 'rgba(134,239,172,0.35)' },
  botaoToque: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  corpo: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, gap: 14 },
  pilulas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pilula: { minHeight: 40, paddingHorizontal: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  pilulaAtiva: { backgroundColor: '#ffffff' },
  numeros: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  numero: { flex: 1, alignItems: 'center', gap: 2, minWidth: 0 },
  numeroLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  separador: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.14)' },
}));
