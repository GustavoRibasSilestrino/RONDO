/* RONDO: o app. Duas coisas: entrar com a conta e a parte funcional (treino, dieta, evolução...).
   Cabeçalho fixo (notificações e a marca) no alto e uma barra de vidro escuro no pé, com todas as abas à vista. */
import { Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, useFonts } from '@expo-google-fonts/poppins';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Abertura } from './src/componentes/Abertura';
import { AvisoNivel } from './src/componentes/AvisoNivel';
import { FundoUltra } from './src/componentes/FundoUltra';
import { TrocaTemaProvider, useTrocaTema } from './src/componentes/TrocaTema';
import { BarraAbas, ItemAba } from './src/componentes/BarraAbas';
import { BotaoVoltar } from './src/componentes/BotaoVoltar';
import { CabecalhoApp } from './src/componentes/CabecalhoApp';
import { MenuLateral } from './src/componentes/MenuLateral';
import { PainelLateral } from './src/componentes/PainelLateral';
import { useLayoutLargo } from './src/lib/largura';
import { PlanoPro } from './src/componentes/PlanoPro';
import { AvisoProvider, useAviso } from './src/componentes/Estrutura';
import { Marca } from './src/componentes/Marca';
import { estadoVazio, LojaProvider, useLoja } from './src/estado/loja';
import { naoLidas, useNotificacoes } from './src/lib/notificacoes';
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
  const { estado, pronto: dadosProntos, commit, puxarDoServidor } = useLoja();
  const [fontes] = useFonts({ Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold });
  const pronto = dadosProntos && fontes;   // espera a fonte, para o texto não aparecer trocado
  const [tela, setTela] = useState(INICIO);
  const [planoAberto, setPlanoAberto] = useState(false);   // a folha do plano PRO, aberta pela estrela do topo
  const [antes, setAntes] = useState(INICIO);   // a aba em que a pessoa estava ao abrir as notificações: o sino volta para ela
  useNotificacoes();
  const trocarTema = useTrocaTema();
  const avisar = useAviso();
  const { largo, comPainel } = useLayoutLargo();   // computador: menu lateral no lugar da barra e do cabeçalho
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
        aoEntrar={(usuario, extra) => {
          commit((e) => {
            /* outra conta no mesmo aparelho: começa limpa, para não herdar os treinos e as publicações da conta anterior */
            if (e.ultimoEmail && e.ultimoEmail !== usuario.email) Object.assign(e, estadoVazio());
            e.usuario = usuario;
            e.ultimoEmail = usuario.email;
            /* o plano e o nível vêm da API: o dono tem nível máximo e PRO; os outros, o que a conta tiver */
            e.pro = usuario.papel === 'dono' || !!usuario.pro;
            if (extra) Object.assign(e, extra);   // o perfil que o RONDIN montou no cadastro: sobe para o servidor na sincronia
            e.xpExtra = usuario.papel === 'dono' ? Math.max(0, 10500 - xpTotal({ ...e, xpExtra: 0 })) : 0;
          });
          void puxarDoServidor();   // traz os treinos, a dieta e o resto desta conta que estão no servidor
          setTela(INICIO);
        }}
      />
    );
  }

  const naBarra = tela === 'notificacoes' ? '' : DO_PERFIL.includes(tela) ? 'perfil' : tela;
  const temaBloqueado = nivelDe(xpTotal(estado)) < NIVEL_ULTRA;
  const aoTrocarTema = () => { if (temaBloqueado) avisar('O tema Ultra libera no nível 15, o da tag Lenda de ontem.'); else trocarTema(tema === 'ultra' ? 'normal' : 'ultra'); };
  const aoAbrirNotificacoes = () => { if (tela === 'notificacoes') { setTela(antes); } else { setAntes(tela); setTela('notificacoes'); } };
  const escolher = (id: string) => { if (id !== tela) setTela(id); };
  return (
    <View style={{ flex: 1, flexDirection: largo ? 'row' : 'column' }}>
      {largo ? <MenuLateral itens={TELAS} atual={naBarra} aoEscolher={escolher} naoLidas={naoLidas(estado)} notificacoesAbertas={tela === 'notificacoes'} aoAbrirNotificacoes={aoAbrirNotificacoes} aoAbrirPro={() => setPlanoAberto(true)} temaBloqueado={temaBloqueado} aoTrocarTema={aoTrocarTema} /> : null}
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
      {DO_PERFIL.includes(tela) ? <BotaoVoltar rotulo="Voltar ao perfil" aoPressionar={() => setTela('perfil')} /> : null}
      {largo ? null : <CabecalhoApp aoAbrirPro={() => setPlanoAberto(true)} mostrarNome={tela === 'home'} mostrarTema={tela === 'home'} temaBloqueado={temaBloqueado} aoTrocarTema={aoTrocarTema} naoLidas={naoLidas(estado)} aberto={tela === 'notificacoes'} aoAbrirNotificacoes={aoAbrirNotificacoes} />}
      {largo ? null : <BarraAbas itens={TELAS} atual={naBarra} aoEscolher={setTela} />}
      </View>
      {comPainel ? <PainelLateral ir={setTela} /> : null}
      <PlanoPro aberto={planoAberto} aoFechar={() => setPlanoAberto(false)} />
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
