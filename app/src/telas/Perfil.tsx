/* Perfil, no estilo do Instagram: nome de usuário e ações no alto, foto com anel de story e as contagens ao lado, descrição,
   e abaixo duas abas: Publicações (em grade) e Conquistas (patente, nível e medalhas). O resto fica em Configurações (o ícone ☰). */
import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CampoFlutuante } from '../componentes/CampoFlutuante';
import { Folha, Tela, useAviso } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Selo, tipoDeSelo } from '../componentes/Selos';
import { Medalha3D } from '../componentes/Medalha3D';
import { AnelStory } from '../componentes/stories/AnelStory';
import { CriarStory } from '../componentes/stories/CriarStory';
import { VisorStory } from '../componentes/stories/VisorStory';
import { Barra, Botao, T } from '../componentes/Ui';
import { useLoja } from '../estado/loja';
import { limitesDe } from '../lib/beneficios';
import { fmt } from '../lib/datas';
import { medalhasDe } from '../lib/medalhas';
import { escolherFoto, removerMidia } from '../lib/midia';
import { progressoNivel, TITULOS, xpTotal } from '../lib/nivel';
import { patenteDe } from '../lib/patentes';
import { meusStories } from '../lib/stories';
import { cores, estilos } from '../tema';
import type { Midia, Post } from '../tipos';
import { Avatar } from './comunidade/Avatar';
import { CartaoPost } from './comunidade/CartaoPost';
import { Miniatura, VisorMidia } from './comunidade/Midia';
import { BotaoSeguir } from './comunidade/Seguir';
import { Configuracoes } from './perfil/Configuracoes';

/* nome de usuário de partida: o nome sem acentos, em minúsculas */
export const arrobaPadrao = (nome: string): string => (nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 20) || 'rondo');

