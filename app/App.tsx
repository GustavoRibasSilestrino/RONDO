/* RONDO: o app. Duas coisas: entrar com a conta e a parte funcional (treino, dieta, evolução...).
   Cabeçalho fixo (notificações e a marca) no alto e uma barra de vidro escuro no pé, com todas as abas à vista. */
import { Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, useFonts } from '@expo-google-fonts/poppins';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Abertura } from './src/componentes/Abertura';
import { AnaliseExecucao } from './src/componentes/AnaliseExecucao';
import { AvisoNivel } from './src/componentes/AvisoNivel';
import { FundoCena, cenaDaTela } from './src/componentes/FundoCena';
import { BarraAbas, ItemAba } from './src/componentes/BarraAbas';
import { BotaoVoltar } from './src/componentes/BotaoVoltar';
import { CabecalhoApp } from './src/componentes/CabecalhoApp';
import { Chegada } from './src/componentes/Chegada';
import { Icone } from './src/componentes/Icone';
import { RondinChamado } from './src/componentes/RondinChamado';
import { MenuLateral } from './src/componentes/MenuLateral';
import { tirarCarregando } from './src/lib/carregando';
import { atrasoDaAbertura } from './src/lib/abertura';
import { useMenuRecolhido } from './src/lib/largura';
import { PainelLateral } from './src/componentes/PainelLateral';
import { useLayoutLargo } from './src/lib/largura';
import { SeloSequencia } from './src/componentes/SeloSequencia';
import { AvisoProvider } from './src/componentes/Estrutura';
import { T } from './src/componentes/Ui';
import { estadoVazio, LojaProvider, useLoja } from './src/estado/loja';
import { useEscutaDoChamado } from './src/lib/escuta';
import { voltarInterceptado } from './src/lib/interceptarVoltar';
import { naoLidas, useNotificacoes } from './src/lib/notificacoes';
import { achaSotaque, sotaquePadrao, type Idioma } from './src/lib/rondinVoz';
import { Colecoes } from './src/telas/Colecoes';
import { CriarPlano } from './src/telas/CriarPlano';
import { Dieta } from './src/telas/Dieta';
import { Diario } from './src/telas/Diario';
import { Evolucao } from './src/telas/Evolucao';
import { Hoje } from './src/telas/Hoje';
import { Login } from './src/telas/Login';
import { Notificacoes } from './src/telas/Notificacoes';
import { Perfil } from './src/telas/Perfil';
import { Recado } from './src/telas/Recado';
import { Social } from './src/telas/Social';
import { Treino } from './src/telas/Treino';
import { nivelDe, xpTotal } from './src/lib/nivel';
import { cores, estilos } from './src/tema';

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
const DO_PERFIL = ['hoje', 'evolucao', 'colecoes', 'recado', 'diario'];

const ESPERA_RONDIN = 5000;   // ms entre o app abrir e o RONDIN chegar com a pergunta do dia

