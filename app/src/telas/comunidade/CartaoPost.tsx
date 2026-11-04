/* Uma publicação: autor, texto, destaque, fotos e vídeos, e as ações (curtir, comentar, compartilhar, apagar a própria). */
import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, Cartao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { removerMidia } from '../../lib/midia';
import { cores } from '../../tema';
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

export function CartaoPost({ post, nomeGrupo, aoAbrirGrupo, aoAbrirMidia }: Props) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const [comentando, setComentando] = useState(false);
  const [apagando, setApagando] = useState(false);

  const curtiu = !!estado.curtidas[post.id];
  const meu = post.autor === 'Você';
  const base = meu ? 0 : 3 + (post.id.length * 7) % 40;   // os números dos outros são de demonstração; a sua publicação começa do zero
  const nComentarios = (estado.comentarios[post.id] ?? []).length;

  const compartilhar = async () => {
    try {
      await Share.share({ message: `${meu ? 'Eu' : post.autor} no Yesteryou: ${post.texto}` });
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
              <Pressable accessibilityRole="button" accessibilityLabel={`Abrir o grupo ${nomeGrupo}`} onPress={aoAbrirGrupo} hitSlop={6}>
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
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: curtiu }}
          accessibilityLabel={curtiu ? 'Tirar o seu cheers' : 'Dar cheers'}
          onPress={() => commit((e) => { e.curtidas[post.id] = !e.curtidas[post.id]; })}
          style={[st.acao, curtiu && st.cheersDado]}
        >
          <Icone nome="cheers" tamanho={20} cor={curtiu ? cores.destaque2 : cores.texto2} />
          <T tam={13} peso={curtiu ? '500' : '300'} cor={curtiu ? cores.destaque2 : cores.texto2}>Cheers {base + (curtiu ? 1 : 0)}</T>
        </Pressable>
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

      <Folha aberta={apagando} aoFechar={() => setApagando(false)} titulo="Apagar publicação?">
        <T tam={14} cor={cores.texto2} style={{ lineHeight: 21 }}>Ela some do feed e as fotos e vídeos são removidos do aparelho. Isso não dá para desfazer.</T>
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
          placeholderTextColor={cores.texto3}
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

const st = StyleSheet.create({
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  botaoIcone: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  destaque: { marginTop: 12, backgroundColor: cores.fundo2, borderRadius: 12, padding: 12 },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginHorizontal: -6 },
  acao: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 8 },
  cheersDado: { backgroundColor: 'rgba(139,92,246,0.14)', borderRadius: 22, paddingHorizontal: 14 },
  linhaComentario: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campoComentario: { flex: 1, height: 46, paddingHorizontal: 16, borderRadius: 23, borderWidth: 1, borderColor: cores.linha2, backgroundColor: 'rgba(255,255,255,0.045)', color: cores.texto, fontSize: 15, fontWeight: '300', outlineWidth: 0, outlineColor: 'transparent' },
  enviar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
});
