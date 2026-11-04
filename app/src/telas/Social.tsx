/* Comunidade: o feed (publicações com texto, fotos e vídeos), os grupos (dá para criar, entrar, convidar e publicar dentro)
   e o ranking semanal de constância. Tudo guardado no aparelho, como o resto do app em modo demonstração. */
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, Share, StyleSheet, View } from 'react-native';
import { Tela, useAviso } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Botao, Cartao, Segmentos, T } from '../componentes/Ui';
import { useLoja } from '../estado/loja';
import { comparar, statsSemana } from '../lib/calc';
import { listarGrupos } from '../lib/grupos';
import { cores } from '../tema';
import type { Midia } from '../tipos';
import { Avatar } from './comunidade/Avatar';
import { CartaoPost } from './comunidade/CartaoPost';
import { Compositor } from './comunidade/Compositor';
import { CriarGrupo } from './comunidade/CriarGrupo';
import { GrupoTela } from './comunidade/GrupoTela';
import { Grupos } from './comunidade/Grupos';
import { VisorMidia } from './comunidade/Midia';
import { todosOsPosts } from './comunidade/posts';
import { Ranking } from './comunidade/Ranking';

type Aba = 'feed' | 'grupos' | 'ranking';
type Filtro = 'todos' | 'seguindo' | 'meus' | 'geral';

