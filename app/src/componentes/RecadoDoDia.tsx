/* No Feed: a pergunta do dia do RONDIN, com o atalho para conversar com ele (a tela Recado). */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useLoja } from '../estado/loja';
import { iso } from '../lib/datas';
import { perguntaDoDia } from '../lib/perguntas';
import { achaSotaque, sotaquePadrao } from '../lib/rondinVoz';
import { cores } from '../tema';
import { Icone } from './Icone';
import { T } from './Ui';

export function RecadoDoDia({ aoAbrir }: { aoAbrir: () => void }) {
  const { estado } = useLoja();
  const hoje = iso();
  const feito = estado.recados.some((r) => iso(new Date(r.criado)) === hoje);
  /* recados do formato antigo, que podiam ficar trancados até uma data, e chegam hoje */
  const chegou = estado.recados.filter((r) => r.entrega === hoje && iso(new Date(r.criado)) !== hoje).length;
  const idioma = estado.perfilFit ? achaSotaque(estado.perfilFit.sotaque).idioma : sotaquePadrao().idioma;
  const pergunta = perguntaDoDia(idioma);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={feito ? 'Você já conversou com o RONDIN hoje. Abrir' : `Pergunta do dia: ${pergunta} Conversar com o RONDIN`}
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
        <T tam={12.5} cor={cores.texto3}>{chegou ? 'Um recado seu chegou hoje' : feito ? 'Você já conversou com o RONDIN hoje' : 'Pergunta do dia'}</T>
        <T tam={15} linhas={3} style={{ marginTop: 3, lineHeight: 20 }}>
          {chegou ? 'Ouça o que você disse para quem você é hoje.' : feito ? 'Amanhã chega uma nova pergunta.' : pergunta}</T>
      </View>
      <Icone nome="setaDireita" tamanho={18} cor={cores.texto3} />
    </Pressable>
  );
}
