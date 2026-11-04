/* Página de um grupo: capa, quem está, meta, ações (entrar, sair, convidar, publicar, apagar) e as publicações do grupo. */
import React, { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Barra, Botao, Cartao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { fmt } from '../../lib/datas';
import { categoria, listarGrupos, membrosAmostra } from '../../lib/grupos';
import { removerMidia } from '../../lib/midia';
import { cores, estilos } from '../../tema';
import type { Midia } from '../../tipos';
import { SITE } from '../Login';
import { Avatar } from './Avatar';
import { ConfirmarSaida } from './ConfirmarSaida';
import { Capa } from './Capa';
import { CartaoPost } from './CartaoPost';
import { todosOsPosts } from './posts';

type Props = {
  id: string;
  aoVoltar: () => void;
  aoCompor: (grupo: string) => void;
  aoAbrirMidia: (itens: Midia[], indice: number) => void;
};

export function GrupoTela({ id, aoVoltar, aoCompor, aoAbrirMidia }: Props) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const [apagando, setApagando] = useState(false);
  const [saindo, setSaindo] = useState(false);   // confirmação de saída aberta

  const g = listarGrupos(estado).find((x) => x.id === id);
  useEffect(() => { if (!g) aoVoltar(); }, [g, aoVoltar]);
  if (!g) return null;

  const posts = todosOsPosts(estado).filter((p) => p.grupo === id);
  const nomes = membrosAmostra(g);

  const entrar = () => { commit((e) => { e.clubes[id] = true; }); avisar(`Você entrou em ${g.nome}.`); };
  const sair = () => { commit((e) => { e.clubes[id] = false; }); avisar(`Você saiu de ${g.nome}.`); };

  const convidar = async () => {
    const mensagem = g.privado && g.codigo
      ? `Entre no meu clube "${g.nome}" no KORA. Código de convite: ${g.codigo}`
      : `Venha para o clube "${g.nome}" no KORA: ${SITE}`;
    try {
      await Share.share({ message: mensagem });
    } catch {
      avisar('Compartilhar não está disponível neste aparelho.');
    }
  };

  const apagar = () => {
    const midias = estado.posts.filter((p) => p.grupo === id).flatMap((p) => p.midia ?? []);
    commit((e) => {
      e.grupos = e.grupos.filter((x) => x.id !== id);
      delete e.clubes[id];
      for (const p of e.posts.filter((x) => x.grupo === id)) { delete e.comentarios[p.id]; delete e.curtidas[p.id]; }
      e.posts = e.posts.filter((x) => x.grupo !== id);
    });
    removerMidia(midias.map((m) => m.id));
    setApagando(false);
    avisar('Clube apagado.');
  };

  return (
    <View style={{ marginTop: 4 }}>
      <View style={st.barra}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para os clubes" onPress={aoVoltar} style={st.circulo}>
          <Icone nome="voltar" tamanho={21} cor={cores.texto} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Convidar para o clube" onPress={convidar} style={st.circulo}>
          <Icone nome="convidar" tamanho={20} cor={cores.texto} />
        </Pressable>
      </View>

      <Capa cor={g.cor} cat={g.categoria} altura={156}>
        <View style={st.titulo}>
          <T tam={30} peso="300" cor="#ffffff" linhas={2} style={{ lineHeight: 34 }}>{g.nome}</T>
          <View style={st.chips}>
            <Icone nome={g.privado ? 'cadeado' : 'grupo'} tamanho={14} cor="rgba(255,255,255,0.85)" />
            <T tam={12.5} cor="rgba(255,255,255,0.85)">
              {g.privado ? 'Privado' : 'Público'} · {fmt(g.membros)} {g.membros === 1 ? 'membro' : 'membros'} · {categoria(g.categoria).nome}
            </T>
          </View>
        </View>
      </Capa>

      {g.descricao ? <T tam={15} cor={cores.texto2} style={{ marginTop: 16, lineHeight: 22 }}>{g.descricao}</T> : null}

      <View style={st.rostos}>
        {nomes.map((n, i) => (
          <View key={n} style={[st.rosto, { marginLeft: i === 0 ? 0 : -10 }]}>
            <Avatar nome={n} voce={n === 'Você'} tamanho={34} />
          </View>
        ))}
        {g.membros > nomes.length ? <T tam={13} cor={cores.texto2} style={{ marginLeft: 12 }}>+{fmt(g.membros - nomes.length)}</T> : null}
      </View>

      {g.meta ? (
        <Cartao style={{ marginTop: 16 }}>
          <T tam={13} cor={cores.texto2}>Objetivo do clube</T>
          <T tam={18} peso="300" style={{ marginTop: 4, lineHeight: 24 }}>{g.meta}</T>
          {g.progresso !== undefined ? (
            <View style={{ marginTop: 12 }}>
              <Barra valor={g.progresso} max={1} cor={cores.destaque} />
              <T tam={12} cor={cores.texto3} style={{ marginTop: 6 }}>{Math.round(g.progresso * 100)}% da meta coletiva</T>
            </View>
          ) : null}
        </Cartao>
      ) : null}

      {g.proprio && g.privado && g.codigo ? (
        <Cartao style={{ marginTop: 14 }}>
          <T tam={13} cor={cores.texto2}>Código de convite</T>
          <T tam={28} peso="200" mono style={{ marginTop: 4, letterSpacing: 4 }}>{g.codigo}</T>
          <T tam={12.5} cor={cores.texto3} style={{ marginTop: 6, lineHeight: 18 }}>Compartilhe com quem você quer neste clube.</T>
        </Cartao>
      ) : null}

      <View style={{ gap: 10, marginTop: 18 }}>
        {g.meu ? (
          <Botao icone="imagem" titulo="Publicar no clube" aoPressionar={() => aoCompor(id)} />
        ) : (
          <Botao icone="mais" titulo="Entrar no clube" aoPressionar={entrar} />
        )}
        {g.meu ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Botao pequeno tipo="fantasma" icone="convidar" titulo="Convidar" aoPressionar={convidar} style={{ flex: 1 }} />
            {g.proprio ? (
              <Botao pequeno tipo="perigo" icone="lixo" titulo="Apagar clube" aoPressionar={() => setApagando(true)} style={{ flex: 1 }} />
            ) : (
              <Botao pequeno tipo="discreto" titulo="Sair do clube" aoPressionar={() => setSaindo(true)} style={{ flex: 1 }} />
            )}
          </View>
        ) : null}
      </View>

      <T tam={20} peso="300" style={{ marginTop: 28, marginBottom: 12, letterSpacing: -0.4 }}>Publicações</T>
      {posts.length ? (
        <View style={{ gap: 14 }}>
          {posts.map((p) => <CartaoPost key={p.id} post={p} aoAbrirMidia={aoAbrirMidia} />)}
        </View>
      ) : (
        <Cartao>
          <T tam={15} peso="300">Ainda sem publicações.</T>
          <T tam={13} cor={cores.texto2} style={{ marginTop: 6, lineHeight: 19 }}>
            {g.meu ? 'Seja a primeira pessoa a compartilhar um treino, uma refeição ou uma foto.' : 'Entre no clube para começar a publicar.'}
          </T>
        </Cartao>
      )}

      <ConfirmarSaida aberto={saindo} nome={g.nome} aoFechar={() => setSaindo(false)} aoConfirmar={() => { setSaindo(false); sair(); }} />
      <Folha aberta={apagando} aoFechar={() => setApagando(false)} titulo="Apagar clube?">
        <T tam={14} cor={cores.texto2} style={{ lineHeight: 21 }}>O clube e as publicações dele somem do aparelho, com as fotos e vídeos. Isso não dá para desfazer.</T>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Botao tipo="discreto" titulo="Cancelar" aoPressionar={() => setApagando(false)} style={{ flex: 1 }} />
          <Botao tipo="perigo" icone="lixo" titulo="Apagar" aoPressionar={apagar} style={{ flex: 1 }} />
        </View>
      </Folha>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  barra: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  circulo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2, borderWidth: 1, borderColor: cores.linha },
  titulo: { position: 'absolute', left: 18, right: 18, bottom: 16, gap: 6 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rostos: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  rosto: { borderRadius: 20, borderWidth: 2, borderColor: 'rgba(5,5,7,0.9)' },
}));
