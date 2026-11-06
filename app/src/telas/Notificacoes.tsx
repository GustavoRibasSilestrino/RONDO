/* Notificações: tudo o que chegou para o seu perfil (cheers, comentários, novos seguidores e medalhas), da mais nova para a mais antiga.
   Cheers, comentários e seguidores vêm do servidor; as medalhas são avisos guardados no aparelho. */
import React, { useEffect, useMemo, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { lerAvisos, limparAvisos, marcarAvisosLidos } from '../api/social';
import { Tela } from '../componentes/Estrutura';
import { Icone, NomeIcone } from '../componentes/Icone';
import { Botao, Cartao, T } from '../componentes/Ui';
import { useLista } from '../estado/lista';
import { useLoja } from '../estado/loja';
import { MEDALHAS } from '../lib/medalhas';
import { cores, estilos } from '../tema';
import type { Notificacao } from '../tipos';
import { quando } from './comunidade/util';

const ICONE: Record<Notificacao['tipo'], NomeIcone> = { cheers: 'cheers', comentario: 'comentario', seguidor: 'convidar', medalha: 'medalha', profissional: 'verificado' };

type Linha = { chave: string; tipo: Notificacao['tipo']; texto: string; quando: number; nova: boolean; ref?: string };

export function Notificacoes() {
  const { estado, commit, atualizarSocial } = useLoja();
  const servidor = useLista((cursor) => lerAvisos(cursor), []);

  /* quem chegou como "nova" continua destacada nesta visita; ao entrar, tudo vira lido */
  const novasLocais = useRef(new Set(estado.notificacoes.filter((n) => !n.lida).map((n) => n.id))).current;
  const novasServidor = useRef<Set<number> | null>(null);
  if (novasServidor.current === null && !servidor.carregando && servidor.itens.length) novasServidor.current = new Set(servidor.itens.filter((n) => !n.lida).map((n) => n.id));

  useEffect(() => {
    if (estado.notificacoes.some((n) => !n.lida)) commit((e) => { for (const n of e.notificacoes) n.lida = true; });
  }, [estado.notificacoes, commit]);

  useEffect(() => {
    if (!servidor.itens.some((n) => !n.lida)) return;
    marcarAvisosLidos().then(() => atualizarSocial()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servidor.itens]);

  const lista: Linha[] = useMemo(() => {
    const locais: Linha[] = estado.notificacoes.map((n) => ({ chave: `l${n.id}`, tipo: n.tipo, texto: n.texto, quando: n.quando, nova: novasLocais.has(n.id), ref: n.ref }));
    const remotas: Linha[] = servidor.itens.map((n) => ({ chave: `s${n.id}`, tipo: n.tipo, texto: n.texto, quando: n.quando, nova: !!novasServidor.current?.has(n.id) || !n.lida }));
    return [...locais, ...remotas].sort((a, b) => b.quando - a.quando);
  }, [estado.notificacoes, servidor.itens, novasLocais]);

  const limpar = async () => {
    commit((e) => { e.notificacoes = []; });
    try { await limparAvisos(); servidor.mudar(() => []); void atualizarSocial(); } catch { /* sem rede: os avisos do servidor continuam lá */ }
  };

  return (
    <Tela>
      <T tam={15} peso="400" centro>Notificações</T>
      <T tam={13} centro style={{ marginTop: 6 }}>Tudo o que chega para o seu perfil fica guardado aqui.</T>
      <View style={{ gap: 10, marginTop: 22 }}>
        {lista.length === 0 ? (
          <Cartao>
            <T tam={16}>{servidor.erro ? 'Não foi possível carregar.' : servidor.carregando ? 'Carregando...' : 'Nada por aqui ainda.'}</T>
            <T tam={13.5} style={{ marginTop: 6, lineHeight: 20 }}>{servidor.erro || 'Quando alguém der cheers, comentar ou seguir você, e quando você ganhar uma medalha, aparece aqui.'}</T>
          </Cartao>
        ) : lista.map((n) => {
          const medalha = n.ref ? MEDALHAS.find((m) => m.id === n.ref) : undefined;
          return (
            <View key={n.chave} style={[st.item, n.nova && st.nova]}>
              {medalha ? (
                <Image source={medalha.img} style={{ width: 44, height: 42 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              ) : (
                <View style={st.icone}><Icone nome={ICONE[n.tipo]} tamanho={20} cor="#ffffff" /></View>
              )}
              <View style={{ flex: 1 }}>
                <T tam={14.5} style={{ lineHeight: 20 }}>{n.texto}</T>
                <T tam={12} cor={cores.placeholder} style={{ marginTop: 3 }}>{quando(n.quando)}</T>
              </View>
              {n.nova ? <View style={st.ponto} /> : null}
            </View>
          );
        })}
      </View>
      {servidor.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais" aoPressionar={servidor.maisItens} carregando={servidor.carregando} style={{ marginTop: 14 }} /> : null}
      {lista.length > 0 ? <Botao tipo="discreto" titulo="Limpar notificações" aoPressionar={limpar} style={{ marginTop: 20 }} /> : null}
    </Tela>
  );
}

const st = estilos(() => StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 4, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.cartao },
  nova: { borderColor: cores.destaqueForte },
  icone: { width: 44, height: 44, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  ponto: { width: 9, height: 9, borderRadius: 5, backgroundColor: cores.destaque },
}));
