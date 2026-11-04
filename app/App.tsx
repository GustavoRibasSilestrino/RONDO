/* KORA: o app. Duas coisas: entrar com a conta e a parte funcional (treino, dieta, evolução...).
   Cabeçalho fixo (notificações e a marca) no alto e uma barra de vidro escuro no pé, com todas as abas à vista. */
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { modoDemonstracao } from './src/api/conta';
import { Abertura } from './src/componentes/Abertura';
import { BarraAbas, ItemAba } from './src/componentes/BarraAbas';
import { CabecalhoApp } from './src/componentes/CabecalhoApp';
import { AvisoProvider } from './src/componentes/Estrutura';
import { Marca } from './src/componentes/Marca';
import { LojaProvider, useLoja } from './src/estado/loja';
import { naoLidas, useNotificacoes } from './src/lib/notificacoes';
import { semear } from './src/semear';
import { Colecoes } from './src/telas/Colecoes';
import { Dieta } from './src/telas/Dieta';
import { Evolucao } from './src/telas/Evolucao';
import { Hoje } from './src/telas/Hoje';
import { Login } from './src/telas/Login';
import { Notificacoes } from './src/telas/Notificacoes';
import { Perfil } from './src/telas/Perfil';
import { Recado } from './src/telas/Recado';
import { Social } from './src/telas/Social';
import { Treino } from './src/telas/Treino';
import { cores } from './src/tema';

/* o app abre no Treino, e o botão voltar do Android leva para ele */
const INICIO = 'treino';

/* da esquerda para a direita: o feed (a casinha), o treino, a comunidade, a dieta e o perfil */
const TELAS: ItemAba[] = [
  { id: 'home', rotulo: 'Início', icone: 'hoje' },
  { id: 'treino', rotulo: 'Treino', icone: 'treino' },
  { id: 'comunidade', rotulo: 'Comunidade', icone: 'social' },
  { id: 'dieta', rotulo: 'Dieta', icone: 'dieta' },
  { id: 'perfil', rotulo: 'Perfil', icone: 'perfil' },
];

/* telas que moram dentro do Perfil: a barra mantém o Perfil aceso e o voltar leva para ele */
const DO_PERFIL = ['hoje', 'evolucao', 'colecoes', 'recado'];

function Raiz() {
  const { estado, pronto, commit } = useLoja();
  const [tela, setTela] = useState(INICIO);
  useNotificacoes();

  /* botão voltar do Android: de qualquer tela volta para o início; no início, sai do app */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tela === INICIO) return false;
      setTela(DO_PERFIL.includes(tela) ? 'perfil' : INICIO);
      return true;
    });
    return () => sub.remove();
  }, [tela]);

  if (!pronto) {
    return (
      <View style={st.centro}>
        <Marca altura={34} />
      </View>
    );
  }

  if (!estado.usuario) {
    return (
      <Login
        aoEntrar={(usuario) => {
          commit((e) => {
            e.usuario = usuario;
            if (modoDemonstracao) semear(e, new Date());   // histórico de demonstração; com a API configurada, os dados vêm dela
          });
          setTela(INICIO);
        }}
      />
    );
  }

  const naBarra = tela === 'notificacoes' ? '' : DO_PERFIL.includes(tela) ? 'perfil' : tela;
  return (
    <View style={{ flex: 1 }}>
      {tela === 'home' && <Social modo="home" ir={setTela} />}
      {tela === 'comunidade' && <Social modo="comunidade" ir={setTela} />}
      {tela === 'treino' && <Treino />}
      {tela === 'dieta' && <Dieta />}
      {tela === 'hoje' && <Hoje ir={setTela} />}
      {tela === 'evolucao' && <Evolucao />}
      {tela === 'recado' && <Recado />}
      {tela === 'colecoes' && <Colecoes />}
      {tela === 'notificacoes' && <Notificacoes />}
      {tela === 'perfil' && <Perfil ir={setTela} />}
      <CabecalhoApp naoLidas={naoLidas(estado)} aberto={tela === 'notificacoes'} aoAbrirNotificacoes={() => setTela(tela === 'notificacoes' ? INICIO : 'notificacoes')} />
      <BarraAbas itens={TELAS} atual={naBarra} aoEscolher={setTela} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={st.raiz}>
        <LojaProvider>
          <AvisoProvider>
            <Raiz />
          </AvisoProvider>
        </LojaProvider>
        <Abertura />
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo },
});
