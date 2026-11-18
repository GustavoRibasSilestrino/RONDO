/* Recursos pagos: o selo com a estrela (SeloPro) e o aviso que explica o plano PRO (AvisoPro).
   No navegador o aviso leva aos planos no site. No app instalado não há link nem preço: a Apple e o Google recusam app que
   manda a pessoa pagar fora da loja; quando o PRO for vendido, no celular será pela compra dentro do app. */
import React, { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { useLoja } from '../estado/loja';
import { cores, estilos } from '../tema';
import { Folha } from './Estrutura';
import { Icone } from './Icone';
import { Botao, T } from './Ui';
import { TelaPlanos } from './TelaPlanos';

/* a estrela de recurso pago, pequena, para ficar do lado do nome */
export function SeloPro() {
  return (
    <View accessibilityLabel="Recurso pago, plano PRO" style={st.selo}>
      <Icone nome="estrela" tamanho={12} cor="#ffffff" espessura={2} />
      <T tam={10.5} peso="500" cor="#ffffff" style={{ letterSpacing: 0.6 }}>PRO</T>
    </View>
  );
}

const NO_SITE = Platform.OS === 'web';

type Props = { aberto: boolean; aoFechar: () => void; recurso: string; site: string };

export function AvisoPro({ aberto, aoFechar, recurso }: Props) {
  const { estado } = useLoja();
  const [planos, setPlanos] = useState(false);   // a tela de planos (componentes/TelaPlanos.tsx)
  if (estado.pro) {
    return (
      <Folha aberta={aberto} aoFechar={aoFechar} titulo="Recurso PRO liberado">
        <View style={{ alignItems: 'center', gap: 12, paddingBottom: 6 }}>
          <View style={st.grande}><Icone nome="estrela" tamanho={30} cor="#ffffff" espessura={2} /></View>
          <T tam={16} peso="500" centro>{recurso}</T>
          <T tam={14} centro style={{ lineHeight: 21 }}>O seu plano PRO está ativo. Este recurso ainda não está pronto no app: falta ligar a IA.</T>
        </View>
      </Folha>
    );
  }
  return (
    <Folha aberta={aberto} aoFechar={aoFechar} titulo="Recurso PRO">
      <View style={{ alignItems: 'center', gap: 12, paddingBottom: 6 }}>
        <View style={st.grande}><Icone nome="estrela" tamanho={30} cor="#ffffff" espessura={2} /></View>
        <T tam={16} peso="500" centro>{recurso}</T>
        <T tam={14} centro style={{ lineHeight: 21 }}>
          Este recurso faz parte do plano PRO.
        </T>
        <Botao icone="estrela" titulo="Ver os planos" aoPressionar={() => setPlanos(true)} style={{ marginTop: 6 }} />
        <TelaPlanos aberto={planos} aoFechar={() => { setPlanos(false); aoFechar(); }} />
      </View>
    </Folha>
  );
}

const st = estilos(() => StyleSheet.create({
  selo: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: cores.destaqueForte },
  grande: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
}));