function Raiz() {
  const { estado, pronto: dadosProntos, commit, puxarDoServidor } = useLoja();
  const [fontes] = useFonts({ Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold });
  const pronto = dadosProntos && fontes;   // espera a fonte, para o texto não aparecer trocado
  /* no navegador, a tela de carregamento (preta, com o RONDIN, de public/index.html) some quando a primeira tela está pronta */
  useEffect(() => { if (pronto) tirarCarregando(); }, [pronto]);
  const [tela, setTela] = useState(INICIO);
  const [antes, setAntes] = useState(INICIO);   // a aba em que a pessoa estava ao abrir as notificações: o sino volta para ela
  const [voltarPara, setVoltarPara] = useState('perfil');   // de onde a pessoa veio ao abrir Hoje, Evolução, Recado ou Coleções: o voltar leva para lá (o recado do feed volta para o feed)
  const [buscando, setBuscando] = useState(false);   // a busca de pessoas, aberta pela lupa (no alto do app, ou no canto do feed no computador)
  /* a chegada (componentes/Chegada.tsx): desde 2026-11-13 o app abre primeiro e o RONDIN chega 5 s depois (pedido do dono),
     fazendo a pergunta do dia. Uma vez por abertura do app. */
  const [chegando, setChegando] = useState(false);
  const chegadaMarcada = useRef(false);
  const logado = pronto && !!estado.usuario;
  useEffect(() => {
    if (!logado || chegadaMarcada.current) return;
    chegadaMarcada.current = true;
    const id = setTimeout(() => setChegando(true), atrasoDaAbertura() + ESPERA_RONDIN);
    return () => clearTimeout(id);
  }, [logado]);
  /* "Olá Rondin": a língua em que ele foi chamado, ou null (lib/escuta.ts; só no navegador, e só se a pessoa ligou) */
  const [chamado, setChamado] = useState<Idioma | null>(null);
  const idiomaRondin: Idioma = estado.perfilFit ? achaSotaque(estado.perfilFit.sotaque).idioma : sotaquePadrao().idioma;
  useEscutaDoChamado({ ativo: pronto && !!estado.usuario, idioma: idiomaRondin, aoChamar: (i) => setChamado(i ?? idiomaRondin) });
  useNotificacoes();
  const { largo, comPainel } = useLayoutLargo();   // computador: menu lateral no lugar da barra e do cabeçalho
  const [menuRecolhido, alternarMenu] = useMenuRecolhido();

  /* botão voltar do Android: de qualquer tela volta para o início; no início, sai do app */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (voltarInterceptado()) return true;   // a conversa do recado cuida do próprio voltar
      if (chamado) { setChamado(null); return true; }
      if (tela === 'notificacoes') { setTela(antes); return true; }
      if (tela === INICIO) return false;
      setTela(DO_PERFIL.includes(tela) ? voltarPara : INICIO);
      return true;
    });
    return () => sub.remove();
  }, [tela, antes, voltarPara, chamado]);

  if (!pronto) {
    /* enquanto carrega: a tela preta com o nome RONDO, igual à abertura (no navegador, igual à tela de carregamento) */
    return (
      <View style={st.centro}>
        <T tam={30} peso="200" style={{ letterSpacing: 10 }}>RONDO</T>
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
          setChegando(true);        // recém-entrou: o RONDIN aparece já fazendo a pergunta do dia
        }}
      />
    );
  }

  const naBarra = tela === 'notificacoes' ? '' : DO_PERFIL.includes(tela) ? voltarPara : tela;
  /* ir para uma tela de dentro do Perfil: guarda de onde veio, para o voltar levar de volta para lá */
  const irPara = (t: string) => { if (DO_PERFIL.includes(t)) setVoltarPara(DO_PERFIL.includes(tela) ? voltarPara : tela); setTela(t); };
  const aoAbrirNotificacoes = () => { if (tela === 'notificacoes') { setTela(antes); } else { setAntes(tela); setTela('notificacoes'); } };
  const escolher = (id: string) => { if (id !== tela) setTela(id); };
  return (
    <View style={{ flex: 1, flexDirection: largo ? 'row' : 'column' }}>
      {largo ? <MenuLateral itens={TELAS} atual={naBarra} aoEscolher={escolher} recolhido={menuRecolhido} aoAlternar={alternarMenu} nome={estado.usuario?.nome ?? ""} nivel={nivelDe(xpTotal(estado))} aoAbrirConta={() => setTela("perfil")} naoLidas={naoLidas(estado)} notificacoesAbertas={tela === 'notificacoes'} aoAbrirNotificacoes={aoAbrirNotificacoes} /> : null}
      <View style={{ flex: 1 }}>
      {/* a paisagem ilustrada da tela (as bolhas roxas saíram: tingiam o desenho todo de roxo) */}
      <FundoCena cena={cenaDaTela(tela)} />
      {tela === 'home' && <Social modo="home" ir={irPara} buscaAberta={buscando} aoFecharBusca={() => setBuscando(false)} />}
      {tela === 'comunidade' && <Social modo="comunidade" ir={irPara} buscaAberta={false} aoFecharBusca={() => setBuscando(false)} />}
      {tela === 'treino' && <><Treino />{estado.treinoAtual ? null : <CriarPlano tipo="treino" />}</>}
      {tela === 'dieta' && <><Dieta /><CriarPlano tipo="dieta" /></>}
      {tela === 'hoje' && <Hoje ir={irPara} />}
      {tela === 'evolucao' && <Evolucao />}
      {tela === 'recado' && <Recado aoSair={() => setTela(voltarPara)} aoDiario={() => irPara('diario')} />}
      {tela === 'diario' && <Diario ir={irPara} />}
      {tela === 'colecoes' && <Colecoes />}
      {tela === 'notificacoes' && <Notificacoes />}
      {tela === 'perfil' && <Perfil ir={irPara} />}
      {DO_PERFIL.includes(tela) && tela !== 'recado' ? <BotaoVoltar rotulo={voltarPara === 'perfil' ? 'Voltar ao perfil' : 'Voltar'} aoPressionar={() => setTela(voltarPara)} /> : null}
      {largo ? null : <CabecalhoApp aoBuscar={tela === 'home' ? () => setBuscando(true) : undefined} mostrarNome={tela === 'home'} mostrarSino={tela === 'home' || tela === 'notificacoes'} naoLidas={naoLidas(estado)} aberto={tela === 'notificacoes'} aoAbrirNotificacoes={aoAbrirNotificacoes} />}
      {largo ? null : <BarraAbas itens={TELAS} atual={naBarra} aoEscolher={setTela} />}
      {/* computador: a joia da sequência fica no canto de cima, à esquerda da área (no celular ela mora no cabeçalho) */}
      {largo ? <View pointerEvents="box-none" style={st.seloCanto}><SeloSequencia /></View> : null}
      {/* dentro da área do feed: a lupa fica sozinha no canto de cima à direita, sem passar por cima do painel de gráficos */}
      {largo && tela === 'home' ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Buscar pessoas" onPress={() => setBuscando(true)} style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [st.lupaCanto, (hovered || pressed) && { backgroundColor: cores.cartao2 }]}>
          <Icone nome="busca" tamanho={24} cor="#ffffff" />
        </Pressable>
      ) : null}
      </View>
      {comPainel ? <PainelLateral ir={setTela} /> : null}
      <AvisoNivel />
      {/* o RONDIN por cima de tudo: chamado pela voz ("Olá Rondin") ou, ao abrir o app, perguntando o recado do dia */}
      {chamado ? (
        <RondinChamado
          idioma={chamado} aoFechar={() => setChamado(null)}
          aoRecado={() => { setChamado(null); irPara('recado'); }} aoDiario={() => { setChamado(null); irPara('diario'); }}
        />
      ) : null}
      {chegando ? <Chegada depoisDoApp aoEntrar={() => setChegando(false)} aoDiario={() => { setChegando(false); irPara('diario'); }} /> : null}
    </View>
  );
}

