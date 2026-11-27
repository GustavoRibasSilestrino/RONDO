/* A capa da aba Comunidade (pedido do dono, 2026-11-26): uma ilustração em pixel art no desenho comum das capas
   (componentes/CapaIlustrada.tsx). Cada aba tem a sua (dono, 2026-11-26: "não quero que fique a mesma para ambas"): em Clubes,
   os dois dragõezinhos se abraçando; em Desafios, os dois numa queda de braço. Embaixo: as abas Clubes e Desafios em pílulas,
   os números da pessoa (dados reais, nada inventado) e uma frase curta. O botão redondo abre o menu de criar clube ou desafio. */
import React, { useEffect, useState } from 'react';
import { Image, Platform } from 'react-native';
import { listarClubes, listarDesafios } from '../../api/social';
import { CapaIlustrada, FraseCapa, NumerosCapa, PilulasCapa } from '../../componentes/CapaIlustrada';
import { useLoja } from '../../estado/loja';

/* as duas imagens têm o mesmo tamanho (1448 x 1086), então a capa não muda de altura ao trocar de aba */
const CAPAS = {
  grupos: { imagem: require('../../../assets/comunidade-capa.webp'), descricao: 'Dois dragõezinhos se abraçando num bosque' },
  desafios: { imagem: require('../../../assets/desafios-capa.webp'), descricao: 'Dois dragõezinhos numa queda de braço num bosque' },
} as const;

/* no navegador, a imagem da outra aba já fica baixada: a troca de aba mostra a capa nova na hora, sem piscar o fundo */
if (Platform.OS === 'web') {
  for (const c of Object.values(CAPAS)) {
    const uri = Image.resolveAssetSource?.(c.imagem)?.uri ?? (c.imagem as { uri?: string }).uri ?? (typeof c.imagem === 'string' ? c.imagem : null);
    if (uri) void Image.prefetch(uri).catch(() => {});
  }
}

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
    <CapaIlustrada
      imagem={CAPAS[aba].imagem} proporcao={1448 / 1086} descricaoImagem={CAPAS[aba].descricao}
      titulo="Comunidade" subtitulo="de quem treina com você"
      botao={{ icone: 'mais', rotulo: 'Criar clube ou desafio', aoPressionar: aoCriar }}
    >
      <PilulasCapa<AbaComunidade> opcoes={[{ valor: 'grupos', nome: 'Clubes' }, { valor: 'desafios', nome: 'Desafios' }]} valor={aba} aoMudar={aoMudarAba} />
      <NumerosCapa itens={[
        { icone: 'grupo', valor: numeros?.clubes, nome: numeros?.clubes === 1 ? 'clube seu' : 'clubes seus' },
        { icone: 'trofeu', valor: numeros?.desafios, nome: numeros?.desafios === 1 ? 'desafio ativo' : 'desafios ativos' },
        { icone: 'ok', valor: numeros?.dentro, nome: 'você participa' },
      ]} />
      <FraseCapa>Clubes para treinar junto e desafios criados pela própria comunidade. Nada vem pronto: quem faz são vocês.</FraseCapa>
    </CapaIlustrada>
  );
}
