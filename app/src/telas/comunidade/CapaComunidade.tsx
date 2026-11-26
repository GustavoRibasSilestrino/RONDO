/* A capa da aba Comunidade (pedido do dono, 2026-11-26): a ilustração em pixel art dos dois dragõezinhos se abraçando, no desenho
   de uma referência que ele mandou (a tela de detalhe de um livro). A ilustração ocupa o alto do cartão de ponta a ponta e se
   funde no painel escuro de baixo; o título grande fica sobre a parte de baixo da imagem, com o botão redondo de criar ao lado.
   Embaixo: as abas Clubes e Desafios em pílulas, os números da pessoa entre duas linhas finas (dados reais, nada inventado) e
   uma frase curta. O painel é escuro nos dois temas, como um cartão de mídia, para o texto branco ler bem sobre a imagem. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { listarClubes, listarDesafios } from '../../api/social';
import { Icone, type NomeIcone } from '../../componentes/Icone';
import { T } from '../../componentes/Ui';
import { Vidro } from '../../componentes/Vidro';
import { useLoja } from '../../estado/loja';
import { estilos, VERDE } from '../../tema';

const IMAGEM = require('../../../assets/comunidade-capa.webp');
const PAINEL = '#141414';   // escuro nos dois temas: a imagem se funde nele e o texto branco lê bem

export type AbaComunidade = 'grupos' | 'desafios';

type Props = { aba: AbaComunidade; aoMudarAba: (a: AbaComunidade) => void; aoCriar: () => void };

export function CapaComunidade({ aba, aoMudarAba, aoCriar }: Props) {
  const { versaoSocial } = useLoja();
  const [numeros, setNumeros] = useState<{ clubes: number; desafios: number; dentro: number } | null>(null);

  /* os números da pessoa: os clubes em que está, os desafios ativos da comunidade e quantos deles ela participa */
  useEffect(() => {
    let vivo = true;
    Promise.all([listarClubes({ meus: true }), listarDesafios('ativos')])
      .then(([c, d]) => { if (vivo) setNumeros({ clubes: c.itens.length, desafios: d.itens.length, dentro: d.itens.filter((x) => x.meu).length }); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [versaoSocial]);

  return (
    <View style={st.cartao}>
      <View style={st.imagemCaixa}>
        <Image source={IMAGEM} style={st.imagem} resizeMode="cover" accessibilityIgnoresInvertColors accessible accessibilityLabel="Dois dragõezinhos se abraçando num bosque" />
        {/* a imagem se funde no painel de baixo, onde fica o título */}
        <LinearGradient pointerEvents="none" colors={['rgba(20,20,20,0)', 'rgba(20,20,20,0.55)', PAINEL]} locations={[0.45, 0.75, 1]} style={StyleSheet.absoluteFill} />
        <View style={st.tituloLinha}>
          <View style={{ flex: 1 }}>
            <T tam={32} peso="500" cor="#ffffff" style={st.titulo}>Comunidade</T>
            <T tam={13} cor="rgba(255,255,255,0.78)" style={{ marginTop: 2 }}>de quem treina com você</T>
          </View>
          <Vidro interativo tom={VERDE.botao} style={st.criar}>
            <Pressable
              accessibilityRole="button" accessibilityLabel="Criar clube ou desafio" onPress={aoCriar} hitSlop={4}
              style={({ pressed }) => [st.criarToque, pressed && { opacity: 0.8 }]}
            >
              <Icone nome="mais" tamanho={24} cor="#ffffff" espessura={2} />
            </Pressable>
          </Vidro>
        </View>
      </View>

      <View style={st.corpo}>
        <View accessibilityRole="tablist" style={st.pilulas}>
          {([['grupos', 'Clubes'], ['desafios', 'Desafios']] as const).map(([id, nome]) => {
            const ativa = aba === id;
            return (
              <Pressable
                key={id} accessibilityRole="tab" accessibilityState={{ selected: ativa }} onPress={() => aoMudarAba(id)}
                style={({ pressed }) => [st.pilula, ativa && st.pilulaAtiva, pressed && { opacity: 0.85 }]}
              >
                <T tam={13.5} peso="500" cor={ativa ? '#111111' : '#ffffff'}>{nome}</T>
              </Pressable>
            );
          })}
        </View>

        <View style={st.numeros}>
          <Numero icone="grupo" valor={numeros?.clubes} nome={numeros?.clubes === 1 ? 'clube seu' : 'clubes seus'} />
          <View style={st.separador} />
          <Numero icone="trofeu" valor={numeros?.desafios} nome={numeros?.desafios === 1 ? 'desafio ativo' : 'desafios ativos'} />
          <View style={st.separador} />
          <Numero icone="ok" valor={numeros?.dentro} nome="você participa" />
        </View>

        <T tam={13.5} cor="rgba(255,255,255,0.78)" style={{ lineHeight: 20 }}>
          Clubes para treinar junto e desafios criados pela própria comunidade. Nada vem pronto: quem faz são vocês.
        </T>
      </View>
    </View>
  );
}

function Numero({ icone, valor, nome }: { icone: NomeIcone; valor: number | undefined; nome: string }) {
  return (
    <View style={st.numero} accessible accessibilityLabel={`${valor ?? 0} ${nome}`}>
      <View style={st.numeroLinha}>
        <Icone nome={icone} tamanho={15} cor="rgba(255,255,255,0.8)" />
        <T tam={16} peso="500" cor="#ffffff">{valor ?? '–'}</T>
      </View>
      <T tam={11.5} cor="rgba(255,255,255,0.7)" linhas={1} centro>{nome}</T>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  cartao: { borderRadius: 30, overflow: 'hidden', backgroundColor: PAINEL },
  imagemCaixa: { width: '100%', aspectRatio: 1448 / 1086, maxHeight: 340 },
  imagem: { width: '100%', height: '100%' },
  tituloLinha: { position: 'absolute', left: 20, right: 16, bottom: 6, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  titulo: { letterSpacing: -0.8, lineHeight: 38 },
  criar: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', backgroundColor: VERDE.botao, borderWidth: 1, borderColor: 'rgba(134,239,172,0.35)' },   // botão: verde
  criarToque: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  corpo: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, gap: 14 },
  pilulas: { flexDirection: 'row', gap: 8 },
  pilula: { minHeight: 40, paddingHorizontal: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  pilulaAtiva: { backgroundColor: '#ffffff' },
  numeros: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  numero: { flex: 1, alignItems: 'center', gap: 2, minWidth: 0 },
  numeroLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  separador: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.14)' },
}));
