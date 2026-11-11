/* Esqueci a senha: o e-mail da conta, o código de 6 dígitos que chega nele e a senha nova. Três passos, na mesma tela.
   O servidor responde igual exista a conta ou não (ninguém descobre quem tem conta), então a mensagem também é igual.
   Vem do RONDIN, então fala a língua que a pessoa escolheu lá (português, inglês ou espanhol). */
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pedirCodigoDeSenha, redefinirSenha } from '../api/conta';
import { CampoFlutuante, CampoRef } from '../componentes/CampoFlutuante';
import { Icone } from '../componentes/Icone';
import { Botao, T } from '../componentes/Ui';
import { useLayoutLargo } from '../lib/largura';
import type { Idioma } from '../lib/rondinSotaques';
import { TEXTOS, traduzirErro } from '../lib/rondinTextos';
import { cores, estilos } from '../tema';

type Props = { idioma?: Idioma; emailInicial: string; aoVoltar: () => void; aoConcluir: (email: string) => void };

const emailValido = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());
const ESPERA_REENVIO = 30;   // segundos até poder pedir outro código

export function RecuperarSenha({ idioma = 'pt', emailInicial, aoVoltar, aoConcluir }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { largo } = useLayoutLargo();
  const k = largo ? Math.min(1.6, Math.max(1, Math.min(width / 800, height / 760))) : 1;   // computador: tudo cresce junto com a janela
  const tx = TEXTOS[idioma].rec, ui = TEXTOS[idioma].ui;
  const msgDe = (e: unknown, padrao: string) => (e instanceof Error ? traduzirErro(e.message, idioma) : padrao);

  const [passo, setPasso] = useState<'email' | 'codigo' | 'pronto'>('email');
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const codigoRef = useRef<CampoRef>(null);
  const senhaRef = useRef<CampoRef>(null);

  useEffect(() => {   // contagem para poder reenviar
    if (espera <= 0) return undefined;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const enviarCodigo = async () => {
    if (enviando) return;
    if (!emailValido(email)) { setErro(tx.emailInvalido); return; }
    setErro(''); setEnviando(true);
    try {
      await pedirCodigoDeSenha(email.trim());
      setPasso('codigo'); setEspera(ESPERA_REENVIO);
      setTimeout(() => codigoRef.current?.focus(), 80);
    } catch (e) {
      setErro(msgDe(e, tx.falhaEnviar));
    } finally {
      setEnviando(false);
    }
  };

  const trocar = async () => {
    if (enviando) return;
    if (!/^\d{6}$/.test(codigo)) { setErro(tx.codigoInvalido); return; }
    if (senha.length < 8) { setErro(tx.senhaCurta); return; }
    setErro(''); setEnviando(true);
    try {
      await redefinirSenha(email.trim(), codigo, senha);
      setPasso('pronto');
    } catch (e) {
      setErro(msgDe(e, tx.falhaTrocar));
    } finally {
      setEnviando(false);
    }
  };

  const reenviar = async () => {
    if (espera > 0 || enviando) return;
    setErro(''); setEnviando(true);
    try { await pedirCodigoDeSenha(email.trim()); setEspera(ESPERA_REENVIO); setCodigo(''); } catch (e) { setErro(msgDe(e, tx.falhaEnviar)); } finally { setEnviando(false); }
  };

  const olho = (
    <Pressable accessibilityRole="button" accessibilityLabel={verSenha ? ui.esconderSenha : ui.verSenha} hitSlop={6} onPress={() => setVerSenha((v) => !v)} style={st.olho}>
      <Icone nome={verSenha ? 'olhoFechado' : 'olho'} tamanho={20} cor={verSenha ? cores.destaque2 : cores.texto3} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }}>
        <View style={[st.coluna, largo && { maxWidth: 520 }, k > 1 ? ({ zoom: k } as object) : null]}>
          {passo !== 'pronto' ? (
            <Pressable accessibilityRole="button" accessibilityLabel={tx.voltar} onPress={passo === 'codigo' ? () => { setPasso('email'); setErro(''); } : aoVoltar} hitSlop={8} style={st.voltar}>
              <Icone nome="voltar" tamanho={22} cor="#ffffff" />
            </Pressable>
          ) : <View style={st.voltar} />}

          <View style={st.iconeGrande}><Icone nome={passo === 'pronto' ? 'ok' : passo === 'codigo' ? 'email' : 'cadeado'} tamanho={32} cor="#ffffff" /></View>

          {passo === 'email' ? (
            <>
              <T tam={26} peso="300" centro style={{ marginTop: 22 }}>{tx.titulo1}</T>
              <T tam={15} cor={cores.texto2} centro style={{ marginTop: 10, lineHeight: 22 }}>{tx.texto1}</T>
              <View style={{ marginTop: 26, gap: 14 }}>
                <CampoFlutuante
                  rotulo={tx.email} icone="email" value={email} onChangeText={(v) => { setEmail(v); setErro(''); }} autoFocus={Platform.OS === 'web'}
                  erro={erro} valido={emailValido(email)} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" textContentType="emailAddress"
                  returnKeyType="send" onSubmitEditing={enviarCodigo}
                />
                <Botao orbita carregando={enviando} titulo={enviando ? tx.enviando : tx.enviarCodigo} aoPressionar={enviarCodigo} />
              </View>
            </>
          ) : null}

          {passo === 'codigo' ? (
            <>
              <T tam={26} peso="300" centro style={{ marginTop: 22 }}>{tx.titulo2}</T>
              <T tam={15} cor={cores.texto2} centro style={{ marginTop: 10, lineHeight: 22 }}>
                {tx.texto2a}<T tam={15} peso="500">{email.trim()}</T>{tx.texto2b}
              </T>
              <View style={{ marginTop: 26, gap: 14 }}>
                <CampoFlutuante
                  ref={codigoRef} rotulo={tx.codigo} icone="cadeado" value={codigo} onChangeText={(v) => { setCodigo(v.replace(/\D/g, '').slice(0, 6)); setErro(''); }}
                  keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" returnKeyType="next" onSubmitEditing={() => senhaRef.current?.focus()}
                />
                <CampoFlutuante
                  ref={senhaRef} rotulo={tx.senhaNova} icone="cadeado" value={senha} onChangeText={(v) => { setSenha(v); setErro(''); }} secureTextEntry={!verSenha}
                  autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={trocar} direita={olho}
                />
                {erro ? (
                  <View style={st.banner} accessibilityLiveRegion="polite" accessibilityRole="alert">
                    <Icone nome="alerta" tamanho={18} cor={cores.erro} />
                    <T tam={13.5} cor={cores.erro} style={{ flex: 1, lineHeight: 19 }}>{erro}</T>
                  </View>
                ) : null}
                <Botao orbita carregando={enviando} titulo={enviando ? tx.trocando : tx.trocar} aoPressionar={trocar} />
                <Pressable accessibilityRole="button" disabled={espera > 0 || enviando} onPress={reenviar} style={{ alignSelf: 'center', paddingVertical: 10 }}>
                  <T tam={13.5} cor={espera > 0 ? cores.texto3 : cores.destaque2} style={{ textDecorationLine: espera > 0 ? 'none' : 'underline' }}>
                    {espera > 0 ? tx.espera.replace('{n}', String(espera)) : tx.reenviar}
                  </T>
                </Pressable>
              </View>
            </>
          ) : null}

          {passo === 'pronto' ? (
            <>
              <T tam={26} peso="300" centro style={{ marginTop: 22 }}>{tx.titulo3}</T>
              <T tam={15} cor={cores.texto2} centro style={{ marginTop: 10, lineHeight: 22 }}>{tx.texto3}</T>
              <View style={{ marginTop: 26 }}><Botao orbita titulo={ui.entrar} aoPressionar={() => aoConcluir(email.trim())} /></View>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  coluna: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconeGrande: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginTop: 24, backgroundColor: cores.destaqueForte },
  olho: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,107,129,0.35)', backgroundColor: 'rgba(255,107,129,0.08)',
  },
}));
