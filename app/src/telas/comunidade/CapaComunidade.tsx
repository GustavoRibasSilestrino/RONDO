/* A capa da aba Comunidade (pedido do dono, 2026-11-26): a ilustração em pixel art dos dois dragõezinhos se abraçando, no desenho
   comum das capas (componentes/CapaIlustrada.tsx). Embaixo: as abas Clubes e Desafios em pílulas, os números da pessoa (dados
   reais, nada inventado) e uma frase curta. O botão redondo abre o menu de criar clube ou desafio. */
import React, { useEffect, useState } from 'react';
import { listarClubes, listarDesafios } from '../../api/social';
import { CapaIlustrada, FraseCapa, NumerosCapa, PilulasCapa } from '../../componentes/CapaIlustrada';
import { useLoja } from '../../estado/loja';

const IMAGEM = require('../../../assets/comunidade-capa.webp');

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
      imagem={IMAGEM} proporcao={1448 / 1086} descricaoImagem="Dois dragõezinhos se abraçando num bosque"
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
