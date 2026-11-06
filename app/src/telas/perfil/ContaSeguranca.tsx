/* Conta e segurança, dentro das Configurações do perfil: e-mail da conta, alterar a senha e a verificação em duas etapas (em breve).
   Sair da conta e apagar a conta continuam logo abaixo, na própria tela de Configurações. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { alterarSenha, validarNovaSenha } from '../../api/seguranca';
import { CampoFlutuante } from '../../componentes/CampoFlutuante';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone, NomeIcone } from '../../componentes/Icone';
import { Botao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { cores, estilos } from '../../tema';

function Linha({ icone, titulo, sub, direita, aoPressionar }: { icone: NomeIcone; titulo: string; sub: string; direita?: React.ReactNode; aoPressionar?: () => void }) {
  return (
    <Pressable accessibilityRole={aoPressionar ? 'button' : 'text'} accessibilityLabel={titulo} disabled={!aoPressionar} onPress={aoPressionar} style={({ pressed }) => [st.linha, pressed && { opacity: 0.85 }]}>
      <View style={st.icone}><Icone nome={icone} tamanho={20} cor="#ffffff" /></View>
      <View style={{ flex: 1 }}>
        <T tam={15} peso="500">{titulo}</T>
        <T tam={12.5} style={{ marginTop: 1, opacity: 0.85 }} linhas={1}>{sub}</T>
      </View>
      {direita ?? (aoPressionar ? <Icone nome="setaDireita" tamanho={18} cor="#ffffff" /> : null)}
    </Pressable>
  );
}

export function ContaSeguranca() {
  const { estado } = useLoja();
  const avisar = useAviso();
  const [trocando, setTrocando] = useState(false);
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [repetida, setRepetida] = useState('');
  const [erros, setErros] = useState<{ atual?: string; nova?: string; repetida?: string; geral?: string }>({});
  const [enviando, setEnviando] = useState(false);

  const abrir = () => { setAtual(''); setNova(''); setRepetida(''); setErros({}); setTrocando(true); };

  const salvar = async () => {
    const e = validarNovaSenha(atual, nova, repetida);
    setErros(e);
    if (e.atual || e.nova || e.repetida) return;
    setEnviando(true);
    try {
      await alterarSenha(atual, nova);
      setTrocando(false);
      avisar('Senha alterada.');
    } catch (err) {
      setErros({ geral: err instanceof Error ? err.message : 'Não foi possível alterar a senha.' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ gap: 10, marginBottom: 20 }}>
      <Linha icone="email" titulo="E-mail da conta" sub={estado.usuario?.email ?? '—'} />
      <Linha icone="cadeado" titulo="Alterar senha" sub="Troque a senha da sua conta" aoPressionar={abrir} />
      <Linha
        icone="verificado"
        titulo="Verificação em duas etapas"
        sub="Um código extra para entrar"
        direita={<View style={st.selo}><T tam={10.5} peso="500" style={{ letterSpacing: 0.6 }}>EM BREVE</T></View>}
      />

      <Folha aberta={trocando} aoFechar={() => setTrocando(false)} titulo="Alterar senha">
        <CampoFlutuante rotulo="Senha atual" icone="cadeado" value={atual} onChangeText={setAtual} secureTextEntry autoCapitalize="none" autoCorrect={false} erro={erros.atual} returnKeyType="next" />
        <View style={{ height: 12 }} />
        <CampoFlutuante rotulo="Nova senha" icone="cadeado" value={nova} onChangeText={setNova} secureTextEntry autoCapitalize="none" autoCorrect={false} erro={erros.nova} returnKeyType="next" />
        <View style={{ height: 12 }} />
        <CampoFlutuante rotulo="Repita a nova senha" icone="cadeado" value={repetida} onChangeText={setRepetida} secureTextEntry autoCapitalize="none" autoCorrect={false} erro={erros.repetida} returnKeyType="done" onSubmitEditing={salvar} />
        {erros.geral ? (
          <View style={st.aviso}><Icone nome="alerta" tamanho={16} cor={cores.erro} /><T tam={13} cor={cores.erro} style={{ flex: 1, lineHeight: 18 }}>{erros.geral}</T></View>
        ) : null}
        <Botao titulo="Salvar nova senha" carregando={enviando} aoPressionar={salvar} style={{ marginTop: 16 }} />
      </Folha>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 64 },
  icone: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  selo: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
}));
