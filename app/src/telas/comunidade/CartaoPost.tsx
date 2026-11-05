/* Uma publicação: autor, texto, destaque, fotos e vídeos, e as ações (curtir, comentar, compartilhar, apagar a própria). */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import { apagarComentario, apagarPost, comentar, darCheers, lerComentarios, tirarCheers } from '../../api/social';
import type { ComentarioSocial, Pessoa, PostSocial } from '../../api/social';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, Cartao, T } from '../../componentes/Ui';
import { useLista } from '../../estado/lista';
import { useLoja } from '../../estado/loja';
import { removerMidia } from '../../lib/midia';
import { useConta } from '../../lib/beneficios';
import { useMovimentoReduzido } from '../../lib/movimento';
import { cores, FONTE, estilos } from '../../tema';
import type { Midia } from '../../tipos';
import { Avatar } from './Avatar';
import { MidiaGrade } from './Midia';
import { BotaoSeguir } from './Seguir';
import { arrobaDe, quando } from './util';

type Props = {
  post: PostSocial;
  aoAbrirGrupo?: () => void;
  aoAbrirMidia: (itens: Midia[], indice: number) => void;
  aoAbrirPerfil?: (autor: Pessoa) => void;
  aoApagar?: (id: number) => void;           // avisa a tela que a publicação saiu do servidor
  timeline?: boolean;                        // estilo X (Twitter): sem cartão, com avatar à esquerda e linha entre as publicações   // tocar na foto ou no nome de quem publicou abre o perfil dessa pessoa
};

