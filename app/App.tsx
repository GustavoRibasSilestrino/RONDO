/* RONDO: o app. Duas coisas: entrar com a conta e a parte funcional (treino, dieta, evolução...).
   Cabeçalho fixo (notificações e a marca) no alto e uma barra de vidro escuro no pé, com todas as abas à vista. */
import { Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, useFonts } from '@expo-google-fonts/poppins';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { modoDemonstracao } from './src/api/conta';
import { Abertura } from './src/componentes/Abertura';
import { AvisoNivel } from './src/componentes/AvisoNivel';
import { FundoUltra } from './src/componentes/FundoUltra';
import { TrocaTemaProvider, useTrocaTema } from './src/componentes/TrocaTema';
import { BarraAbas, ItemAba } from './src/componentes/BarraAbas';
import { CabecalhoApp } from './src/componentes/CabecalhoApp';
import { AvisoProvider, useAviso } from './src/componentes/Estrutura';
import { Marca } from './src/componentes/Marca';
import { LojaProvider, useLoja } from './src/estado/loja';
import { naoLidas, useNotificacoes } from './src/lib/notificacoes';
import { semear } from './src/semear';
import { Colecoes } from './src/telas/Colecoes';
import { CriarPlano } from './src/telas/CriarPlano';
import { Dieta } from './src/telas/Dieta';
import { Evolucao } from './src/telas/Evolucao';
import { Hoje } from './src/telas/Hoje';
import { Login } from './src/telas/Login';
import { Notificacoes } from './src/telas/Notificacoes';
import { Perfil } from './src/telas/Perfil';
import { Recado } from './src/telas/Recado';
import { Social } from './src/telas/Social';
import { Treino } from './src/telas/Treino';
import { estilos } from './src/tema';
import { NIVEL_ULTRA } from './src/lib/beneficios';
import { nivelDe, xpTotal } from './src/lib/nivel';
import { aplicarTema, cores } from './src/tema';

/* o app abre no Início (o feed), e o botão voltar do Android leva para ele */
const INICIO = 'home';
const CONTA_TESTE = 'teste@rondo.app';

/* da esquerda para a direita: o feed (a casinha), o treino, a comunidade, a dieta e o perfil */
const TELAS: ItemAba[] = [
  { id: 'home', rotulo: 'Feed', icone: 'hoje' },
  { id: 'treino', rotulo: 'Treino', icone: 'treino' },
  { id: 'comunidade', rotulo: 'Comunidade', icone: 'social' },
  { id: 'dieta', rotulo: 'Dieta', icone: 'dieta' },
  { id: 'perfil', rotulo: 'Perfil', icone: 'perfil' },
];

/* telas que moram dentro do Perfil: a barra mantém o Perfil aceso e o voltar leva para ele */
const DO_PERFIL = ['hoje', 'evolucao', 'colecoes', 'recado'];

function Raiz() {
  const { estado, pronto: dadosProntos, commit } = useLoja();
  const [fontes] = useFonts({ Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold });
  const pronto = dadosProntos && fontes;   // espera a fonte, para o texto não aparecer trocado
  const [tela, setTela] = useState(INICIO);
  const [antes, setAntes] = useState(INICIO);   // a aba em que a pessoa estava ao abrir as notificações: o sino volta para ela
  useNotificacoes();
  const trocarTema = useTrocaTema();
  const avisar = useAviso();
  /* o tema vale antes de tudo ser desenhado; o Ultra só a partir do nível 15 */
  const tema = estado.usuario && nivelDe(xpTotal(estado)) >= NIVEL_ULTRA ? estado.tema : 'normal';
  aplicarTema(tema);

  /* botão voltar do Android: de qualquer tela volta para o início; no início, sai do app */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tela === 'notificacoes') { setTela(antes); return true; }
      if (tela === INICIO) return false;
      setTela(DO_PERFIL.includes(tela) ? 'perfil' : INICIO);
      return true;
    });
    return () => sub.remove();
  }, [tela, antes]);

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
            if (modoDemonstracao) semear(e, new Date());
            /* a conta de teste: nível 15 e tudo liberado (tema Ultra, plano PRO), para dar para experimentar de tudo */
            if (modoDemonstracao && usuario.email.toLowerCase() === CONTA_TESTE) { e.xpExtra = Math.max(0, 10500 - xpTotal({ ...e, xpExtra: 0 })); e.pro = true; e.usuario.nome = 'Conta Teste'; }   // histórico de demonstração; com a API configurada, os dados vêm dela
          });
          setTela(INICIO);
        }}
      />
    );
  }

  const naBarra = tela === 'notificacoes' ? '' : DO_PERFIL.includes(tela) ? 'perfil' : tela;
  return (
    <View style={{ flex: 1 }}>
      {tema === 'ultra' ? <FundoUltra /> : null}
      {tela === 'home' && <Social modo="home" ir={setTela} />}
      {tela === 'comunidade' && <Social modo="comunidade" ir={setTela} />}
      {tela === 'treino' && <><Treino />{estado.treinoAtual ? null : <CriarPlano tipo="treino" />}</>}
      {tela === 'dieta' && <><Dieta /><CriarPlano tipo="dieta" /></>}
      {tela === 'hoje' && <Hoje ir={setTela} />}
      {tela === 'evolucao' && <Evolucao />}
      {tela === 'recado' && <Recado />}
      {tela === 'colecoes' && <Colecoes />}
      {tela === 'notificacoes' && <Notificacoes />}
      {tela === 'perfil' && <Perfil ir={setTela} />}
      <CabecalhoApp mostrarNome={tela === 'home'} mostrarTema={tela === 'home'} temaBloqueado={nivelDe(xpTotal(estado)) < NIVEL_ULTRA} aoTrocarTema={() => { if (nivelDe(xpTotal(estado)) < NIVEL_ULTRA) avisar('O tema Ultra libera no nível 15, o da tag Lenda de ontem.'); else trocarTema(tema === 'ultra' ? 'normal' : 'ultra'); }} naoLidas={naoLidas(estado)} aberto={tela === 'notificacoes'} aoAbrirNotificacoes={() => { if (tela === 'notificacoes') { setTela(antes); } else { setAntes(tela); setTela('notificacoes'); } }} />
      <BarraAbas itens={TELAS} atual={naBarra} aoEscolher={setTela} />
      <AvisoNivel />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={st.raiz}>
        <LojaProvider>
          <TrocaTemaProvider>
            <AvisoProvider>
              <Raiz />
            </AvisoProvider>
          </TrocaTemaProvider>
        </LojaProvider>
        <Abertura />
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}

const st = estilos(() => StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.fundo },
}));