export function Social() {
  const { estado } = useLoja();
  const avisar = useAviso();
  const [aba, setAba] = useState<Aba>('feed');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null);
  const [compor, setCompor] = useState<{ aberto: boolean; grupo: string | null }>({ aberto: false, grupo: null });
  const [criando, setCriando] = useState(false);
  const [visor, setVisor] = useState<{ itens: Midia[]; indice: number } | null>(null);

  const voltarDoGrupo = useCallback(() => setGrupoAberto(null), []);
  const abrirMidia = useCallback((itens: Midia[], indice: number) => setVisor({ itens, indice }), []);

  /* botão voltar do Android: dentro de um grupo, volta para a lista */
  useEffect(() => {
    if (!grupoAberto) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setGrupoAberto(null); return true; });
    return () => sub.remove();
  }, [grupoAberto]);

  const hoje = new Date();
  const grupos = listarGrupos(estado);
  const porId = new Map(grupos.map((g) => [g.id, g]));

  /* o feed mostra o geral e as publicações dos grupos públicos e dos seus; um grupo privado só aparece para quem está nele */
  const posts = todosOsPosts(estado).filter((p) => {
    const g = p.grupo ? porId.get(p.grupo) : undefined;
    if (filtro === 'seguindo') return !!estado.seguindo[p.autor];
    if (filtro === 'geral') return !p.grupo;
    if (filtro === 'meus') return !!g && g.meu;
    return !p.grupo || (!!g && (!g.privado || g.meu));
  });

  const compartilhar = async () => {
    const cmp = comparar(statsSemana(estado, hoje, 0), statsSemana(estado, hoje, 1));
    const texto = cmp.geral === null ? 'Estou começando a competir com o meu ontem no Yesteryou.' : `Esta semana estou ${cmp.geral >= 0 ? '+' : ''}${cmp.geral}% em relação à semana passada. Compita com quem você foi ontem. Yesteryou.`;
    try {
      await Share.share({ message: texto });
    } catch {
      avisar('Compartilhar não está disponível neste aparelho.');
    }
  };

  const abrirCompositor = (grupo: string | null) => setCompor({ aberto: true, grupo });

  return (
    <Tela>
      {grupoAberto ? (
        <GrupoTela id={grupoAberto} aoVoltar={voltarDoGrupo} aoCompor={abrirCompositor} aoAbrirMidia={abrirMidia} />
      ) : (
        <>
          <T tam={36} peso="200">Comunidade</T>
          <T tam={14} cor={cores.texto2} style={{ marginTop: 6 }}>Gente que também voltou hoje.</T>
          <View style={{ marginTop: 20 }}>
            <Segmentos<Aba> valor={aba} aoMudar={setAba} opcoes={[{ valor: 'feed', nome: 'Feed' }, { valor: 'grupos', nome: 'Grupos' }, { valor: 'ranking', nome: 'Ranking' }]} />
          </View>

          {aba === 'feed' ? (
            <View style={{ gap: 14, marginTop: 18 }}>
              <Pressable accessibilityRole="button" accessibilityLabel="Criar publicação" onPress={() => abrirCompositor(null)}>
                <Cartao style={st.entrada}>
                  <Avatar nome={estado.usuario?.nome ?? 'Você'} voce />
                  <T tam={14.5} cor={cores.texto3} linhas={1} style={{ flex: 1 }}>Compartilhe um treino, uma refeição…</T>
                  <Icone nome="imagem" tamanho={22} cor={cores.destaque2} />
                </Cartao>
              </Pressable>

              <View style={st.filtros}>
                {([['todos', 'Tudo'], ['seguindo', 'Seguindo'], ['meus', 'Meus grupos'], ['geral', 'Geral']] as [Filtro, string][]).map(([v, nome]) => {
                  const ativo = v === filtro;
                  return (
                    <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => setFiltro(v)} style={[st.filtro, ativo && st.filtroAtivo]}>
                      <T tam={13} peso={ativo ? '500' : '300'} cor={ativo ? '#ffffff' : cores.texto2}>{nome}</T>
                    </Pressable>
                  );
                })}
              </View>

              <Botao tipo="fantasma" icone="compartilhar" titulo="Compartilhar o meu card Você vs. Yesteryou" aoPressionar={compartilhar} />

              {posts.length ? (
                posts.map((p) => {
                  const g = p.grupo ? porId.get(p.grupo) : undefined;
                  return (
                    <CartaoPost
                      key={p.id}
                      post={p}
                      nomeGrupo={g?.nome}
                      aoAbrirGrupo={g ? () => { setAba('grupos'); setGrupoAberto(g.id); } : undefined}
                      aoAbrirMidia={abrirMidia}
                    />
                  );
                })
              ) : (
                <Cartao>
                  <T tam={16} peso="300">{filtro === 'seguindo' ? 'Você ainda não segue ninguém.' : filtro === 'meus' ? 'Nada dos seus grupos ainda.' : 'Nada por aqui ainda.'}</T>
                  <T tam={13.5} cor={cores.texto2} style={{ marginTop: 6, lineHeight: 20 }}>
                    {filtro === 'seguindo' ? 'Toque em Seguir nas publicações, ou no ranking, para criar as suas conexões. Os cheers e as publicações delas aparecem aqui.' : filtro === 'meus' ? 'Entre em um grupo, ou crie o seu, para ver as publicações dele aqui.' : 'Seja a primeira pessoa a compartilhar algo hoje.'}
                  </T>
                  <Botao pequeno tipo="fantasma" titulo={filtro === 'seguindo' ? 'Ver o ranking' : filtro === 'meus' ? 'Ver grupos' : 'Criar publicação'} aoPressionar={() => (filtro === 'seguindo' ? setAba('ranking') : filtro === 'meus' ? setAba('grupos') : abrirCompositor(null))} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
                </Cartao>
              )}
            </View>
          ) : null}

          {aba === 'grupos' ? <Grupos aoAbrir={setGrupoAberto} aoCriar={() => setCriando(true)} /> : null}
          {aba === 'ranking' ? <Ranking /> : null}
        </>
      )}

      <Compositor aberto={compor.aberto} aoFechar={() => setCompor((c) => ({ ...c, aberto: false }))} grupoInicial={compor.grupo} />
      <CriarGrupo aberto={criando} aoFechar={() => setCriando(false)} aoCriar={(id) => { setCriando(false); setAba('grupos'); setGrupoAberto(id); }} />
      <VisorMidia itens={visor?.itens ?? []} inicio={visor ? visor.indice : null} aoFechar={() => setVisor(null)} />
    </Tela>
  );
}

const st = StyleSheet.create({
  entrada: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  filtros: { flexDirection: 'row', gap: 8 },
  filtro: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  filtroAtivo: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
});
