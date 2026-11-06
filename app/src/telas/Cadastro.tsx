/* Criar conta pelo próprio app, com as mesmas regras do site: data de nascimento, autorização do responsável para
   menores de 18 anos, aceite dos Termos e da Privacidade (obrigatório, desmarcado) e e-mails de novidades à parte
   (opcional, desmarcado). Depois de criar, já entra. */
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { cadastrar } from '../api/conta';
import { CampoFlutuante, CampoRef } from '../componentes/CampoFlutuante';
import { Tela } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Marca } from '../componentes/Marca';
import { Botao, T } from '../componentes/Ui';
import { cores, estilos } from '../tema';
import type { Usuario } from '../tipos';
import { SITE } from './Login';

const emailValido = (v: string): boolean => /^\S+@\S+\.\S+$/.test(v.trim());

/* DD/MM/AAAA digitado -> AAAA-MM-DD, ou null se a data não existe ou está no futuro */
function lerData(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(a, mes - 1, d);
  if (data.getFullYear() !== a || data.getMonth() !== mes - 1 || data.getDate() !== d) return null;
  if (a < 1900 || data > new Date()) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
function idade(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number), h = new Date();
  return h.getFullYear() - a - (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d) ? 1 : 0);
}
/* põe as barras sozinho enquanto a pessoa digita só os números */
const mascararData = (v: string): string => {
  const n = v.replace(/\D/g, '').slice(0, 8);
  return n.length > 4 ? `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}` : n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
};

