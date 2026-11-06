/* Configurações do perfil, em uma tela só com um menu: Seus dados, Benefícios por nível, Privacidade e Conta.
   Tudo o que deixaria o perfil carregado mora aqui. */
import React, { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apagarContaNoServidor } from '../../api/privacidade';
import { esquecerToken } from '../../api/sessao';
import { CampoFlutuante } from '../../componentes/CampoFlutuante';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone, NomeIcone } from '../../componentes/Icone';
import { Botao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { BENEFICIOS } from '../../lib/beneficios';
import { progressoNivel, xpTotal } from '../../lib/nivel';
import { cores, estilos, larguraMax } from '../../tema';
import { SITE } from '../Login';
import { ContaSeguranca } from './ContaSeguranca';
import { Privacidade } from './Privacidade';
import { SeusDados } from './SeusDados';

type Secao = 'dados' | 'beneficios' | 'privacidade' | 'conta';

const ITENS: { id: Secao; titulo: string; sub: string; icone: NomeIcone }[] = [
  { id: 'dados', titulo: 'Seus dados', sub: 'Medidas, atividade e objetivo', icone: 'perfil' },
  { id: 'beneficios', titulo: 'Benefícios por nível', sub: 'O que cada nível libera', icone: 'estrela' },
  { id: 'privacidade', titulo: 'Privacidade e dados', sub: 'E-mails, baixar seus dados e documentos', icone: 'olho' },
  { id: 'conta', titulo: 'Conta e segurança', sub: 'Senha, e-mail, sair e apagar', icone: 'cadeado' },
];

type Props = { aberto: boolean; aoFechar: () => void };

export function Configuracoes({ aberto, aoFechar }: Props) {
  const insets = useSafeAreaInsets();
  const { estado, commit, limpar } = useLoja();
  const avisar = useAviso();
  const [secao, setSecao] = useState<Secao | null>(null);
  const [apagando, setApagando] = useState(false);
  const [senhaApagar, setSenhaApagar] = useState('');
  const [erroApagar, setErroApagar] = useState<string | undefined>();
  const [apagandoAgora, setApagandoAgora] = useState(false);

  /* apagar de verdade: primeiro no servidor (pede a senha), depois neste aparelho */
  const apagarConta = async () => {
    if (!senhaApagar) { setErroApagar('Digite a sua senha para confirmar.'); return; }
    setApagandoAgora(true); setErroApagar(undefined);
    try {
      await apagarContaNoServidor(senhaApagar);
    } catch (e) {
      setErroApagar(e instanceof Error ? e.message : 'Não foi possível apagar agora. Tente de novo.');
      setApagandoAgora(false);
      return;
    }
    setApagandoAgora(false); setApagando(false); setSenhaApagar('');
    sair(); await esquecerToken(); await limpar();
    avisar('Conta apagada, com todos os dados do servidor e deste aparelho.');
  };

  const nivel = progressoNivel(xpTotal(estado)).nivel;
  const titulo = secao ? ITENS.find((i) => i.id === secao)!.titulo : 'Configurações';
  const sair = () => { setSecao(null); aoFechar(); };

  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={() => (secao ? setSecao(null) : sair())} statusBarTranslucent>
      <View style={st.tela}>
        <View style={[st.coluna, { paddingTop: insets.top + 8 }]}>
          <View style={st.topo}>
            <Pressable accessibilityRole="button" accessibilityLabel={secao ? 'Voltar às configurações' : 'Fechar'} onPress={() => (secao ? setSecao(null) : sair())} style={st.voltar}>
              <Icone nome={secao ? 'voltar' : 'fechar'} tamanho={22} cor="#ffffff" />
            </Pressable>
            <T tam={17} peso="500" style={{ flex: 1 }}>{titulo}</T>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, paddingTop: 8 }}>
            {secao === null ? (
              <View style={{ gap: 10 }}>
                {ITENS.map((i) => (
                  <Pressable key={i.id} accessibilityRole="button" accessibilityLabel={i.titulo} onPress={() => setSecao(i.id)} style={({ pressed }) => [st.linha, pressed && { opacity: 0.85 }]}>
                    <View style={st.icone}><Icone nome={i.icone} tamanho={20} cor="#ffffff" /></View>
                    <View style={{ flex: 1 }}>
                      <T tam={15.5} peso="500">{i.titulo}</T>
                      <T tam={12.5} style={{ marginTop: 1 }}>{i.sub}</T>
                    </View>
                    <Icone nome="setaDireita" tamanho={18} cor="#ffffff" />
                  </Pressable>
                ))}
                <T tam={11.5} style={{ marginTop: 14 }}>RONDO · versão 0.1.0</T>
              </View>
            ) : null}

            {secao === 'dados' ? <SeusDados /> : null}

            {secao === 'beneficios' ? (
              <View style={{ gap: 8 }}>
                {BENEFICIOS.map((b) => {
                  const aberto2 = nivel >= b.nivel;
                  return (
                    <View key={b.nivel} style={[st.linhaBeneficio, aberto2 && { borderColor: cores.linha2 }]}>
                      <View style={[st.nivelBeneficio, aberto2 && { backgroundColor: cores.destaqueForte }]}><T tam={13} peso="500">{b.nivel}</T></View>
                      <T tam={14} style={{ flex: 1, lineHeight: 19, opacity: aberto2 ? 1 : 0.6 }}>{b.texto}</T>
                      {aberto2 ? <Icone nome="ok" tamanho={18} cor={cores.bom} /> : <Icone nome="cadeado" tamanho={16} cor="#ffffff" />}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {secao === 'privacidade' ? <Privacidade /> : null}

            {secao === 'conta' ? (
              <View style={{ gap: 12 }}>
                <ContaSeguranca />
                <Botao tipo="fantasma" icone="sair" titulo="Sair da conta" aoPressionar={() => { sair(); void esquecerToken(); commit((e) => { e.usuario = null; }); }} />
                <Pressable accessibilityRole="link" onPress={() => Linking.openURL(SITE)} style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
                  <T tam={13} peso="500">Abrir o site do RONDO →</T>
                </Pressable>
                <Botao tipo="perigo" icone="lixo" titulo="Apagar conta" aoPressionar={() => { setSenhaApagar(''); setErroApagar(undefined); setApagando(true); }} />
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <Folha aberta={apagando} aoFechar={() => { if (!apagandoAgora) setApagando(false); }} titulo="Apagar conta?">
        <T tam={14} style={{ lineHeight: 21 }}>
          Isso apaga a sua conta e todos os seus dados no servidor e neste aparelho: treinos, dieta, publicações, comentários,
          stories, clubes que você criou, medalhas e recados. Não dá para desfazer. Se quiser uma cópia antes, use Baixar meus
          dados, em Privacidade e dados.
        </T>
        <View style={{ height: 16 }} />
        <CampoFlutuante rotulo="Sua senha" icone="cadeado" value={senhaApagar} onChangeText={setSenhaApagar} secureTextEntry autoCapitalize="none" autoCorrect={false} erro={erroApagar} returnKeyType="done" onSubmitEditing={apagarConta} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <Botao tipo="discreto" titulo="Cancelar" desabilitado={apagandoAgora} aoPressionar={() => setApagando(false)} style={{ flex: 1 }} />
          <Botao tipo="perigo" icone="lixo" titulo="Apagar tudo" carregando={apagandoAgora} aoPressionar={apagarConta} style={{ flex: 1 }} />
        </View>
      </Folha>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 52 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 64 },
  icone: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  linhaBeneficio: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: cores.linha },
  nivelBeneficio: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
}));
