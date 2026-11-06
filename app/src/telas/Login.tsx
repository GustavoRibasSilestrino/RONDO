/* Entrar com a conta: é só isso que a pessoa faz antes de usar o app. A assinatura é feita no site.
   A tela entra em cascata (marca, pista, título, campos, botão), valida campo a campo, treme e vibra quando algo falha,
   e respeita "reduzir movimento". */
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { entrar } from '../api/conta';
import { CampoFlutuante, CampoRef } from '../componentes/CampoFlutuante';
import { Tela } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Marca } from '../componentes/Marca';
import { PistaMarca } from '../componentes/PistaMarca';
import { Botao, T } from '../componentes/Ui';
import { useMovimentoReduzido } from '../lib/movimento';
import { cores, estilos } from '../tema';
import type { Usuario } from '../tipos';

export const SITE = 'https://userondo.vercel.app';

const emailValido = (v: string): boolean => /^\S+@\S+\.\S+$/.test(v.trim());

export function Login({ aoEntrar }: { aoEntrar: (usuario: Usuario) => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [tentou, setTentou] = useState(false);          // já tentou entrar: mostra os erros de todos os campos
  const [tocouEmail, setTocouEmail] = useState(false);  // saiu do campo com algo digitado: mostra o erro dele
  const [tocouSenha, setTocouSenha] = useState(false);

  const emailRef = useRef<CampoRef>(null);
  const senhaRef = useRef<CampoRef>(null);
  const nativo = Platform.OS !== 'web';
  const reduzido = useMovimentoReduzido();
  /* em telas altas, a coluna fica no meio em vez de colada no topo (a Tela já reserva topo e rodapé) */
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const alturaMinima = Math.max(560, height - insets.top - insets.bottom - 64);

  /* ---------- erros por campo ---------- */
  const erroEmail = tentou || tocouEmail ? (!email.trim() ? 'Digite o seu e-mail.' : !emailValido(email) ? 'Digite um e-mail válido.' : '') : '';
  const erroSenha = tentou || tocouSenha ? (!senha ? 'Digite a sua senha.' : senha.length < 6 ? 'A senha tem pelo menos 6 caracteres.' : '') : '';

  /* ---------- entrada em cascata: uma animação só, cada item começa um pouco depois ---------- */
  const entrada = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduzido) { entrada.setValue(1); return undefined; }
    const anim = Animated.timing(entrada, { toValue: 1, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: nativo });
    anim.start();
    return () => anim.stop();
  }, [reduzido, entrada, nativo]);
  const surgir = (i: number) => {
    const ini = Math.min(0.55, i * 0.09);
    return {
      opacity: entrada.interpolate({ inputRange: [ini, ini + 0.45], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [{ translateY: entrada.interpolate({ inputRange: [ini, ini + 0.45], outputRange: [18, 0], extrapolate: 'clamp' }) }],
    };
  };

  /* ---------- tremida do formulário quando algo falha ---------- */
  const treme = useRef(new Animated.Value(0)).current;
  const tremer = () => {
    if (nativo) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    if (reduzido) return;
    Animated.sequence([1, -1, 0.7, -0.7, 0].map((v) => Animated.timing(treme, { toValue: v, duration: 55, useNativeDriver: nativo }))).start();
  };

  const enviar = async () => {
    if (enviando) return;
    setTentou(true);
    const emailRuim = !email.trim() || !emailValido(email);
    const senhaRuim = senha.length < 6;
    if (emailRuim || senhaRuim) {
      tremer();
      (emailRuim ? emailRef : senhaRef).current?.focus();
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      aoEntrar(await entrar(email.trim(), senha));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar. Tente de novo.');
      setEnviando(false);
      tremer();
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Tela comDoca={false} animada={false}>
        <View style={[st.coluna, { minHeight: alturaMinima, justifyContent: 'center' }]}>
          <Animated.View style={[{ alignItems: 'center', marginTop: 6 }, surgir(0)]}>
            <Marca altura={34} />
          </Animated.View>

          <Animated.View style={[{ marginTop: 14 }, surgir(1)]}>
            <PistaMarca />
          </Animated.View>

          <Animated.View style={surgir(2)}>
            <T tam={46} peso="200" centro>Entrar</T>
          </Animated.View>
          <Animated.View style={surgir(3)}>
            <T tam={15} cor={cores.texto2} centro style={{ marginTop: 8, lineHeight: 22 }}>
              Acesse a sua conta para continuar de onde parou.
            </T>
          </Animated.View>

          <Animated.View style={{ marginTop: 30, transform: [{ translateX: treme.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] }) }] }}>
            <Animated.View style={surgir(4)}>
              <CampoFlutuante
                ref={emailRef}
                rotulo="E-mail"
                icone="email"
                value={email}
                onChangeText={setEmail}
                erro={erroEmail}
                valido={emailValido(email)}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => senhaRef.current?.focus()}
                onBlur={() => { if (email.length > 0) setTocouEmail(true); }}
              />
            </Animated.View>

            <Animated.View style={[{ marginTop: 14 }, surgir(5)]}>
              <CampoFlutuante
                ref={senhaRef}
                rotulo="Senha"
                icone="cadeado"
                value={senha}
                onChangeText={setSenha}
                erro={erroSenha}
                secureTextEntry={!verSenha}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={enviar}
                onBlur={() => { if (senha.length > 0) setTocouSenha(true); }}
                direita={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={verSenha ? 'Esconder senha' : 'Mostrar senha'}
                    hitSlop={6}
                    onPress={() => setVerSenha((v) => !v)}
                    style={st.olho}
                  >
                    <Icone nome={verSenha ? 'olhoFechado' : 'olho'} tamanho={20} cor={verSenha ? cores.destaque2 : cores.texto3} />
                  </Pressable>
                }
              />
            </Animated.View>
          </Animated.View>

          {erro ? (
            <View style={st.banner} accessibilityLiveRegion="polite" accessibilityRole="alert">
              <Icone nome="alerta" tamanho={18} cor={cores.erro} />
              <T tam={13.5} cor={cores.erro} style={{ flex: 1, lineHeight: 19 }}>{erro}</T>
            </View>
          ) : null}

          <Animated.View style={[{ marginTop: 22 }, surgir(6)]}>
            <Botao orbita carregando={enviando} titulo={enviando ? 'Entrando…' : 'Entrar'} aoPressionar={enviar} />
          </Animated.View>

          <Animated.View style={[st.rodape, surgir(7)]}>
            <View style={st.fio} />
            <T tam={13.5} cor={cores.texto2} centro style={{ lineHeight: 20 }}>
              Ainda não tem conta? Crie a sua de graça no site.
            </T>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Abrir o site do RONDO"
              onPress={() => Linking.openURL(SITE)}
              style={({ pressed }) => [st.pilula, { opacity: pressed ? 0.7 : 1 }]}
            >
              <T tam={13.5} peso="500" cor={cores.destaque2}>Abrir o site do RONDO</T>
              <Icone nome="setaDireita" tamanho={16} cor={cores.destaque2} />
            </Pressable>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 }}>
              {[['Termos de Uso', '/termos'], ['Política de Privacidade', '/privacidade']].map(([t, c]) => (
                <Pressable key={c} accessibilityRole="link" accessibilityLabel={`${t}, abre no navegador`} onPress={() => Linking.openURL(`${SITE}${c}`)} style={{ paddingVertical: 8 }}>
                  <T tam={12.5} cor={cores.texto2} style={{ textDecorationLine: 'underline' }}>{t}</T>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>
      </Tela>
    </KeyboardAvoidingView>
  );
}

const st = estilos(() => StyleSheet.create({
  coluna: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  olho: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, padding: 12,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,107,129,0.35)', backgroundColor: 'rgba(255,107,129,0.08)',
  },
  rodape: { marginTop: 34, alignItems: 'center', gap: 14 },
  fio: { alignSelf: 'stretch', height: 1, backgroundColor: cores.linha, marginBottom: 6 },
  pilula: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 18,
    borderRadius: 999, borderWidth: 1, borderColor: cores.linha2, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
}));
