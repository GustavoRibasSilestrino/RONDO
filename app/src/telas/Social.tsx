/* Início e Comunidade. O Início é o feed: as publicações de quem você segue e dos clubes (texto, fotos e vídeos).
   A Comunidade tem os clubes (criar, entrar, convidar e publicar dentro) e o ranking semanal de constância.
   O botão + roxo, sobre a barra, cria uma publicação. Tudo guardado no aparelho, como o resto do app em modo demonstração. */
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, Share, StyleSheet, View } from 'react-native';
import { Folha, Tela, useAviso } from '../componentes/Estrutura';
import { BotaoMais } from '../componentes/BotaoMais';
import { Icone } from '../componentes/Icone';
import { Botao, Cartao, Segmentos, T } from '../componentes/Ui';
import { useLoja } from '../estado/loja';
import { comparar, statsSemana } from '../lib/calc';
import { listarGrupos } from '../lib/grupos';
import { cores, estilos } from '../tema';
import type { Midia } from '../tipos';
import { RecadoDoDia } from '../componentes/RecadoDoDia';
import { BarraStories } from '../componentes/stories/BarraStories';
import { CartaoPost } from './comunidade/CartaoPost';
import { PerfilPessoa } from './comunidade/PerfilPessoa';
import { Compositor } from './comunidade/Compositor';
import { CriarGrupo } from './comunidade/CriarGrupo';
import { GrupoTela } from './comunidade/GrupoTela';
import { Grupos } from './comunidade/Grupos';
import { VisorMidia } from './comunidade/Midia';
import { todosOsPosts } from './comunidade/posts';
import { Ranking } from './comunidade/Ranking';

type Aba = 'grupos' | 'ranking';
type Filtro = 'todos' | 'seguindo' | 'meus' | 'geral';

export function Social({ modo, ir }: { modo: 'home' | 'comunidade'; ir: (tela: string) => void }) {
  const { estado } = useLoja();
  const avisar = useAviso();
  const [aba, setAba] = useState<Aba>('grupos');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null);
  const [compor, setCompor] = useState<{ aberto: boolean; grupo: string | null }>({ aberto: false, grupo: null });
  const [criando, setCriando] = useState(false);
  const [menuMais, setMenuMais] = useState(false);   // o menu do botão +
  const [perfilAberto, setPerfilAberto] = useState<string | null>(null);   // o perfil de quem publicou, aberto ao tocar na foto
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
  const grupos = listarGrupos(estado);
  const porId = new Map(grupos.map((g) => [g.id, g]));

  /* o feed mostra o geral e as publicações dos clubes públicos e dos seus; um clube privado só aparece para quem está nele */
  const posts = todosOsPosts(estado).filter((p) => {
    const g = p.grupo ? porId.get(p.grupo) : undefined;
    if (filtro === 'seguindo') return !!estado.seguindo[p.autor];
    if (filtro === 'geral') return !p.grupo;
    if (filtro === 'meus') return !!g && g.meu;
    return !p.grupo || (!!g && (!g.privado || g.meu));
  });

  const compartilhar = async () => {
    const cmp = comparar(statsSemana(estado, hoje, 0), statsSemana(estado, hoje, 1));
    const texto = cmp.geral === null ? 'Estou começando a competir com o meu ontem no RONDO.' : `Esta semana estou ${cmp.geral >= 0 ? '+' : ''}${cmp.geral}% em relação à semana passada. Compita com quem você foi ontem. RONDO.`;
    try {
      await Share.share({ message: texto });
    } catch {
      avisar('Compartilhar não está disponível neste aparelho.');
    }
  };

  const abrirCompositor = (grupo: string | null) => setCompor({ aberto: true, grupo });
  const abrirPerfil = (autor: string) => { if (autor === 'Você') ir('perfil'); else setPerfilAberto(autor); };

  return (
    <>
      <Tela>
        {grupoAberto ? (
          <GrupoTela id={grupoAberto} aoVoltar={voltarDoGrupo} aoCompor={abrirCompositor} aoAbrirMidia={abrirMidia} />
        ) : modo === 'home' ? (
          <>
            <T tam={15} peso="400" centro>Feed</T>
            <View style={{ marginTop: 14 }}><BarraStories /></View>
            <View style={{ marginTop: 14 }}><RecadoDoDia aoAbrir={() => ir('recado')} /></View>
            <View style={{ gap: 14, marginTop: 16 }}>
              <View style={st.filtros}>
                {([['todos', 'Tudo'], ['seguindo', 'Seguindo'], ['meus', 'Clubes'], ['geral', 'Geral']] as [Filtro, string][]).map(([v, nome]) => {
                  const ativo = v === filtro;
                  return (
                    <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => setFiltro(v)} style={[st.filtro, ativo && st.filtroAtivo]}>
                      <T tam={13} peso={ativo ? '500' : '300'}>{nome}</T>
                    </Pressable>
                  );
                })}
              </View>

              {posts.length ? (
                posts.map((p) => {
                  const g = p.grupo ? porId.get(p.grupo) : undefined;
                  return (
                    <CartaoPost key={p.id} post={p} nomeGrupo={g?.nome} aoAbrirGrupo={g ? () => setGrupoAberto(g.id) : undefined} aoAbrirMidia={abrirMidia} aoAbrirPerfil={abrirPerfil} />
                  );
                })
              ) : (
                <Cartao>
                  <T tam={16}>{filtro === 'seguindo' ? 'Você ainda não segue ninguém.' : filtro === 'meus' ? 'Nada dos seus clubes ainda.' : 'Nada por aqui ainda.'}</T>
                  <T tam={13.5} style={{ marginTop: 6, lineHeight: 20 }}>
                    {filtro === 'seguindo' ? 'Toque em Seguir nas publicações, ou no ranking, para criar as suas conexões. Os cheers e as publicações delas aparecem aqui.' : filtro === 'meus' ? 'Entre em um clube, ou crie o seu, para ver as publicações dele aqui.' : 'Seja a primeira pessoa a compartilhar algo hoje.'}
                  </T>
                  <Botao pequeno tipo="fantasma" titulo={filtro === 'seguindo' ? 'Ver o ranking' : filtro === 'meus' ? 'Ver clubes' : 'Criar publicação'} aoPressionar={() => (filtro === 'seguindo' || filtro === 'meus' ? ir('comunidade') : abrirCompositor(null))} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
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
        <PerfilPessoa nome={perfilAberto} aoFechar={() => setPerfilAberto(null)} aoAbrirMidia={abrirMidia} />
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
  filtros: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filtro: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 64 },
  opcaoIcone: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  filtroAtivo: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
}));
