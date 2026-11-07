/* Página de um clube: capa, quem está, meta, ações (entrar, sair, convidar, publicar, apagar) e as publicações do clube.
   O clube, os membros e as publicações vêm do servidor; clube privado só abre para quem está nele. */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { apagarClube, entrarNoClube, lerClube, lerFeed, lerMembros, sairDoClube } from '../../api/social';
import type { Clube, Pessoa } from '../../api/social';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, Cartao, T } from '../../componentes/Ui';
import { useLista } from '../../estado/lista';
import { useLoja } from '../../estado/loja';
import { fmt } from '../../lib/datas';
import { categoria } from '../../lib/grupos';
import { cores, estilos } from '../../tema';
import type { Midia } from '../../tipos';
import { SITE } from '../Login';
import { Avatar } from './Avatar';
import { ConfirmarSaida } from './ConfirmarSaida';
import { Capa } from './Capa';
import { CartaoPost } from './CartaoPost';

type Props = {
  id: number;
  aoVoltar: () => void;
  aoCompor: (grupo: number) => void;
  aoAbrirMidia: (itens: Midia[], indice: number) => void;
  aoAbrirPerfil?: (autor: Pessoa) => void;
};

export function GrupoTela({ id, aoVoltar, aoCompor, aoAbrirMidia, aoAbrirPerfil }: Props) {
  const { atualizarSocial, versaoSocial } = useLoja();
  const avisar = useAviso();
  const [apagando, setApagando] = useState(false);
  const [saindo, setSaindo] = useState(false);   // confirmação de saída aberta
  const [g, setG] = useState<Clube | null>(null);
  const [membros, setMembros] = useState<Pessoa[]>([]);

  const carregar = useCallback(async () => {
    try {
      const [c, m] = await Promise.all([lerClube(id), lerMembros(id)]);
      setG(c); setMembros(m.itens);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Este clube não está disponível.');
      aoVoltar();
    }
  }, [id, avisar, aoVoltar]);
  useEffect(() => { void carregar(); }, [carregar, versaoSocial]);

  const lista = useLista((cursor) => lerFeed({ clubeId: id, antes: cursor }), [id]);
  if (!g) return <T tam={14} cor={cores.texto2} centro style={{ marginTop: 40 }}>Carregando o clube...</T>;

  const posts = lista.itens;
  const total = g.membros;

  const entrar = async () => {
    try { await entrarNoClube(id); void atualizarSocial(true); avisar(`Você entrou em ${g.nome}.`); } catch (e) { avisar(e instanceof Error ? e.message : 'Não foi possível entrar agora.'); }
  };
  const sair = async () => {
    try { await sairDoClube(id); void atualizarSocial(true); avisar(`Você saiu de ${g.nome}.`); } catch (e) { avisar(e instanceof Error ? e.message : 'Não foi possível sair agora.'); }
  };

  const convidar = async () => {
    const mensagem = g.privado && g.codigo
      ? `Entre no meu clube "${g.nome}" no RONDO. Código de convite: ${g.codigo}`
      : `Venha para o clube "${g.nome}" no RONDO: ${SITE}`;
    try {
      await Share.share({ message: mensagem });
    } catch {
      avisar('Compartilhar não está disponível neste aparelho.');
    }
  };

  const apagar = async () => {
    try {
      await apagarClube(id);
    } catch (e) {
      setApagando(false);
      avisar(e instanceof Error ? e.message : 'Não foi possível apagar agora.');
      return;
    }
    setApagando(false);
    void atualizarSocial(true);
    avisar('Clube apagado.');
    aoVoltar();
  };

  return (
    <View style={{ marginTop: 4 }}>
      <View style={st.barra}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para os clubes" onPress={aoVoltar} style={st.circulo}>
          <Icone nome="voltar" tamanho={21} cor={cores.texto} />
        </Pressable>
        {g.meu ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Convidar para o clube" onPress={convidar} style={st.circulo}>
            <Icone nome="convidar" tamanho={20} cor={cores.texto} />
          </Pressable>
        ) : <View />}
      </View>

      <Capa cor={g.cor} cat={g.categoria} altura={156}>
        <View style={st.titulo}>
          <T tam={30} peso="300" cor="#ffffff" linhas={2} style={{ lineHeight: 34 }}>{g.nome}</T>
          <View style={st.chips}>
            <Icone nome={g.privado ? 'cadeado' : 'grupo'} tamanho={14} cor="rgba(255,255,255,0.85)" />
            <T tam={12.5} cor="rgba(255,255,255,0.85)">
              {g.privado ? 'Privado' : 'Público'} · {fmt(total)} {total === 1 ? 'membro' : 'membros'} · {categoria(g.categoria).nome}
            </T>
          </View>
        </View>
      </Capa>

      {g.descricao ? <T tam={15} cor={cores.texto2} style={{ marginTop: 16, lineHeight: 22 }}>{g.descricao}</T> : null}

      <View style={st.rostos}>
        {membros.slice(0, 6).map((m, i) => (
          <View key={m.id} style={[st.rosto, { marginLeft: i === 0 ? 0 : -10 }]}>
            <Avatar nome={m.nome} voce={m.voce} tamanho={34} foto={m.foto ?? undefined} />
          </View>
        ))}
        {total > Math.min(membros.length, 6) ? <T tam={13} cor={cores.texto2} style={{ marginLeft: 12 }}>+{fmt(total - Math.min(membros.length, 6))}</T> : null}
      </View>

      {g.meta ? (
        <Cartao style={{ marginTop: 16 }}>
          <T tam={13} cor={cores.texto2}>Objetivo do clube</T>
          <T tam={18} peso="300" style={{ marginTop: 4, lineHeight: 24 }}>{g.meta}</T>
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
        <View>
          <View style={{ marginHorizontal: -20, borderTopWidth: 1, borderTopColor: cores.linha }}>
            {posts.map((p) => <CartaoPost key={p.id} timeline sangrar post={p} aoAbrirMidia={aoAbrirMidia} aoAbrirPerfil={aoAbrirPerfil} aoApagar={(pid) => lista.mudar((l) => l.filter((x) => x.id !== pid))} />)}
          </View>
          {lista.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais publicações" aoPressionar={lista.maisItens} carregando={lista.carregando} style={{ marginTop: 14 }} /> : null}
        </View>
      ) : (
        <Cartao>
          <T tam={15} peso="300">{lista.erro ? lista.erro : lista.carregando ? 'Carregando...' : 'Ainda sem publicações.'}</T>
          {!lista.erro && !lista.carregando ? (
            <T tam={13} cor={cores.texto2} style={{ marginTop: 6, lineHeight: 19 }}>
              {g.meu ? 'Seja a primeira pessoa a compartilhar um treino, uma refeição ou uma foto.' : 'Entre no clube para começar a publicar.'}
            </T>
          ) : null}
        </Cartao>
      )}

      <ConfirmarSaida aberto={saindo} nome={g.nome} aoFechar={() => setSaindo(false)} aoConfirmar={() => { setSaindo(false); void sair(); }} />
      <Folha aberta={apagando} aoFechar={() => setApagando(false)} titulo="Apagar clube?">
        <T tam={14} cor={cores.texto2} style={{ lineHeight: 21 }}>O clube e as publicações dele somem para todos os membros. Isso não dá para desfazer.</T>
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
