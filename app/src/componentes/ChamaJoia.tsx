/* O foguinho da sequência: uma chama roxa, plana (2D), sem contorno e sem facetas. São duas formas chapadas: a chama e, dentro
   dela, o miolo mais claro. `situacao`: acesa (já teve registro hoje), em risco (a sequência vive, mas hoje ainda não teve registro:
   a chama fica mais fraca) ou apagada (sem sequência: cinza-lilás). É desenho vetorial: nitidez em qualquer tamanho e nenhum
   arquivo de imagem. A chama com o número de dias ao lado é o `SeloSequencia` (SeloSequencia.tsx).
   O nome do arquivo vem da primeira versão, que era uma chama lapidada como joia. */
import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { SituacaoSequencia } from '../lib/calc';

/* caixa de 24 x 30: a chama, com a língua menor à esquerda, e o miolo pousado no pé */
const CHAMA = 'M13.7 1C14.3 6.2 19.6 9.6 21.1 15.6C22.7 22.2 18.6 29 12 29C5.6 29 1.9 24.2 2.6 18.6C3 14.9 5.1 12.5 5.6 9.3C7.5 10.5 8.5 12.2 8.7 14.1C10.8 11.2 12.8 6.6 13.7 1Z';
const MIOLO = 'M12.1 29C8.8 29 6.9 26.5 7.3 23.7C7.7 21 9.8 19.5 10.5 16.8C13.5 18.5 16.8 21.4 16.6 24.7C16.4 27.4 14.6 29 12.1 29Z';

export function ChamaJoia({ tamanho = 24, situacao = 'acesa' }: { tamanho?: number; situacao?: SituacaoSequencia }) {
  const apagada = situacao === 'apagada';
  return (
    <View style={{ width: tamanho * 0.8, height: tamanho, opacity: situacao === 'emRisco' ? 0.62 : 1 }}>
      <Svg width={tamanho * 0.8} height={tamanho} viewBox="0 0 24 30">
        <Path d={CHAMA} fill={apagada ? '#5a546f' : '#8a3dff'} />
        <Path d={MIOLO} fill={apagada ? '#7d7793' : '#c9aaff'} />
      </Svg>
    </View>
  );
}
