/* Início e Comunidade. O Início é o feed: as publicações de quem você segue e dos clubes (texto, fotos e vídeos).
   A Comunidade tem os clubes (criar, entrar, convidar e publicar dentro) e o ranking semanal de constância.
   O botão + roxo, sobre a barra, cria uma publicação. Feed, clubes e perfis vêm do servidor e são os mesmos para todo mundo. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { useMovimentoReduzido } from '../lib/movimento';
import { lerFeed } from '../api/social';
import type { Pessoa } from '../api/social';
import { Tela, useAviso } from '../componentes/Estrutura';
import { MenuMais } from '../componentes/MenuMais';
import { BotaoMais } from '../componentes/BotaoMais';
import { Botao, Cartao, Segmentos, T } from '../componentes/Ui';
import { useLista } from '../estado/lista';
import { useLoja } from '../estado/loja';
import { comparar, statsSemana } from '../lib/calc';
import { cores, estilos } from '../tema';
import type { Midia } from '../tipos';
import { RecadoDoDia } from '../componentes/RecadoDoDia';
import { BarraStories } from '../componentes/stories/BarraStories';
import { CartaoPost } from './comunidade/CartaoPost';
import { BuscaUsuarios } from './comunidade/BuscaUsuarios';
import { PerfilPessoa } from './comunidade/PerfilPessoa';
import { Compositor } from './comunidade/Compositor';
import { CriarGrupo } from './comunidade/CriarGrupo';
import { GrupoTela } from './comunidade/GrupoTela';
import { Grupos } from './comunidade/Grupos';
import { VisorMidia } from './comunidade/Midia';
import { Ranking } from './comunidade/Ranking';

type Aba = 'grupos' | 'ranking';

/* as separações do Feed, logo abaixo do cabeçalho (pedido do dono, 2026-11-18): quem você segue, os seus clubes e o explorar
   (tudo o que você pode ver). O servidor já filtra (filtro do GET /social/feed). */
type Separacao = 'seguindo' | 'clubes' | 'todos';
const SEPARACOES: { id: Separacao; nome: string; vazio: string }[] = [
  { id: 'seguindo', nome: 'Seguindo', vazio: 'Quem você segue ainda não publicou. Siga mais gente pela lupa, no alto.' },
  { id: 'clubes', nome: 'Comunidade', vazio: 'Nada nos seus clubes ainda. Entre em um clube na aba Comunidade.' },
  { id: 'todos', nome: 'Explorar', vazio: 'Seja a primeira pessoa a compartilhar algo hoje.' },
];

/* as separações, sem linhas (pedido do dono, 2026-11-18): o marcador é um só e DESLIZA até a escolhida com mola, e o feed troca
   como um carrossel (CarrosselFeed). Parado para quem pede menos movimento. */
function SeparacoesFeed({ valor, aoMudar }: { valor: Separacao; aoMudar: (v: Separacao) => void }) {
  const reduzido = useMovimentoReduzido();
  const [largura, setLargura] = useState(0);
  const i = SEPARACOES.findIndex((x) => x.id === valor);
  const pos = useRef(new Animated.Value(i)).current;
  useEffect(() => {
    if (reduzido) { pos.setValue(i); return; }
    Animated.spring(pos, { toValue: i, useNativeDriver: Platform.OS !== 'web', speed: 18, bounciness: 5 }).start();
  }, [i, reduzido, pos]);
  const coluna = largura / SEPARACOES.length;
  return (
    <View accessibilityRole="tablist" style={st.separacoes} onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
      {SEPARACOES.map((x) => {
        const ativa = x.id === valor;
        return (
          <Pressable key={x.id} accessibilityRole="tab" accessibilityState={{ selected: ativa }} onPress={() => aoMudar(x.id)} style={st.separacao}>
            <T tam={14.5} peso={ativa ? '500' : '400'} cor={ativa ? cores.texto : cores.texto2}>{x.nome}</T>
          </Pressable>
        );
      })}
      {largura ? (
        <Animated.View
          pointerEvents="none"
          style={[st.marcador, { transform: [{ translateX: pos.interpolate({ inputRange: [0, SEPARACOES.length - 1], outputRange: [(coluna - 28) / 2, coluna * (SEPARACOES.length - 1) + (coluna - 28) / 2] }) }] }]}
        />
      ) : null}
    </View>
  );
}

/* o feed de cada separação entra pelo lado de onde ela fica: indo para a direita (Seguindo -> Explorar), o novo vem da direita;
   voltando, vem da esquerda. Curto (240 ms), só 36 px de caminho e esmaecendo: um carrossel discreto. */
