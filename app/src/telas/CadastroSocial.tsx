/* Segunda etapa de quem entrou pela primeira vez com Google ou Apple: a data de nascimento e o aceite dos documentos, como no
   cadastro comum (menores de 18 anos precisam da autorização de um responsável). O resto do perfil se preenche depois, no app. */
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { concluirCadastroSocial } from '../api/loginSocial';
import { CampoFlutuante } from '../componentes/CampoFlutuante';
import { Icone } from '../componentes/Icone';
import { Botao, T } from '../componentes/Ui';
import { emailValido, lerData, mascararData } from '../lib/rondinRoteiro';
import { cores, estilos } from '../tema';
import type { Usuario } from '../tipos';
import { SITE } from './Login';

function Caixa({ marcada, aoMudar, children, rotulo }: { marcada: boolean; aoMudar: () => void; children: React.ReactNode; rotulo: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityLabel={rotulo} {...({ 'aria-checked': marcada } as object)} accessibilityState={{ checked: marcada }} onPress={aoMudar} style={st.caixaLinha}>
      <View style={[st.caixa, marcada && st.caixaMarcada]}>{marcada ? <Icone nome="ok" tamanho={14} cor="#ffffff" espessura={2.4} /> : null}</View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

const idadeDe = (iso: string): number => {
  const [a, m, d] = iso.split('-').map(Number);
  const h = new Date();
  return h.getFullYear() - a - ((h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) ? 1 : 0);
};

type Props = { tokenSocial: string; nome?: string; email: string; aoVoltar: () => void; aoConcluir: (u: Usuario) => void };

export function CadastroSocial({ tokenSocial, nome, email, aoVoltar, aoConcluir }: Props) {
  const insets = useSafeAreaInsets();
  const [nascimento, setNascimento] = useState('');
  const [aceita, setAceita] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [respNome, setRespNome] = useState('');
  const [respEmail, setRespEmail] = useState('');
  const [autoriza, setAutoriza] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const iso = lerData(nascimento);
  const menor = !!iso && idadeDe(iso) < 18;

  const criar = async () => {
    if (enviando) return;
    if (!iso) { setErro('Digite uma data de nascimento que exista, no formato dia, mês e ano.'); return; }
    if (!aceita) { setErro('Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.'); return; }
    if (menor && (respNome.trim().length < 2 || !emailValido(respEmail) || !autoriza)) { setErro('Menores de 18 anos precisam do nome, do e-mail e da autorização de um responsável.'); return; }
    setErro(''); setEnviando(true);
    try {
      const usuario = await concluirCadastroSocial({ tokenSocial, nascimento: iso, marketing, responsavel: menor ? { nome: respNome.trim(), email: respEmail.trim(), autoriza } : null });
      aoConcluir(usuario);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a conta agora.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }}>
        <View style={st.coluna}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={aoVoltar} hitSlop={8} style={st.voltar}><Icone nome="voltar" tamanho={22} cor="#ffffff" /></Pressable>
          <T tam={26} peso="300" centro style={{ marginTop: 10 }}>{nome ? `Oi, ${nome.split(' ')[0]}!` : 'Quase lá!'}</T>
          <T tam={15} cor={cores.texto2} centro style={{ marginTop: 10, lineHeight: 22 }}>Falta pouco para criar a conta com <T tam={15} peso="500">{email}</T>.</T>

          <View style={{ marginTop: 24, gap: 14 }}>
            <CampoFlutuante
              rotulo="Nascimento (DD/MM/AAAA)" icone="calendario" value={nascimento} onChangeText={(v) => { setNascimento(mascararData(v)); setErro(''); }}
              keyboardType="number-pad" maxLength={10} autoComplete="birthdate-full"
            />
            {menor ? (
              <>
                <T tam={13.5} cor={cores.texto2} style={{ lineHeight: 20 }}>Como você tem menos de 18 anos, precisamos da autorização de um dos seus pais ou responsável.</T>
                <CampoFlutuante rotulo="Nome do responsável" icone="perfil" value={respNome} onChangeText={(v) => { setRespNome(v); setErro(''); }} autoCapitalize="words" />
                <CampoFlutuante rotulo="E-mail do responsável" icone="email" value={respEmail} onChangeText={(v) => { setRespEmail(v); setErro(''); }} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
                <Caixa rotulo="O responsável autoriza a criação da conta" marcada={autoriza} aoMudar={() => setAutoriza((v) => !v)}>
                  <T tam={13.5} style={{ lineHeight: 20 }}>O responsável autoriza a criação da conta e o uso dos dados, como descrito na Política de Privacidade.</T>
                </Caixa>
              </>
            ) : null}
            <Caixa rotulo="Aceito os Termos de Uso e a Política de Privacidade" marcada={aceita} aoMudar={() => { setAceita((v) => !v); setErro(''); }}>
              <T tam={13.5} style={{ lineHeight: 20 }}>
                Li e aceito os{' '}
                <T tam={13.5} cor={cores.destaque2} style={{ textDecorationLine: 'underline' }} {...({ onPress: () => Linking.openURL(`${SITE}/termos`) } as object)}>Termos de Uso</T>
                {' '}e a{' '}
                <T tam={13.5} cor={cores.destaque2} style={{ textDecorationLine: 'underline' }} {...({ onPress: () => Linking.openURL(`${SITE}/privacidade`) } as object)}>Política de Privacidade</T>
                , e autorizo o uso dos meus dados de saúde, como peso e treinos, para o app funcionar.
              </T>
            </Caixa>
            <Caixa rotulo="Quero receber novidades por e-mail (opcional)" marcada={marketing} aoMudar={() => setMarketing((v) => !v)}>
              <T tam={13.5} cor={cores.texto2} style={{ lineHeight: 20 }}>Quero receber novidades do RONDO por e-mail (opcional).</T>
            </Caixa>
            {erro ? (
              <View style={st.banner} accessibilityLiveRegion="polite" accessibilityRole="alert">
                <Icone nome="alerta" tamanho={18} cor={cores.erro} />
                <T tam={13.5} cor={cores.erro} style={{ flex: 1, lineHeight: 19 }}>{erro}</T>
              </View>
            ) : null}
            <Botao orbita carregando={enviando} titulo={enviando ? 'Criando…' : 'Criar a minha conta'} aoPressionar={criar} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  coluna: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  caixaLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  caixa: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: cores.linha2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  caixaMarcada: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,107,129,0.35)', backgroundColor: 'rgba(255,107,129,0.08)' },
}));
