/* Recursos pagos: o selo com a estrela (SeloPro) e o aviso que explica o plano PRO (AvisoPro). A assinatura é feita no site. */
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useLoja } from '../estado/loja';
import { cores, estilos } from '../tema';
import { Folha } from './Estrutura';
import { Icone } from './Icone';
import { Botao, T } from './Ui';

/* a estrela de recurso pago, pequena, para ficar do lado do nome */
export function SeloPro() {
  return (
    <View accessibilityLabel="Recurso pago, plano PRO" style={st.selo}>
      <Icone nome="estrela" tamanho={12} cor="#ffffff" espessura={2} />
      <T tam={10.5} peso="500" style={{ letterSpacing: 0.6 }}>PRO</T>
    </View>
  );
}

type Props = { aberto: boolean; aoFechar: () => void; recurso: string; site: string };

export function AvisoPro({ aberto, aoFechar, recurso, site }: Props) {
  const { estado } = useLoja();
  if (estado.pro) {
    return (
      <Folha aberta={aberto} aoFechar={aoFechar} titulo="Recurso PRO liberado">
        <View style={{ alignItems: 'center', gap: 12, paddingBottom: 6 }}>
          <View style={st.grande}><Icone nome="estrela" tamanho={30} cor="#ffffff" espessura={2} /></View>
          <T tam={16} peso="500" centro>{recurso}</T>
          <T tam={14} centro style={{ lineHeight: 21 }}>O seu plano PRO está ativo. Este recurso ainda não está pronto no app: falta ligar a IA.</T>
          <View style={{ alignSelf: 'stretch', marginTop: 6 }}><Botao tipo="discreto" titulo="Entendi" aoPressionar={aoFechar} /></View>
        </View>
      </Folha>
    );
  }
  return (
    <Folha aberta={aberto} aoFechar={aoFechar} titulo="Recurso PRO">
      <View style={{ alignItems: 'center', gap: 12, paddingBottom: 6 }}>
        <View style={st.grande}><Icone nome="estrela" tamanho={30} cor="#ffffff" espessura={2} /></View>
        <T tam={16} peso="500" centro>{recurso}</T>
        <T tam={14} centro style={{ lineHeight: 21 }}>Este recurso faz parte do plano PRO. A assinatura é feita no site da RONDO.</T>
        <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
          <Botao icone="estrela" titulo="Ver os planos no site" aoPressionar={() => { Linking.openURL(site); aoFechar(); }} />
          <Botao tipo="discreto" titulo="Agora não" aoPressionar={aoFechar} />
        </View>
      </View>
    </Folha>
  );
}

const st = estilos(() => StyleSheet.create({
  selo: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: cores.destaqueForte },
  grande: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
}));
