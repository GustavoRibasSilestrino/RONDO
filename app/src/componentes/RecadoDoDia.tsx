/* No Feed: a pergunta do dia, com o atalho para gravar o recado de voz (a tela Recado). */
import React from 'react';
import { Pressable, View } from 'react-native';
import { PERGUNTAS } from '../dados';
import { useLoja } from '../estado/loja';
import { iso } from '../lib/datas';
import { perguntaDoDia } from '../telas/Recado';
import { cores } from '../tema';
import { Icone } from './Icone';
import { T } from './Ui';

export function RecadoDoDia({ aoAbrir }: { aoAbrir: () => void }) {
  const { estado } = useLoja();
  const hoje = iso();
  const feito = estado.recados.some((r) => iso(new Date(r.criado)) === hoje);
  const chegou = estado.recados.filter((r) => r.entrega === hoje).length;   // recados que chegam hoje

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={feito ? 'Recado de hoje guardado. Abrir recados' : `Pergunta do dia: ${PERGUNTAS[perguntaDoDia()]} Gravar recado`}
      onPress={aoAbrir}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18,
        backgroundColor: cores.cartao, borderWidth: 1, borderColor: cores.linha2, opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: feito ? cores.cartao2 : cores.destaque }}>
        <Icone nome={feito ? 'ok' : 'recado'} tamanho={22} cor="#ffffff" />
      </View>
      <View style={{ flex: 1 }}>
        <T tam={12.5} cor={cores.texto3}>{chegou ? 'Um recado seu chegou hoje' : feito ? 'Recado de hoje guardado' : 'Pergunta do dia'}</T>
        <T tam={15} linhas={2} style={{ marginTop: 3, lineHeight: 20 }}>
          {chegou ? 'Ouça o que você disse para quem você é hoje.' : feito ? 'Amanhã chega uma nova pergunta.' : PERGUNTAS[perguntaDoDia()]}
        </T>
      </View>
      <Icone nome="setaDireita" tamanho={18} cor={cores.texto3} />
    </Pressable>
  );
}
