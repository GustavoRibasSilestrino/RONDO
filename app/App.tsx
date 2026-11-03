/* Yesteryou: o app. Duas coisas: entrar com a conta e a parte funcional (treino, dieta, evolução...).
   A navegação é a roda no pé da tela: um item só embaixo que abre as outras telas. */
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { modoDemonstracao } from './src/api/conta';
import { AvisoProvider } from './src/componentes/Estrutura';
import { Marca } from './src/componentes/Marca';
import { ItemRoda, Roda } from './src/componentes/Roda';
import { LojaProvider, useLoja } from './src/estado/loja';
import { semear } from './src/semear';
import { Dieta } from './src/telas/Dieta';
import { Evolucao } from './src/telas/Evolucao';
import { Hoje } from './src/telas/Hoje';
import { Login } from './src/telas/Login';
import { Perfil } from './src/telas/Perfil';
import { Recado } from './src/telas/Recado';
import { Social } from './src/telas/Social';
import { Treino } from './src/telas/Treino';
import { cores } from './src/tema';

const TELAS: ItemRoda[] = [
  { id: 'hoje', rotulo: 'Hoje', icone: 'hoje' },
  { id: 'treino', rotulo: 'Treino', icone: 'treino' },
  { id: 'dieta', rotulo: 'Dieta', icone: 'dieta' },
  { id: 'evolucao', rotulo: 'Evolução', icone: 'evolucao' },
  { id: 'social', rotulo: 'Comunidade', icone: 'social' },
  { id: 'recado', rotulo: 'Recado', icone: 'recado' },
  { id: 'perfil', rotulo: 'Perfil', icone: 'perfil' },
];

function Raiz() {
  const { estado, pronto, commit } = useLoja();
  const [tela, setTela] = useState('hoje');

  /* botão voltar do Android: de qualquer tela volta para Hoje; em Hoje, sai do app */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tela === 'hoje') return false;
      setTela('hoje');
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
          setTela('hoje');
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {tela === 'hoje' && <Hoje ir={setTela} />}
      {tela === 'treino' && <Treino />}
      {tela === 'dieta' && <Dieta />}
      {tela === 'evolucao' && <Evolucao />}
      {tela === 'social' && <Social />}
      {tela === 'recado' && <Recado />}
      {tela === 'perfil' && <Perfil />}
      <Roda itens={TELAS} atual={tela} aoEscolher={setTela} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={st.raiz}>
        {/* horizonte: um degradê roxo no pé da tela */}
        <LinearGradient colors={['rgba(5,5,7,0)', 'rgba(76,29,149,0.28)']} style={st.horizonte} pointerEvents="none" />
        <LojaProvider>
          <AvisoProvider>
            <Raiz />
          </AvisoProvider>
        </LojaProvider>
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  horizonte: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '55%' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo },
});