/* /app/?camera=1: só a análise da execução, em tela cheia. É o que o app instalado abre no WebView depois de o celular
   liberar a câmera (componentes/AnaliseExecucao.tsx); o X da página avisa o app para fechar a tela. */
const SO_CAMERA = Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('camera') === '1';

function SoCamera() {
  const [fontes] = useFonts({ Poppins_300Light, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold });
  useEffect(() => { if (fontes) tirarCarregando(); }, [fontes]);
  if (!fontes) return <View style={st.centro} />;
  const fechar = () => {
    const rn = (window as unknown as { ReactNativeWebView?: { postMessage: (m: string) => void } }).ReactNativeWebView;
    if (rn) rn.postMessage('fechar'); else window.location.replace(window.location.pathname);
  };
  return <AnaliseExecucao aberta aoFechar={fechar} />;
}

export default function App() {
  if (SO_CAMERA) return <SoCamera />;
  return (
    <SafeAreaProvider>
      <View style={st.raiz}>
        <LojaProvider>
          <AvisoProvider>
            <Raiz />
          </AvisoProvider>
        </LojaProvider>
        {/* a abertura: a tela preta com o nome RONDO em branco, toda vez que o app abre, no celular e no navegador; depois dela vem o RONDIN */}
        <Abertura />
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}

const st = estilos(() => StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000000' },
  lupaCanto: { position: 'absolute', top: 22, right: 18, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  seloCanto: { position: 'absolute', top: 28, left: 18, zIndex: 5 },
}));