function CarrosselFeed({ indice, children }: { indice: number; children: React.ReactNode }) {
  const reduzido = useMovimentoReduzido();
  const anterior = useRef(indice);
  const x = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (indice === anterior.current) return;
    const lado = indice > anterior.current ? 1 : -1;
    anterior.current = indice;
    if (reduzido) return;
    const nativo = Platform.OS !== 'web';
    x.setValue(36 * lado);
    op.setValue(0);
    Animated.parallel([
      Animated.timing(x, { toValue: 0, duration: 240, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: nativo }),
      Animated.timing(op, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: nativo }),
    ]).start();
  }, [indice, reduzido, x, op]);
  return <Animated.View style={{ opacity: op, transform: [{ translateX: x }] }}>{children}</Animated.View>;
}

export function Social({ modo, ir, buscaAberta, aoFecharBusca }: { modo: 'home' | 'comunidade'; ir: (tela: string) => void; buscaAberta: boolean; aoFecharBusca: () => void }) {
  const { estado } = useLoja();
  const avisar = useAviso();
  const [aba, setAba] = useState<Aba>('grupos');
  const [separacao, setSeparacao] = useState<Separacao>('todos');
  const [grupoAberto, setGrupoAberto] = useState<number | null>(null);
  const [compor, setCompor] = useState<{ aberto: boolean; grupo: number | null }>({ aberto: false, grupo: null });
  const [criando, setCriando] = useState(false);
  const [menuMais, setMenuMais] = useState(false);   // o menu do botão +
  const [perfilAberto, setPerfilAberto] = useState<number | null>(null);   // o perfil de quem publicou, aberto ao tocar na foto
  const [visor, setVisor] = useState<{ itens: Midia[]; indice: number } | null>(null);

  const voltarDoGrupo = useCallback(() => setGrupoAberto(null), []);
  const abrirMidia = useCallback((itens: Midia[], indice: number) => setVisor({ itens, indice }), []);

  /* botão voltar do Android: dentro de um clube, volta para a lista */
  useEffect(() => {
    if (!grupoAberto) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setGrupoAberto(null); return true; });
    return () => sub.remove();
  }, [grupoAberto]);

  const hoje = new Date();
  /* o servidor decide o que a pessoa pode ver: o geral, os clubes públicos e os clubes em que ela está (privado nunca vaza) */
  const feed = useLista(
    (cursor) => lerFeed({ filtro: separacao, antes: cursor }),
    [separacao],
    modo === 'home' && grupoAberto === null,
  );
  const posts = feed.itens;

  const compartilhar = async () => {
    const cmp = comparar(statsSemana(estado, hoje, 0), statsSemana(estado, hoje, 1));
    const texto = cmp.geral === null ? 'Estou começando a competir com o meu ontem no RONDO.' : `Esta semana estou ${cmp.geral >= 0 ? '+' : ''}${cmp.geral}% em relação à semana passada. Compita com quem você foi ontem. RONDO.`;
    try {
      await Share.share({ message: texto });
    } catch {
      avisar('Compartilhar não está disponível neste aparelho.');
    }
  };

  const abrirCompositor = (grupo: number | null) => setCompor({ aberto: true, grupo });
  const abrirPerfil = (autor: Pessoa) => { if (autor.voce) ir('perfil'); else setPerfilAberto(autor.id); };

  return (
    <>
      <Tela compacto={modo === 'home' && !grupoAberto}>
        {grupoAberto ? (
          <GrupoTela id={grupoAberto} aoVoltar={voltarDoGrupo} aoCompor={abrirCompositor} aoAbrirMidia={abrirMidia} aoAbrirPerfil={abrirPerfil} />
        ) : modo === 'home' ? (
          <>
            {/* a lupa mora no alto do app (ao lado do tema no celular; no canto do feed no computador) */}
            <SeparacoesFeed valor={separacao} aoMudar={setSeparacao} />
            <BarraStories aoAbrirPerfil={abrirPerfil} />
            <View style={{ marginTop: 14 }}><RecadoDoDia aoAbrir={() => ir('recado')} /></View>
            <CarrosselFeed indice={SEPARACOES.findIndex((x) => x.id === separacao)}>
            <View style={{ marginTop: 16 }}>
              {posts.length ? (
                <>
                  {/* contínuo, sem caixas: as publicações vão de ponta a ponta da tela, separadas só por uma linha fina */}
                  <View style={st.lista}>
                    {posts.map((p) => (
                      <CartaoPost key={p.id} timeline sangrar post={p} aoAbrirGrupo={p.clube ? () => setGrupoAberto(p.clube!.id) : undefined} aoAbrirMidia={abrirMidia} aoAbrirPerfil={abrirPerfil} aoApagar={(id) => feed.mudar((l) => l.filter((x) => x.id !== id))} aoBloquear={(aid) => feed.mudar((l) => l.filter((x) => x.autor.id !== aid))} />
                    ))}
                  </View>
                  {feed.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais" aoPressionar={feed.maisItens} carregando={feed.carregando} style={{ marginTop: 14 }} /> : null}
                </>
              ) : feed.erro || feed.carregando ? (
                <Cartao>
                  <T tam={16}>{feed.erro ? 'Não foi possível carregar o feed.' : 'Carregando o feed...'}</T>
                  {feed.erro ? (
                    <>
                      <T tam={13.5} style={{ marginTop: 6, lineHeight: 20 }}>{feed.erro}</T>
                      <Botao pequeno tipo="fantasma" titulo="Tentar de novo" aoPressionar={feed.recarregar} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
                    </>
                  ) : null}
                </Cartao>
              ) : (
                <Cartao>
                  <T tam={16}>Nada por aqui ainda.</T>
                  <T tam={13.5} style={{ marginTop: 6, lineHeight: 20 }}>{SEPARACOES.find((x) => x.id === separacao)!.vazio}</T>
                  <Botao pequeno titulo="Criar publicação" aoPressionar={() => abrirCompositor(null)} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
                </Cartao>
              )}
            </View>
            </CarrosselFeed>
          </>
        ) : (
          <>
            <T tam={13.5} cor={cores.texto2} centro>Clubes e gente que também voltou hoje.</T>
            <Botao pixel icone="mais" titulo="Criar clube" aoPressionar={() => setCriando(true)} style={{ marginTop: 16 }} />
            <View style={{ marginTop: 16 }}>
              <Segmentos<Aba> pixel valor={aba} aoMudar={setAba} opcoes={[{ valor: 'grupos', nome: 'Clubes' }, { valor: 'ranking', nome: 'Ranking' }]} />
            </View>
            {aba === 'grupos' ? <Grupos aoAbrir={setGrupoAberto} aoCriar={() => setCriando(true)} /> : <Ranking />}
          </>
        )}

        <Compositor aberto={compor.aberto} aoFechar={() => setCompor((c) => ({ ...c, aberto: false }))} grupoInicial={compor.grupo} />
        <CriarGrupo aberto={criando} aoFechar={() => setCriando(false)} aoCriar={(id) => { setCriando(false); setAba('grupos'); setGrupoAberto(id); }} />
        <BuscaUsuarios aberto={buscaAberta} aoFechar={aoFecharBusca} aoAbrirPerfil={(id) => setPerfilAberto(id)} />
        <PerfilPessoa id={perfilAberto} aoFechar={() => setPerfilAberto(null)} aoAbrirMidia={abrirMidia} aoAbrirClube={(cid) => { setPerfilAberto(null); setGrupoAberto(cid); }} />
        <VisorMidia itens={visor?.itens ?? []} inicio={visor ? visor.indice : null} aoFechar={() => setVisor(null)} />
      </Tela>

      {/* o + roxo, sobre a barra: criar uma publicação (dentro de um clube, o botão do próprio clube publica nele) */}
      {grupoAberto ? null : <BotaoMais rotulo="Criar" aoPressionar={() => setMenuMais(true)} />}

      {/* o que o + faz, num menu de vidro só com texto: publicar, criar um clube (na Comunidade) ou compartilhar a sua semana */}
      <MenuMais
        aberto={menuMais} aoFechar={() => setMenuMais(false)} rotulo="Criar"
        itens={[
          { rotulo: 'Nova publicação', aoPressionar: () => abrirCompositor(null) },
          ...(modo === 'comunidade' ? [{ rotulo: 'Criar clube', aoPressionar: () => setCriando(true) }] : []),
          { rotulo: 'Compartilhar minha semana', aoPressionar: () => { void compartilhar(); } },
        ]}
      />
    </>
  );
}

const st = estilos(() => StyleSheet.create({
  separacoes: { flexDirection: 'row', alignSelf: 'stretch', marginHorizontal: -20, marginTop: -6, marginBottom: 14, paddingBottom: 8 },
  separacao: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  marcador: { position: 'absolute', left: 0, bottom: 4, height: 3, width: 28, borderRadius: 2, backgroundColor: cores.acao },
  lista: { marginHorizontal: -20, borderTopWidth: 1, borderTopColor: cores.linha },
}));
