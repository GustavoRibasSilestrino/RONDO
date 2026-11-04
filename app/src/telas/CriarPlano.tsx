/* O + da Dieta e do Treino: criar um plano com a KORA AI (ainda indisponível, falta ligar a API) ou procurar um profissional
   verificado dentro do app (nutricionista para a dieta, profissional de educação física para o treino). */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BotaoMais } from '../componentes/BotaoMais';
import { Folha } from '../componentes/Estrutura';
import { Icone, NomeIcone } from '../componentes/Icone';
import { T } from '../componentes/Ui';
import { cores } from '../tema';
import { BuscaProfissionais } from './BuscaProfissionais';

type Props = { tipo: 'dieta' | 'treino' };

const TEXTO = {
  dieta: { titulo: 'Criar dieta', ia: 'Criar com a KORA AI', iaSub: 'Uma dieta montada para o seu objetivo.', profissional: 'Procurar nutricionista', profSub: 'Profissionais verificados, com registro no CRN.', quem: 'nutricionista' as const },
  treino: { titulo: 'Criar treino', ia: 'Criar com a KORA AI', iaSub: 'Um treino montado para o seu objetivo.', profissional: 'Procurar educador físico', profSub: 'Profissionais verificados, com registro no CREF.', quem: 'educador' as const },
};

type OpcaoProps = { icone: NomeIcone; titulo: string; sub: string; indisponivel?: boolean; aoPressionar: () => void };

function Opcao({ icone, titulo, sub, indisponivel, aoPressionar }: OpcaoProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={titulo} onPress={aoPressionar} style={({ pressed }) => [st.opcao, pressed && { opacity: 0.85 }]}>
      <View style={st.icone}><Icone nome={icone} tamanho={22} cor="#ffffff" /></View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <T tam={15.5} peso="500">{titulo}</T>
          {indisponivel ? <View style={st.selo}><T tam={10.5} peso="500">INDISPONÍVEL</T></View> : null}
        </View>
        <T tam={13} style={{ marginTop: 3, lineHeight: 18 }}>{sub}</T>
      </View>
      <Icone nome="setaDireita" tamanho={18} cor="#ffffff" />
    </Pressable>
  );
}

export function CriarPlano({ tipo }: Props) {
  const t = TEXTO[tipo];
  const [aberta, setAberta] = useState(false);
  const [indisponivel, setIndisponivel] = useState(false);
  const [busca, setBusca] = useState(false);

  return (
    <>
      <BotaoMais rotulo={t.titulo} aoPressionar={() => setAberta(true)} />

      <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo={t.titulo}>
        <View style={{ gap: 10, paddingBottom: 4 }}>
          <Opcao icone="ia" titulo={t.ia} sub={t.iaSub} indisponivel aoPressionar={() => { setAberta(false); setIndisponivel(true); }} />
          <Opcao icone="busca" titulo={t.profissional} sub={t.profSub} aoPressionar={() => { setAberta(false); setBusca(true); }} />
        </View>
      </Folha>

      <Folha aberta={indisponivel} aoFechar={() => setIndisponivel(false)} titulo="KORA AI indisponível">
        <View style={{ alignItems: 'center', gap: 12, paddingBottom: 6 }}>
          <View style={[st.icone, { width: 64, height: 64, borderRadius: 32 }]}><Icone nome="ia" tamanho={30} cor="#ffffff" /></View>
          <T tam={15} centro style={{ lineHeight: 22 }}>A KORA AI ainda está indisponível. Ainda não adicionamos a API dela ao app.</T>
          <T tam={13} centro style={{ lineHeight: 19 }}>Enquanto isso, você pode procurar um profissional verificado aqui mesmo.</T>
          <Pressable accessibilityRole="button" onPress={() => { setIndisponivel(false); setBusca(true); }} style={st.botaoProf}>
            <T tam={14.5} peso="500">{t.profissional}</T>
          </Pressable>
        </View>
      </Folha>

      <BuscaProfissionais aberto={busca} aoFechar={() => setBusca(false)} tipo={t.quem} />
    </>
  );
}

const st = StyleSheet.create({
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 64 },
  icone: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  selo: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  botaoProf: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', minHeight: 50, borderRadius: 14, backgroundColor: cores.destaqueForte, marginTop: 6 },
});