/* a palavra Cheers, discreta: sobe um pouco, com um único quique leve, e some */
function PuloCheers({ disparo }: { disparo: number }) {
  const reduzido = useMovimentoReduzido();
  const y = useRef(new Animated.Value(0)).current;
  const escala = useRef(new Animated.Value(0)).current;
  const opacidade = useRef(new Animated.Value(0)).current;
  const nativo = Platform.OS !== 'web';

  useEffect(() => {
    if (disparo === 0) return undefined;
    y.setValue(0); escala.setValue(0.85); opacidade.setValue(0);
    const anim = Animated.parallel([
      Animated.sequence([
        Animated.timing(y, { toValue: -30, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: nativo }),
        Animated.timing(y, { toValue: -22, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: nativo }),
        Animated.timing(y, { toValue: -34, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: nativo }),
      ]),
      Animated.spring(escala, { toValue: 1, friction: 6, tension: 180, useNativeDriver: nativo }),
      Animated.sequence([
        Animated.timing(opacidade, { toValue: 1, duration: 120, useNativeDriver: nativo }),
        Animated.delay(380),
        Animated.timing(opacidade, { toValue: 0, duration: 260, useNativeDriver: nativo }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [disparo, y, escala, opacidade, nativo]);

  if (disparo === 0 || reduzido) return null;
  return (
    <Animated.View pointerEvents="none" style={[st.pulo, { opacity: opacidade, transform: [{ translateY: y }, { scale: escala }] }]}>
      <T tam={11.5} peso="500" style={{ letterSpacing: 0.6 }}>Cheers</T>
    </Animated.View>
  );
}

export function CartaoPost({ post, aoAbrirGrupo, aoAbrirMidia, aoAbrirPerfil, aoApagar, timeline }: Props) {
  const { estado, commit, atualizarSocial } = useLoja();
  const { limites } = useConta();
  const avisar = useAviso();
  const [comentando, setComentando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [disparo, setDisparo] = useState(0);   // sobe a cada cheers dado: dispara a animação
  const pop = useRef(new Animated.Value(1)).current;

  /* cheers e comentários vêm do servidor; o toque muda na hora e o servidor confirma em seguida */
  const [curtiu, setCurtiu] = useState(post.curtiu);
  const [cheers, setCheers] = useState(post.cheers);
  const [nComentarios, setNComentarios] = useState(post.comentarios);
  useEffect(() => { setCurtiu(post.curtiu); setCheers(post.cheers); setNComentarios(post.comentarios); }, [post.curtiu, post.cheers, post.comentarios]);
  const ocupado = useRef(false);

  const meu = post.meu;
  const nomeGrupo = post.clube?.nome;
  const midia = meu ? post.midia ?? undefined : undefined;   // as fotos e vídeos ainda ficam só no aparelho de quem publicou
  const idLocal = String(post.id);

  const alternarCheers = async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    const dar = !curtiu;
    if (dar) {
      setDisparo((d) => d + 1);
      pop.setValue(0.88);
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 220, useNativeDriver: Platform.OS !== 'web' }).start();
    }
    setCurtiu(dar); setCheers((n) => Math.max(0, n + (dar ? 1 : -1)));
    try {
      const novo = await (dar ? darCheers(post.id) : tirarCheers(post.id));
      setCurtiu(novo.curtiu); setCheers(novo.cheers);
      void atualizarSocial();
    } catch (e) {
      setCurtiu(!dar); setCheers((n) => Math.max(0, n + (dar ? -1 : 1)));
      avisar(e instanceof Error ? e.message : 'Não foi possível dar cheers agora.');
    } finally {
      ocupado.current = false;
    }
  };

  const compartilhar = async () => {
    try {
      await Share.share({ message: `${meu ? 'Eu' : post.autor.nome} no RONDO: ${post.texto}` });
    } catch {
      avisar('Compartilhar não está disponível neste aparelho.');
    }
  };

  const apagar = async () => {
    try {
      await apagarPost(post.id);
    } catch (e) {
      setApagando(false);
      avisar(e instanceof Error ? e.message : 'Não foi possível apagar agora.');
      return;
    }
    if (midia?.length) removerMidia(midia.map((m) => m.id));
    commit((e) => { const d = e.perfilSocial.destaques; const i = d.indexOf(idLocal); if (i >= 0) d.splice(i, 1); });
    setApagando(false);
    aoApagar?.(post.id);
    void atualizarSocial(true);
    avisar('Publicação apagada.');
  };

  const acoes = (
    <View style={st.acoes}>
      <View style={{ zIndex: 2 }}>
        <PuloCheers disparo={disparo} />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: curtiu }}
          accessibilityLabel={curtiu ? 'Tirar o seu cheers' : 'Dar cheers'}
          onPress={alternarCheers}
          style={[st.acao, curtiu && st.cheersDado]}
        >
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <Icone nome="cheers" tamanho={22} cor={curtiu ? cores.destaque : cores.texto} />
          </Animated.View>
          <T tam={13} peso={curtiu ? '500' : '300'} cor={curtiu ? cores.destaque : cores.texto}>Cheers {cheers}</T>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Comentários: ${nComentarios}`} onPress={() => setComentando(true)} style={st.acao}>
        <Icone nome="comentario" tamanho={19} cor={cores.texto2} />
        <T tam={13} cor={cores.texto2}>{nComentarios}</T>
      </Pressable>
      <View style={{ flex: 1 }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Compartilhar" onPress={compartilhar} style={st.acao}>
        <Icone nome="compartilhar" tamanho={19} cor={cores.texto2} />
      </Pressable>
    </View>
  );
  const folhas = (
    <>
        <Comentarios aberto={comentando} aoFechar={() => setComentando(false)} postId={post.id} aoMudarTotal={setNComentarios} />

        <Folha aberta={apagando} aoFechar={() => setApagando(false)} titulo="Sua publicação">
          <Botao
            tipo="fantasma"
            icone="ok"
            titulo={estado.perfilSocial.destaques.includes(idLocal) ? 'Tirar dos destaques do perfil' : 'Destacar no perfil'}
            aoPressionar={() => {
              const ja = estado.perfilSocial.destaques.includes(idLocal);
              if (!ja && estado.perfilSocial.destaques.length >= limites.destaques) { setApagando(false); avisar(`Você já tem ${limites.destaques} destaques. Tire um antes ou suba de nível para ganhar mais.`); return; }
              commit((e) => { const d = e.perfilSocial.destaques; const i = d.indexOf(idLocal); if (i >= 0) d.splice(i, 1); else d.push(idLocal); });
              setApagando(false);
              avisar(ja ? 'Removida dos destaques.' : 'Destacada no seu perfil.');
            }}
            style={{ marginBottom: 16 }}
          />
          <T tam={14} cor={cores.texto2} style={{ lineHeight: 21 }}>Apagar remove a publicação do feed, com os comentários e os cheers, e as fotos e vídeos do aparelho. Isso não dá para desfazer.</T>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Botao tipo="discreto" titulo="Cancelar" aoPressionar={() => setApagando(false)} style={{ flex: 1 }} />
            <Botao tipo="perigo" icone="lixo" titulo="Apagar" aoPressionar={apagar} style={{ flex: 1 }} />
          </View>
        </Folha>
    </>
  );

  /* no estilo do X (Twitter): sem cartão, foto à esquerda e o conteúdo à direita, com uma linha separando cada publicação */
  if (timeline) {
    const nomeMostrado = meu ? estado.usuario?.nome ?? post.autor.nome : post.autor.nome;
    return (
      <View style={st.tweet}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Abrir o perfil de ${meu ? 'você' : post.autor.nome}`} disabled={!aoAbrirPerfil} onPress={() => aoAbrirPerfil?.(post.autor)}>
          <Avatar nome={post.autor.nome} voce={meu} tamanho={42} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={st.linhaTweet}>
            <T tam={14.5} peso="500" linhas={1} style={{ flexShrink: 1 }}>{nomeMostrado}</T>
            <T tam={13} linhas={1} style={{ flexShrink: 2, opacity: 0.7 }}>@{meu ? estado.usuario?.arroba ?? post.autor.arroba ?? arrobaDe(nomeMostrado) : post.autor.arroba ?? arrobaDe(post.autor.nome)}</T>
            <T tam={13} style={{ opacity: 0.7 }}>· {quando(post.quando)}</T>
            {meu ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Mais opções da publicação" onPress={() => setApagando(true)} hitSlop={8} style={{ marginLeft: 'auto' }}>
                <Icone nome="pontos" tamanho={18} cor={cores.texto2} />
              </Pressable>
            ) : null}
          </View>
          {post.texto ? <T tam={15} style={{ marginTop: 3, lineHeight: 21 }}>{post.texto}</T> : null}
          {post.destaque ? <T tam={17} peso="400" style={{ marginTop: 6 }}>{post.destaque}</T> : null}
          {midia?.length ? (
            <View style={{ marginTop: 10 }}>
              <MidiaGrade itens={midia} aoAbrir={(i) => aoAbrirMidia(midia, i)} />
            </View>
          ) : null}
          {acoes}
          {folhas}
        </View>
      </View>
    );
  }

  return (
    <Cartao>
      <View style={st.cabeca}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Abrir o perfil de ${meu ? 'você' : post.autor.nome}`} disabled={!aoAbrirPerfil} onPress={() => aoAbrirPerfil?.(post.autor)} hitSlop={6}>
          <Avatar nome={post.autor.nome} voce={meu} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Abrir o perfil de ${meu ? 'você' : post.autor.nome}`} disabled={!aoAbrirPerfil} onPress={() => aoAbrirPerfil?.(post.autor)} style={{ alignSelf: 'flex-start' }}>
            <T tam={14} peso="500">{post.autor.nome}</T>
          </Pressable>
          <View style={st.meta}>
            <T tam={12} cor={cores.texto3}>{quando(post.quando)}</T>
            {nomeGrupo ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Abrir o clube ${nomeGrupo}`} onPress={aoAbrirGrupo} hitSlop={6}>
                <T tam={12} peso="500" cor={cores.destaque2}>· {nomeGrupo}</T>
              </Pressable>
            ) : null}
          </View>
        </View>
        {meu ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Mais opções da publicação" onPress={() => setApagando(true)} hitSlop={8} style={st.botaoIcone}>
            <Icone nome="pontos" tamanho={20} cor={cores.texto2} />
          </Pressable>
        ) : (
          <BotaoSeguir pessoa={post.autor} />
        )}
      </View>

      {post.texto ? <T tam={15} style={{ marginTop: 12, lineHeight: 22 }}>{post.texto}</T> : null}
      {post.destaque ? (
        <View style={st.destaque}>
          <T tam={18} peso="300" cor={cores.destaque2}>{post.destaque}</T>
        </View>
      ) : null}
      {midia?.length ? (
        <View style={{ marginTop: 12 }}>
          <MidiaGrade itens={midia} aoAbrir={(i) => aoAbrirMidia(midia, i)} />
        </View>
      ) : null}

      {acoes}

      <Comentarios aberto={comentando} aoFechar={() => setComentando(false)} postId={post.id} aoMudarTotal={setNComentarios} />

      <Folha aberta={apagando} aoFechar={() => setApagando(false)} titulo="Sua publicação">
        <Botao
          tipo="fantasma"
          icone="ok"
          titulo={estado.perfilSocial.destaques.includes(idLocal) ? 'Tirar dos destaques do perfil' : 'Destacar no perfil'}
          aoPressionar={() => {
            const ja = estado.perfilSocial.destaques.includes(idLocal);
            if (!ja && estado.perfilSocial.destaques.length >= limites.destaques) { setApagando(false); avisar(`Você já tem ${limites.destaques} destaques. Tire um antes ou suba de nível para ganhar mais.`); return; }
            commit((e) => { const d = e.perfilSocial.destaques; const i = d.indexOf(idLocal); if (i >= 0) d.splice(i, 1); else d.push(idLocal); });
            setApagando(false);
            avisar(ja ? 'Removida dos destaques.' : 'Destacada no seu perfil.');
          }}
          style={{ marginBottom: 16 }}
        />
        <T tam={14} cor={cores.texto2} style={{ lineHeight: 21 }}>Apagar remove a publicação do feed e as fotos e vídeos do aparelho. Isso não dá para desfazer.</T>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Botao tipo="discreto" titulo="Cancelar" aoPressionar={() => setApagando(false)} style={{ flex: 1 }} />
          <Botao tipo="perigo" icone="lixo" titulo="Apagar" aoPressionar={apagar} style={{ flex: 1 }} />
        </View>
      </Folha>
    </Cartao>
  );
}

/* comentários: lista (do servidor, em páginas) e uma linha para escrever */
function Comentarios({ aberto, aoFechar, postId, aoMudarTotal }: { aberto: boolean; aoFechar: () => void; postId: number; aoMudarTotal: (n: number) => void }) {
  const { atualizarSocial } = useLoja();
  const avisar = useAviso();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const lista = useLista<ComentarioSocial>((cursor) => lerComentarios(postId, cursor), [postId], aberto);
  const itens = lista.itens;

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    try {
      const novo = await comentar(postId, t);
      lista.mudar((l) => [...l, novo]);
      aoMudarTotal(itens.length + 1);
      setTexto('');
      void atualizarSocial();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível comentar agora.');
    } finally {
      setEnviando(false);
    }
  };

  const apagarC = async (c: ComentarioSocial) => {
    try {
      await apagarComentario(c.id);
      lista.mudar((l) => l.filter((x) => x.id !== c.id));
      aoMudarTotal(Math.max(0, itens.length - 1));
      void atualizarSocial();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível apagar agora.');
    }
  };

  return (
    <Folha aberta={aberto} aoFechar={aoFechar} titulo={itens.length ? `Comentários (${itens.length}${lista.temMais ? '+' : ''})` : 'Comentários'}>
      {itens.length === 0 ? (
        <T tam={14} cor={cores.texto2} style={{ lineHeight: 21, marginBottom: 14 }}>{lista.erro ? lista.erro : lista.carregando ? 'Carregando...' : 'Ainda sem comentários. Seja a primeira pessoa a responder.'}</T>
      ) : (
        <View style={{ gap: 14, marginBottom: 16 }}>
          {itens.map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', gap: 10 }}>
              <Avatar nome={c.autor.nome} voce={c.meu} tamanho={32} />
              <View style={{ flex: 1 }}>
                <View style={st.meta}>
                  <T tam={13.5} peso="500">{c.autor.nome}</T>
                  <T tam={12} cor={cores.texto3}>{quando(c.quando)}</T>
                  {c.meu ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Apagar o seu comentário" onPress={() => apagarC(c)} hitSlop={8} style={{ marginLeft: 'auto' }}>
                      <Icone nome="lixo" tamanho={15} cor={cores.texto3} />
                    </Pressable>
                  ) : null}
                </View>
                <T tam={14.5} style={{ marginTop: 2, lineHeight: 21 }}>{c.texto}</T>
              </View>
            </View>
          ))}
          {lista.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais comentários" aoPressionar={lista.maisItens} carregando={lista.carregando} /> : null}
        </View>
      )}
      <View style={st.linhaComentario}>
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder="Escreva um comentário"
          placeholderTextColor={cores.placeholder}
          selectionColor={cores.destaque}
          accessibilityLabel="Escrever comentário"
          maxLength={280}
          returnKeyType="send"
          onSubmitEditing={enviar}
          style={st.campoComentario}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar comentário" disabled={!texto.trim() || enviando} onPress={enviar} style={[st.enviar, { opacity: texto.trim() && !enviando ? 1 : 0.4 }]}>
          <Icone nome="enviar" tamanho={20} cor="#ffffff" />
        </Pressable>
      </View>
    </Folha>
  );
}

const st = estilos(() => StyleSheet.create({
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  botaoIcone: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  destaque: { marginTop: 12, backgroundColor: cores.fundo2, borderRadius: 12, padding: 12 },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginHorizontal: -6 },
  acao: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 8 },
  pulo: { position: 'absolute', left: 8, bottom: 34, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: cores.destaqueForte },
  tweet: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: cores.linha },
  linhaTweet: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cheersDado: { backgroundColor: `rgba(${cores.tom},0.14)`, borderRadius: 22, paddingHorizontal: 14 },
  linhaComentario: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campoComentario: { flex: 1, height: 46, paddingHorizontal: 16, borderRadius: 23, borderWidth: 1, borderColor: cores.linha2, backgroundColor: 'rgba(255,255,255,0.045)', color: cores.texto, fontSize: 15, fontFamily: FONTE['300'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  enviar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
}));
