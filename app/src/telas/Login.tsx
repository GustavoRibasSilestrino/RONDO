/* Entrar com a conta: é só isso que a pessoa faz antes de usar o app. A assinatura é feita no site. */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, View } from 'react-native';
import { entrar, modoDemonstracao } from '../api/conta';
import { Tela } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Marca } from '../componentes/Marca';
import { Botao, Campo, T } from '../componentes/Ui';
import { cores } from '../tema';
import type { Usuario } from '../tipos';

export const SITE = 'https://yesteryou.vercel.app';

export function Login({ aoEntrar }: { aoEntrar: (usuario: Usuario) => void }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (enviando) return;
    setErro('');
    setEnviando(true);
    try {
      aoEntrar(await entrar(email.trim(), senha));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar. Tente de novo.');
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Tela comDoca={false}>
        <View style={{ marginTop: 28, marginBottom: 40, alignItems: 'center' }}>
          <Marca altura={30} />
        </View>

        <T tam={46} peso="200" centro>Entrar</T>
        <T tam={15} cor={cores.texto2} centro style={{ marginTop: 8, marginBottom: 32, lineHeight: 22 }}>
          Acesse a sua conta para continuar de onde parou.
        </T>

        <View style={{ gap: 18 }}>
          <Campo
            rotulo="E-mail"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <Campo
            rotulo="Senha"
            value={senha}
            onChangeText={setSenha}
            placeholder="Sua senha"
            secureTextEntry={!verSenha}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={enviar}
            direita={
              <Pressable accessibilityRole="button" accessibilityLabel={verSenha ? 'Esconder senha' : 'Mostrar senha'} onPress={() => setVerSenha((v) => !v)} style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                <Icone nome="olho" tamanho={20} cor={verSenha ? cores.destaque2 : cores.texto3} />
              </Pressable>
            }
          />
          {erro ? <T tam={13} cor={cores.erro} style={{ lineHeight: 19 }}>{erro}</T> : null}
          <Botao titulo={enviando ? 'Entrando...' : 'Entrar'} aoPressionar={enviar} desabilitado={enviando} style={{ marginTop: 4 }} />
        </View>

        <View style={{ marginTop: 36, gap: 10, alignItems: 'center' }}>
          <T tam={13} cor={cores.texto2} centro style={{ lineHeight: 20 }}>
            Ainda não tem conta? A assinatura é feita no{' '}
            <T tam={13} peso="500" cor={cores.destaque2} style={{ textDecorationLine: 'underline' }} >
              site
            </T>
            .
          </T>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(SITE)} style={{ alignSelf: 'center' }}>
            <T tam={13} peso="500" cor={cores.destaque2}>Abrir o site do Yesteryou →</T>
          </Pressable>
          {modoDemonstracao ? <T tam={12} cor={cores.texto3}>Protótipo: nenhum dado sai do seu aparelho.</T> : null}
        </View>
      </Tela>
    </KeyboardAvoidingView>
  );
}
