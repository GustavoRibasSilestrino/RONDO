/* O plano PRO: o que vai incluir. Os planos pagos ainda não estão à venda: nada aqui promete o que não existe. */
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useLoja } from '../estado/loja';
import { SITE } from '../telas/Login';
import { cores, estilos } from '../tema';
import { Folha } from './Estrutura';
import { Icone, NomeIcone } from './Icone';
import { Botao, T } from './Ui';

const INCLUI: { icone: NomeIcone; titulo: string; sub: string }[] = [
  { icone: 'recado', titulo: 'Recados para o futuro sem limite', sub: 'No grátis, um recado por dia e um esperando por vez.' },
  { icone: 'grupo', titulo: 'Clube em destaque (em breve)', sub: 'O seu clube vai aparecer no topo da busca.' },
  { icone: 'ia', titulo: 'Treino e dieta com IA (em breve)', sub: 'Ainda não existe. Quando chegar, o que a IA gerar vai aparecer identificado.' },
  { icone: 'verificado', titulo: 'Profissionais com registro conferido (em breve)', sub: 'O cadastro de profissionais está aberto; o contato pelo app ainda não.' },
];

export function PlanoPro({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { estado } = useLoja();
  const ativo = estado.pro;
  const abrirSite = () => { Linking.openURL(`${SITE}/#planos`); aoFechar(); };

  return (
    <Folha aberta={aberto} aoFechar={aoFechar} titulo="Plano PRO">
      <View style={{ alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <View style={st.grande}><Icone nome="estrela" tamanho={32} cor="#ffffff" espessura={2} /></View>
        <T tam={13} peso="500" style={{ letterSpacing: 1 }}>{ativo ? 'SEU PLANO: PRO' : 'SEU PLANO: GRÁTIS'}</T>
      </View>

      <View style={{ gap: 10 }}>
        {INCLUI.map((i) => (
          <View key={i.titulo} style={st.linha}>
            <View style={st.icone}><Icone nome={i.icone} tamanho={19} cor="#ffffff" /></View>
            <View style={{ flex: 1 }}>
              <T tam={14.5} peso="500">{i.titulo}</T>
              <T tam={12.5} style={{ marginTop: 2, lineHeight: 17, opacity: 0.85 }}>{i.sub}</T>
            </View>
          </View>
        ))}
      </View>

      <View style={{ gap: 10, marginTop: 18 }}>
        <Botao icone="estrela" titulo="Ver os planos no site" aoPressionar={abrirSite} />
        <T tam={12} centro style={{ opacity: 0.85, lineHeight: 17 }}>
          {ativo ? 'O seu plano PRO está ativo.' : 'Os planos pagos ainda não estão à venda: nada é cobrado hoje.'} Quando abrirem: R$ 14,90 por mês,
          renovação automática avisada antes, cancelamento a qualquer momento e reembolso em até 7 dias.
        </T>
      </View>
    </Folha>
  );
}

const st = estilos(() => StyleSheet.create({
  grande: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  icone: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
}));
