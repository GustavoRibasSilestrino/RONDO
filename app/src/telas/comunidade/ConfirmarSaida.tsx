/* Confirmação ao sair de um clube: "Certeza que quer decepcionar o adm?". Sair só acontece depois do segundo toque. */
import React from 'react';
import { View } from 'react-native';
import { Folha } from '../../componentes/Estrutura';
import { Botao, T } from '../../componentes/Ui';

type Props = { aberto: boolean; nome: string; aoFechar: () => void; aoConfirmar: () => void };

export function ConfirmarSaida({ aberto, nome, aoFechar, aoConfirmar }: Props) {
  return (
    <Folha aberta={aberto} aoFechar={aoFechar} titulo="Certeza que quer decepcionar o adm?">
      <T tam={14} style={{ lineHeight: 21 }}>Você vai sair de {nome}. As publicações do clube deixam de aparecer no seu Início. Dá para voltar quando quiser (em clube privado, só com o código de convite).</T>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
        <Botao tipo="primario" titulo="Ficar" aoPressionar={aoFechar} style={{ flex: 1 }} />
        <Botao tipo="perigo" icone="sair" titulo="Sair" aoPressionar={aoConfirmar} style={{ flex: 1 }} />
      </View>
    </Folha>
  );
}
