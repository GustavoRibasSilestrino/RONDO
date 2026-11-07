/* Início e Comunidade. O Início é o feed: as publicações de quem você segue e dos clubes (texto, fotos e vídeos).
   A Comunidade tem os clubes (criar, entrar, convidar e publicar dentro) e o ranking semanal de constância.
   O botão + roxo, sobre a barra, cria uma publicação. Feed, clubes e perfis vêm do servidor e são os mesmos para todo mundo. */
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, Share, StyleSheet, View } from 'react-native';
import { lerFeed } from '../api/social';
import type { Pessoa } from '../api/social';
import { Folha, Tela, useAviso } from '../componentes/Estrutura';
import { BotaoMais } from '../componentes/BotaoMais';
import { Icone } from '../componentes/Icone';
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

export function Social({ modo, ir, buscaAberta, aoFecharBusca }: { modo: 'home' | 'comunidade'; ir: (tela: string) => void; buscaAberta: boolean; aoFecharBusca: () => void }) {
  const { estado } = useLoja();
  const avisar = useAviso();
  const [aba, setAba] = useState<Aba>('grupos');
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
    (cursor) => lerFeed({ filtro: 'todos', antes: cursor }),   // um feed só, com tudo: o geral, quem você segue e os seus clubes
    [],
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
            <BarraStories aoAbrirPerfil={abrirPerfil} />
            <View style={{ marginTop: 14 }}><RecadoDoDia aoAbrir={() => ir('recado')} /></View>
            <View style={{ marginTop: 16 }}>
              {posts.length ? (
                <>
                  {/* contínuo, sem caixas: as publicações vão de ponta a ponta da tela, separadas só por uma linha fina */}
                  <View style={st.lista}>
                    {posts.map((p) => (
                      <CartaoPost key={p.id} timeline sangrar post={p} aoAbrirGrupo={p.clube ? () => setGrupoAberto(p.clube!.id) : undefined} aoAbrirMidia={abrirMidia} aoAbrirPerfil={abrirPerfil} aoApagar={(id) => feed.mudar((l) => l.filter((x) => x.id !== id))} />
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
                  <T tam={13.5} style={{ marginTop: 6, lineHeight: 20 }}>Seja a primeira pessoa a compartilhar algo hoje.</T>
                  <Botao pequeno tipo="fantasma" titulo="Criar publicação" aoPressionar={() => abrirCompositor(null)} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
                </Cartao>
              )}
            </View>
          </>
        ) : (
          <>
            <T tam={15} peso="400" centro>Comunidade</T>
            <T tam={13} centro style={{ marginTop: 6 }}>Clubes e gente que também voltou hoje.</T>
            <Botao icone="mais" titulo="Criar clube" aoPressionar={() => setCriando(true)} style={{ marginTop: 20 }} />
            <View style={{ marginTop: 16 }}>
              <Segmentos<Aba> valor={aba} aoMudar={setAba} opcoes={[{ valor: 'grupos', nome: 'Clubes' }, { valor: 'ranking', nome: 'Ranking' }]} />
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

      {/* o que o + faz: publicar, ou compartilhar a sua semana */}
      <Folha aberta={menuMais} aoFechar={() => setMenuMais(false)} titulo="Criar">
        <View style={{ gap: 10, paddingBottom: 4 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Publicar" onPress={() => { setMenuMais(false); abrirCompositor(null); }} style={({ pressed }) => [st.opcao, pressed && { opacity: 0.85 }]}>
            <View style={st.opcaoIcone}><Icone nome="imagem" tamanho={22} cor="#ffffff" /></View>
            <View style={{ flex: 1 }}>
              <T tam={15.5} peso="500">Publicar</T>
              <T tam={13} style={{ marginTop: 2 }}>Foto, vídeo ou texto no Feed.</T>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Compartilhar o meu progresso da semana" onPress={() => { setMenuMais(false); compartilhar(); }} style={({ pressed }) => [st.opcao, pressed && { opacity: 0.85 }]}>
            <View style={st.opcaoIcone}><Icone nome="compartilhar" tamanho={22} cor="#ffffff" /></View>
            <View style={{ flex: 1 }}>
              <T tam={15.5} peso="500">Compartilhar minha semana</T>
              <T tam={13} style={{ marginTop: 2 }}>Envia o seu Você vs. ontem para outros apps.</T>
            </View>
          </Pressable>
        </View>
      </Folha>
    </>
  );
}

const st = estilos(() => StyleSheet.create({
  lista: { marginHorizontal: -20, borderTopWidth: 1, borderTopColor: cores.linha },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 64 },
  opcaoIcone: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
}));
