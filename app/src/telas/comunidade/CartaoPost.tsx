/* Uma publicação: autor, texto, destaque, fotos e vídeos, e as ações (curtir, comentar, compartilhar, apagar a própria). */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, Cartao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { removerMidia } from '../../lib/midia';
import { useConta } from '../../lib/beneficios';
import { useMovimentoReduzido } from '../../lib/movimento';
import { cores, FONTE, estilos } from '../../tema';
import type { Midia, Post } from '../../tipos';
import { Avatar } from './Avatar';
import { MidiaGrade } from './Midia';
import { BotaoSeguir } from './Seguir';
import { quando } from './util';

type Props = {
  post: Post;
  nomeGrupo?: string;
  aoAbrirGrupo?: () => void;
  aoAbrirMidia: (itens: Midia[], indice: number) => void;
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

export function CartaoPost({ post, nomeGrupo, aoAbrirGrupo, aoAbrirMidia }: Props) {
  const { estado, commit } = useLoja();
  const { limites } = useConta();
  const avisar = useAviso();
  const [comentando, setComentando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [disparo, setDisparo] = useState(0);   // sobe a cada cheers dado: dispara a animação
  const pop = useRef(new Animated.Value(1)).current;

  const curtiu = !!estado.curtidas[post.id];
  const meu = post.autor === 'Você';
  const base = meu ? 0 : 3 + (post.id.length * 7) % 40;   // os números dos outros são de demonstração; a sua publicação começa do zero
  const nComentarios = (estado.comentarios[post.id] ?? []).length;

  const compartilhar = async () => {
    try {
      await Share.share({ message: `${meu ? 'Eu' : post.autor} no KORA: ${post.texto}` });
    } catch {
      avisar('Compartilhar não está disponível neste aparelho.');
    }
  };

  const apagar = () => {
    commit((e) => {
      e.posts = e.posts.filter((p) => p.id !== post.id);
      delete e.comentarios[post.id];
      delete e.curtidas[post.id];
    });
    if (post.midia?.length) removerMidia(post.midia.map((m) => m.id));
    setApagando(false);
    avisar('Publicação apagada.');
  };

  return (
    <Cartao>
      <View style={st.cabeca}>
        <Avatar nome={post.autor} voce={meu} />
        <View style={{ flex: 1 }}>
          <T tam={14} peso="500">{post.autor}</T>
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
          <BotaoSeguir nome={post.autor} />
        )}
      </View>

      {post.texto ? <T tam={15} style={{ marginTop: 12, lineHeight: 22 }}>{post.texto}</T> : null}
      {post.destaque ? (
        <View style={st.destaque}>
          <T tam={18} peso="300" cor={cores.destaque2}>{post.destaque}</T>
        </View>
      ) : null}
      {post.midia?.length ? (
        <View style={{ marginTop: 12 }}>
          <MidiaGrade itens={post.midia} aoAbrir={(i) => aoAbrirMidia(post.midia ?? [], i)} />
        </View>
      ) : null}

      <View style={st.acoes}>
        <View style={{ zIndex: 2 }}>
          <PuloCheers disparo={disparo} />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: curtiu }}
            accessibilityLabel={curtiu ? 'Tirar o seu cheers' : 'Dar cheers'}
            onPress={() => {
              if (!curtiu) {
                setDisparo((d) => d + 1);
                pop.setValue(0.88);
                Animated.spring(pop, { toValue: 1, friction: 5, tension: 220, useNativeDriver: Platform.OS !== 'web' }).start();
              }
              commit((e) => { e.curtidas[post.id] = !e.curtidas[post.id]; });
            }}
            style={[st.acao, curtiu && st.cheersDado]}
          >
            <Animated.View style={{ transform: [{ scale: pop }] }}>
              <Icone nome="cheers" tamanho={22} cor={curtiu ? cores.destaque : cores.texto} />
            </Animated.View>
            <T tam={13} peso={curtiu ? '500' : '300'} cor={curtiu ? cores.destaque : cores.texto}>Cheers {base + (curtiu ? 1 : 0)}</T>
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

      <Comentarios aberto={comentando} aoFechar={() => setComentando(false)} postId={post.id} />

      <Folha aberta={apagando} aoFechar={() => setApagando(false)} titulo="Sua publicação">
        <Botao
          tipo="fantasma"
          icone="ok"
          titulo={estado.perfilSocial.destaques.includes(post.id) ? 'Tirar dos destaques do perfil' : 'Destacar no perfil'}
          aoPressionar={() => {
            const ja = estado.perfilSocial.destaques.includes(post.id);
            if (!ja && estado.perfilSocial.destaques.length >= limites.destaques) { setApagando(false); avisar(`Você já tem ${limites.destaques} destaques. Tire um antes ou suba de nível para ganhar mais.`); return; }
            commit((e) => { const d = e.perfilSocial.destaques; const i = d.indexOf(post.id); if (i >= 0) d.splice(i, 1); else d.push(post.id); });
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

/* comentários: lista e uma linha para escrever */
function Comentarios({ aberto, aoFechar, postId }: { aberto: boolean; aoFechar: () => void; postId: string }) {
  const { estado, commit } = useLoja();
  const [texto, setTexto] = useState('');
  const lista = estado.comentarios[postId] ?? [];

  const enviar = () => {
    const t = texto.trim();
    if (!t) return;
    commit((e) => {
      const atual = e.comentarios[postId] ?? [];
      atual.push({ id: `c${Date.now()}`, autor: 'Você', texto: t, quando: Date.now() });
      e.comentarios[postId] = atual;
    });
    setTexto('');
  };

  return (
    <Folha aberta={aberto} aoFechar={aoFechar} titulo={lista.length ? `Comentários (${lista.length})` : 'Comentários'}>
      {lista.length === 0 ? (
        <T tam={14} cor={cores.texto2} style={{ lineHeight: 21, marginBottom: 14 }}>Ainda sem comentários. Seja a primeira pessoa a responder.</T>
      ) : (
        <View style={{ gap: 14, marginBottom: 16 }}>
          {lista.map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', gap: 10 }}>
              <Avatar nome={c.autor} voce={c.autor === 'Você'} tamanho={32} />
              <View style={{ flex: 1 }}>
                <View style={st.meta}>
                  <T tam={13.5} peso="500">{c.autor}</T>
                  <T tam={12} cor={cores.texto3}>{quando(c.quando)}</T>
                </View>
                <T tam={14.5} style={{ marginTop: 2, lineHeight: 21 }}>{c.texto}</T>
              </View>
            </View>
          ))}
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
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar comentário" disabled={!texto.trim()} onPress={enviar} style={[st.enviar, { opacity: texto.trim() ? 1 : 0.4 }]}>
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
  cheersDado: { backgroundColor: `rgba(${cores.tom},0.14)`, borderRadius: 22, paddingHorizontal: 14 },
  linhaComentario: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campoComentario: { flex: 1, height: 46, paddingHorizontal: 16, borderRadius: 23, borderWidth: 1, borderColor: cores.linha2, backgroundColor: 'rgba(255,255,255,0.045)', color: cores.texto, fontSize: 15, fontFamily: FONTE['300'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  enviar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
}));