export function Perfil({ ir }: { ir: (tela: string) => void }) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const nome = estado.usuario?.nome ?? 'Você';
  const { width } = useWindowDimensions();
  const tamFoto = width < 360 ? 70 : 86;   // em telas estreitas a foto encolhe, para as três contagens caberem ao lado

  const [aba, setAba] = useState<'posts' | 'conquistas'>('posts');
  const [editando, setEditando] = useState(false);
  const [config, setConfig] = useState(false);
  const [criandoStory, setCriandoStory] = useState(false);
  const [verStory, setVerStory] = useState(false);
  const [postAberto, setPostAberto] = useState<Post | null>(null);
  const [bio, setBio] = useState('');
  const [nomeEd, setNomeEd] = useState('');
  const [arrobaEd, setArrobaEd] = useState('');
  const [fotoEd, setFotoEd] = useState<string | null>(null);   // id da foto escolhida (ainda não salva); null = sem foto
  const [fotoNova, setFotoNova] = useState<string | null>(null);   // foto guardada nesta edição, para apagar se a pessoa desistir
  const [erroEd, setErroEd] = useState<{ nome?: string; arroba?: string }>({});
  const [lista, setLista] = useState<'seguidores' | 'seguindo' | null>(null);
  const [visor, setVisor] = useState<{ itens: Midia[]; indice: number } | null>(null);

  const xp = xpTotal(estado);
  const nivel = progressoNivel(xp);
  const limites = limitesDe(nivel.nivel);
  const seguindo = Object.keys(estado.seguindo).filter((k) => estado.seguindo[k]);
  const seguidores = estado.seguidores;
  const { atual: patente, proxima } = patenteDe(nivel.nivel);
  const exibidos = TITULOS.filter((t) => estado.perfilSocial.titulos.includes(t.id) && t.nivel <= nivel.nivel);
  const arrobaAtual = estado.usuario?.arroba ?? arrobaPadrao(nome);
  const stories = meusStories(estado);

  /* publicações em grade: as fixadas (destacadas) primeiro */
  const fixadas = new Set(estado.perfilSocial.destaques);
  const grade = [...estado.posts].sort((a, b) => Number(fixadas.has(b.id)) - Number(fixadas.has(a.id)) || b.quando - a.quando);
  const medalhasGanhas = medalhasDe(estado, new Date()).filter((m) => m.aberta);

  const abrirEdicao = () => {
    setBio(estado.perfilSocial.bio); setNomeEd(nome); setArrobaEd(arrobaAtual); setFotoEd(estado.usuario?.foto ?? null); setFotoNova(null); setErroEd({});
    setEditando(true);
  };
  const fecharEdicao = () => {
    if (fotoNova) removerMidia([fotoNova]);   // desistiu: a foto escolhida nesta edição não fica no aparelho
    setEditando(false);
  };
  const escolherFotoPerfil = async (origem: 'galeria' | 'camera') => {
    try {
      const m = await escolherFoto(origem);
      if (!m) return;
      if (fotoNova) removerMidia([fotoNova]);
      setFotoNova(m.id); setFotoEd(m.id);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível abrir as fotos.');
    }
  };
  const salvar = () => {
    const n = nomeEd.trim();
    const a = arrobaEd.trim().replace(/^@/, '').toLowerCase();
    const erros: { nome?: string; arroba?: string } = {};
    if (n.length < 2) erros.nome = 'Escreva o seu nome (pelo menos 2 letras).';
    if (!/^[a-z0-9._]{3,20}$/.test(a)) erros.arroba = 'Use de 3 a 20 letras minúsculas, números, ponto ou _.';
    setErroEd(erros);
    if (erros.nome || erros.arroba) return;
    const antiga = estado.usuario?.foto;
    commit((e) => {
      e.perfilSocial.bio = bio.trim();
      if (e.usuario) { e.usuario.nome = n; e.usuario.arroba = a; e.usuario.foto = fotoEd ?? undefined; }
    });
    if (antiga && antiga !== fotoEd) removerMidia([antiga]);
    setFotoNova(null);
    setEditando(false);
    avisar('Perfil atualizado.');
  };

  const excluirStory = (id: string) => {
    const original = estado.stories.find((x) => x.id === id);
    commit((e) => { e.stories = e.stories.filter((x) => x.id !== id); });
    if (original?.midia) removerMidia([original.midia.id]);
    avisar('Story excluído.');
    if (stories.length <= 1) setVerStory(false);
  };

  return (
    <Tela>
      {/* topo: @usuário e as ações */}
      <View style={st.barra}>
        <T tam={17} peso="500" linhas={1} style={{ flex: 1 }}>@{arrobaAtual}</T>
        <Pressable accessibilityRole="button" accessibilityLabel="Recados de voz" onPress={() => ir('recado')} style={({ pressed }) => [st.redondo, pressed && { opacity: 0.8 }]}>
          <Icone nome="recado" tamanho={19} cor="#ffffff" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Editar perfil" onPress={abrirEdicao} style={({ pressed }) => [st.redondo, pressed && { opacity: 0.8 }]}>
          <Icone nome="lapis" tamanho={19} cor="#ffffff" />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Configurações" onPress={() => setConfig(true)} style={({ pressed }) => [st.redondo, pressed && { opacity: 0.8 }]}>
          <Icone nome="engrenagem" tamanho={20} cor="#ffffff" />
        </Pressable>
      </View>

      {/* foto com o anel de story e as contagens */}
      <View style={st.cabeca}>
        <AnelStory
          tamanho={tamFoto}
          estado={stories.length ? 'novo' : 'nenhum'}
          mais
          aoMais={() => setCriandoStory(true)}
          aoPressionar={() => (stories.length ? setVerStory(true) : setCriandoStory(true))}
          rotulo={stories.length ? 'Ver o seu story' : 'Criar um story'}
        >
          <Avatar nome={nome} voce tamanho={tamFoto} />
        </AnelStory>
        <View style={st.contagens}>
          <Contagem n={estado.posts.length} rotulo="Publicações" />
          <Contagem n={seguidores.length} rotulo="Seguidores" aoTocar={() => setLista('seguidores')} />
          <Contagem n={seguindo.length} rotulo="Seguindo" aoTocar={() => setLista('seguindo')} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
        <T tam={17} peso="500" linhas={1}>{nome}</T>
        {tipoDeSelo(estado.usuario?.selo) ? <Selo tipo={tipoDeSelo(estado.usuario?.selo)!} /> : null}
      </View>
      <T tam={13} style={{ marginTop: 2 }}>Nível {nivel.nivel}{patente ? ` · ${patente.nome}` : ''}</T>
      {exibidos.length ? (
        <View style={st.titulos}>
          {exibidos.map((t) => <View key={t.id} style={st.titulo}><T tam={12} peso="500">{t.nome}</T></View>)}
        </View>
      ) : null}
      <T tam={14} style={{ marginTop: 10, lineHeight: 20, opacity: estado.perfilSocial.bio ? 1 : 0.6 }}>{estado.perfilSocial.bio || 'Conte em uma frase quem você é.'}</T>

      {/* abas */}
      <View style={st.abas}>
        {([['posts', 'grade', 'Publicações'], ['conquistas', 'medalha', 'Conquistas']] as const).map(([id, icone, rotulo]) => {
          const ativa = aba === id;
          return (
            <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: ativa }} accessibilityLabel={rotulo} onPress={() => setAba(id)} style={[st.aba, ativa && st.abaAtiva]}>
              <Icone nome={icone} tamanho={22} cor="#ffffff" />
            </Pressable>
          );
        })}
      </View>

      {aba === 'posts' ? (
        grade.length ? (
          <View style={st.linhaDoTempo}>
            {grade.map((x) => <CartaoPost key={x.id} post={x} timeline aoAbrirMidia={(itens, indice) => setVisor({ itens, indice })} />)}
          </View>
        ) : (
          <View style={st.vazio}>
            <Icone nome="camera" tamanho={30} cor="#ffffff" />
            <T tam={15} peso="500" style={{ marginTop: 10 }}>Nenhuma publicação ainda</T>
            <T tam={13} centro style={{ marginTop: 4, lineHeight: 19 }}>Toque no + do Feed para compartilhar um treino, uma refeição ou uma conquista.</T>
          </View>
        )
      ) : (
        <View style={{ alignItems: 'center', marginTop: 20, gap: 16 }}>
          <View accessibilityLabel={patente ? `Patente ${patente.nome}` : 'Ainda sem patente'} style={{ alignItems: 'center' }}>
            {patente ? <Medalha3D frente={patente.img} verso={patente.verso} tamanho={190} /> : <Image source={proxima!.img} style={{ width: 120, height: 114, opacity: 0.25 }} resizeMode="contain" accessibilityIgnoresInvertColors />}
            <T tam={18} peso="500" style={{ marginTop: 6 }}>{patente ? `Patente ${patente.nome}` : 'Ainda sem patente'}</T>
            <T tam={12.5} style={{ marginTop: 2 }}>{proxima ? `Próxima: ${proxima.nome}, no nível ${proxima.nivel}` : 'A patente mais alta da RONDO'}</T>
          </View>
          <View style={st.nivel}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <T tam={22} peso="500">Nível {nivel.nivel}</T>
              <T tam={13}>{fmt(xp)} XP</T>
            </View>
            <View style={{ marginTop: 10 }}><Barra valor={nivel.noNivel} max={nivel.tamanho} cor={cores.destaque2} /></View>
            <T tam={12.5} style={{ marginTop: 8 }}>Faltam {fmt(nivel.faltam)} XP para o nível {nivel.nivel + 1}.</T>
          </View>
          {medalhasGanhas.length ? (
            <View style={{ alignSelf: 'stretch' }}>
              <T tam={13} peso="500" style={{ marginBottom: 10 }}>Medalhas ({medalhasGanhas.length})</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {medalhasGanhas.map((m) => <Image key={m.id} source={m.img} style={{ width: 64, height: 61 }} resizeMode="contain" accessibilityLabel={m.nome} />)}
              </ScrollView>
            </View>
          ) : null}
          <Botao tipo="fantasma" icone="medalha" titulo="Ver todas as coleções" aoPressionar={() => ir('colecoes')} style={{ alignSelf: 'stretch' }} />
        </View>
      )}

      {/* a publicação aberta, com cheers e comentários */}
      <Folha aberta={postAberto !== null} aoFechar={() => setPostAberto(null)}>
        {postAberto ? <CartaoPost post={postAberto} aoAbrirMidia={(itens, indice) => { setPostAberto(null); setVisor({ itens, indice }); }} /> : null}
      </Folha>

      {/* editar o perfil: foto, nome, nome de usuário e descrição */}
      <Folha aberta={editando} aoFechar={fecharEdicao} titulo="Editar perfil">
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Avatar nome={nomeEd || nome} voce foto={fotoEd ?? undefined} tamanho={96} semFoto={fotoEd === null} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Botao pequeno tipo="fantasma" icone="imagem" titulo="Galeria" aoPressionar={() => escolherFotoPerfil('galeria')} />
            {Platform.OS !== 'web' ? <Botao pequeno tipo="fantasma" icone="camera" titulo="Câmera" aoPressionar={() => escolherFotoPerfil('camera')} /> : null}
            {fotoEd ? <Botao pequeno tipo="discreto" icone="lixo" titulo="Remover" aoPressionar={() => setFotoEd(null)} /> : null}
          </View>
        </View>
        <CampoFlutuante rotulo="Nome" icone="perfil" value={nomeEd} onChangeText={setNomeEd} maxLength={40} erro={erroEd.nome} autoCapitalize="words" returnKeyType="next" />
        <View style={{ height: 12 }} />
        <CampoFlutuante rotulo="Nome de usuário" value={arrobaEd} onChangeText={(v) => setArrobaEd(v.replace(/^@/, '').toLowerCase())} maxLength={20} erro={erroEd.arroba} autoCapitalize="none" autoCorrect={false} returnKeyType="next" />
        <View style={{ height: 12 }} />
        <CampoFlutuante rotulo="Descrição" value={bio} onChangeText={setBio} maxLength={limites.bio} multiline />
        <T tam={12} mono style={{ alignSelf: 'flex-end', marginTop: 6 }}>{bio.length}/{limites.bio}</T>
        <T tam={12.5} style={{ marginTop: 8, lineHeight: 18 }}>Idade, peso, altura e objetivo ficam em Configurações, Seus dados.</T>
        <Botao titulo="Salvar" aoPressionar={salvar} style={{ marginTop: 14 }} />
      </Folha>

      {/* seguidores e seguindo */}
      <Folha aberta={lista !== null} aoFechar={() => setLista(null)} titulo={lista === 'seguidores' ? 'Seguidores' : 'Seguindo'}>
        {(lista === 'seguidores' ? seguidores : seguindo).length ? (
          <View style={{ gap: 14 }}>
            {(lista === 'seguidores' ? seguidores : seguindo).map((n) => (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar nome={n} />
                <T tam={15} style={{ flex: 1 }} linhas={1}>{n}</T>
                <BotaoSeguir nome={n} />
              </View>
            ))}
          </View>
        ) : (
          <T tam={14} style={{ lineHeight: 20 }}>
            {lista === 'seguidores' ? 'Ninguém segue você ainda.' : 'Você ainda não segue ninguém. Toque em Seguir nas publicações e no ranking da Comunidade.'}
          </T>
        )}
      </Folha>

      <Configuracoes aberto={config} aoFechar={() => setConfig(false)} ir={ir} />
      <CriarStory aberto={criandoStory} aoFechar={() => setCriandoStory(false)} />
      <VisorStory aberto={verStory} listas={[{ autor: 'Você', itens: stories }]} aoFechar={() => setVerStory(false)} aoExcluir={(s) => excluirStory(s.id)} />
      <VisorMidia itens={visor?.itens ?? []} inicio={visor ? visor.indice : null} aoFechar={() => setVisor(null)} />
    </Tela>
  );
}