/* caixa de marcar, acessível (leitor de tela anuncia "caixa de seleção, marcada/desmarcada") */
function Caixa({ marcada, aoMudar, children, erro }: { marcada: boolean; aoMudar: (v: boolean) => void; children: React.ReactNode; erro?: boolean }) {
  return (
    <Pressable
      accessibilityRole="checkbox" accessibilityState={{ checked: marcada }} aria-checked={marcada} onPress={() => aoMudar(!marcada)}
      style={({ pressed }) => [st.caixa, pressed && { opacity: 0.85 }]}
    >
      <View style={[st.quadrado, marcada && st.quadradoMarcado, erro && !marcada && { borderColor: cores.erro }]}>
        {marcada ? <Icone nome="ok" tamanho={14} cor="#ffffff" /> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

/* link dentro do texto da caixa: abre o documento no navegador (o toque no link não marca a caixa) */
const Link = ({ titulo, caminho }: { titulo: string; caminho: string }) => (
  <Text accessibilityRole="link" onPress={() => Linking.openURL(`${SITE}${caminho}`)} style={{ color: cores.destaque2, textDecorationLine: 'underline' }}>{titulo}</Text>
);

export function Cadastro({ aoEntrar, aoVoltar }: { aoEntrar: (usuario: Usuario) => void; aoVoltar: () => void }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [nascimento, setNascimento] = useState('');
  const [respNome, setRespNome] = useState('');
  const [respEmail, setRespEmail] = useState('');
  const [respAutoriza, setRespAutoriza] = useState(false);
  const [aceita, setAceita] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [tentou, setTentou] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const emailRef = useRef<CampoRef>(null), senhaRef = useRef<CampoRef>(null), nascRef = useRef<CampoRef>(null);

  const dataIso = lerData(nascimento);
  const menor = dataIso !== null && idade(dataIso) < 18;

  /* erros por campo (só depois da primeira tentativa) */
  const e = tentou ? {
    nome: nome.trim().length < 2 ? 'Digite o seu nome.' : '',
    email: !emailValido(email) ? 'Digite um e-mail válido.' : '',
    senha: senha.length < 6 ? 'A senha precisa de pelo menos 6 caracteres.' : '',
    nascimento: !dataIso ? 'Digite a data no formato DD/MM/AAAA.' : '',
    respNome: menor && respNome.trim().length < 2 ? 'Digite o nome do responsável.' : '',
    respEmail: menor && !emailValido(respEmail) ? 'Digite o e-mail do responsável.'
      : menor && respEmail.trim().toLowerCase() === email.trim().toLowerCase() ? 'Use um e-mail diferente do seu.' : '',
  } : { nome: '', email: '', senha: '', nascimento: '', respNome: '', respEmail: '' };

  const enviar = async () => {
    if (enviando) return;
    setTentou(true);
    setErro('');
    const ok = nome.trim().length >= 2 && emailValido(email) && senha.length >= 6 && !!dataIso
      && (!menor || (respNome.trim().length >= 2 && emailValido(respEmail) && respEmail.trim().toLowerCase() !== email.trim().toLowerCase() && respAutoriza))
      && aceita;
    if (!ok) {
      setErro(!aceita ? 'Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.'
        : menor && !respAutoriza ? 'Menores de 18 anos precisam da autorização de um responsável.' : 'Confira os campos marcados.');
      return;
    }
    setEnviando(true);
    try {
      aoEntrar(await cadastrar({
        nome, email, senha, nascimento: dataIso!, aceita, marketing,
        responsavel: menor ? { nome: respNome.trim(), email: respEmail.trim(), autoriza: respAutoriza } : null,
      }));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível criar a conta agora.');
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Tela comDoca={false} animada={false}>
        <View style={st.coluna}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar para entrar" onPress={aoVoltar} hitSlop={8} style={st.voltar}>
            <Icone nome="voltar" tamanho={22} cor="#ffffff" />
          </Pressable>
          <View style={{ alignItems: 'center' }}><Marca altura={30} /></View>
          <T tam={40} peso="200" centro style={{ marginTop: 14 }}>Criar conta</T>
          <T tam={14.5} cor={cores.texto2} centro style={{ marginTop: 6, lineHeight: 21 }}>É grátis. Leva um minuto.</T>

          <View style={{ marginTop: 24, gap: 14 }}>
            <CampoFlutuante rotulo="Nome" icone="perfil" value={nome} onChangeText={setNome} erro={e.nome} autoComplete="name" textContentType="name" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => emailRef.current?.focus()} maxLength={120} />
            <CampoFlutuante ref={emailRef} rotulo="E-mail" icone="email" value={email} onChangeText={setEmail} erro={e.email} valido={emailValido(email)} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => senhaRef.current?.focus()} />
            <CampoFlutuante
              ref={senhaRef} rotulo="Senha" icone="cadeado" value={senha} onChangeText={setSenha} erro={e.senha} secureTextEntry={!verSenha}
              autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" returnKeyType="next" submitBehavior="submit"
              onSubmitEditing={() => nascRef.current?.focus()} maxLength={128}
              direita={
                <Pressable accessibilityRole="button" accessibilityLabel={verSenha ? 'Esconder senha' : 'Mostrar senha'} hitSlop={6} onPress={() => setVerSenha((v) => !v)} style={st.olho}>
                  <Icone nome={verSenha ? 'olhoFechado' : 'olho'} tamanho={20} cor={verSenha ? cores.destaque2 : cores.texto3} />
                </Pressable>
              }
            />
            <View>
              <CampoFlutuante ref={nascRef} rotulo="Nascimento (DD/MM/AAAA)" accessibilityLabel="Data de nascimento, no formato dia, mês e ano" icone="relogio" value={nascimento} onChangeText={(v) => setNascimento(mascararData(v))} erro={e.nascimento} keyboardType="number-pad" maxLength={10} autoComplete="birthdate-full" />
              <T tam={12} cor={cores.texto2} style={{ marginTop: 6, lineHeight: 17 }}>Só para saber se é preciso a autorização de um responsável.</T>
            </View>
          </View>

          {menor ? (
            <View style={st.responsavel}>
              <T tam={15} peso="500">Autorização do responsável</T>
              <T tam={12.5} cor={cores.texto2} style={{ lineHeight: 18 }}>Quem tem menos de 18 anos precisa da autorização de um dos pais ou responsável. Peça para ele preencher.</T>
              <CampoFlutuante rotulo="Nome do responsável" icone="perfil" value={respNome} onChangeText={setRespNome} erro={e.respNome} maxLength={120} />
              <CampoFlutuante rotulo="E-mail do responsável" icone="email" value={respEmail} onChangeText={setRespEmail} erro={e.respEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" />
              <Caixa marcada={respAutoriza} aoMudar={setRespAutoriza} erro={tentou}>
                <T tam={13} style={{ lineHeight: 19 }}>Sou o pai, a mãe ou o responsável legal e autorizo a criação da conta e o tratamento dos dados, como descrito na Política de Privacidade.</T>
              </Caixa>
            </View>
          ) : null}

          <View style={{ marginTop: 20, gap: 14 }}>
            <Caixa marcada={aceita} aoMudar={setAceita} erro={tentou}>
              <T tam={13} style={{ lineHeight: 19 }}>
                Li e aceito os <Link titulo="Termos de Uso" caminho="/termos" /> e a <Link titulo="Política de Privacidade" caminho="/privacidade" />, e
                autorizo o tratamento dos meus dados de saúde (treinos, alimentação, água e peso) para as funções do app.
              </T>
            </Caixa>
            <Caixa marcada={marketing} aoMudar={setMarketing}>
              <T tam={13} style={{ lineHeight: 19 }}>Quero receber e-mails de novidades do RONDO (opcional; dá para sair quando quiser).</T>
            </Caixa>
          </View>

          {erro ? (
            <View style={st.banner} accessibilityLiveRegion="polite" accessibilityRole="alert">
              <Icone nome="alerta" tamanho={18} cor={cores.erro} />
              <T tam={13.5} cor={cores.erro} style={{ flex: 1, lineHeight: 19 }}>{erro}</T>
            </View>
          ) : null}

          <View style={{ marginTop: 22 }}>
            <Botao orbita carregando={enviando} titulo={enviando ? 'Criando…' : 'Criar conta'} aoPressionar={enviar} />
          </View>
          <Pressable accessibilityRole="button" onPress={aoVoltar} style={{ alignSelf: 'center', paddingVertical: 14 }}>
            <T tam={13.5} cor={cores.texto2}>Já tem conta? <T tam={13.5} peso="500" cor={cores.destaque2}>Entrar</T></T>
          </Pressable>
        </View>
      </Tela>
    </KeyboardAvoidingView>
  );
}

const st = estilos(() => StyleSheet.create({
  coluna: { width: '100%', maxWidth: 400, alignSelf: 'center', paddingBottom: 24 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  olho: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  caixa: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44 },
  quadrado: { width: 22, height: 22, marginTop: 1, borderRadius: 6, borderWidth: 1.5, borderColor: cores.linha2, alignItems: 'center', justifyContent: 'center' },
  quadradoMarcado: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  responsavel: { marginTop: 18, gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: cores.destaque, backgroundColor: cores.cartao },
  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16, padding: 12,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,107,129,0.35)', backgroundColor: 'rgba(255,107,129,0.08)',
  },
}));