function Contagem({ n, rotulo, aoTocar }: { n: number; rotulo: string; aoTocar?: () => void }) {
  return (
    <Pressable accessibilityRole={aoTocar ? 'button' : 'text'} accessibilityLabel={`${rotulo}: ${n}`} disabled={!aoTocar} onPress={aoTocar} style={st.contagem}>
      <T tam={18} peso="500">{fmt(n)}</T>
      <T tam={12}>{rotulo}</T>
    </Pressable>
  );
}

const st = estilos(() => StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  redondo: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2, borderWidth: 1, borderColor: cores.linha2 },
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  contagens: { flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'space-around' },
  contagem: { alignItems: 'center', flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  titulos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  titulo: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: `rgba(${cores.tom},0.16)` },
  abas: { flexDirection: 'row', marginTop: 20, borderTopWidth: 1, borderTopColor: cores.linha },
  aba: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderTopWidth: 2, borderTopColor: 'transparent', marginTop: -1, opacity: 0.55 },
  abaAtiva: { borderTopColor: '#ffffff', opacity: 1 },
  linhaDoTempo: { marginTop: 4 },
  tile: { width: '32.7%', aspectRatio: 1, backgroundColor: cores.cartao, overflow: 'hidden' },
  tileTexto: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8, backgroundColor: cores.cartao2 },
  fixada: { position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  vazio: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  nivel: { alignSelf: 'stretch', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
}));
