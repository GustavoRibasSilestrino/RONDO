/* Notificações: tudo o que chegou para o seu perfil (cheers, comentários, novos seguidores e medalhas), da mais nova para a mais antiga. */
import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Tela } from '../componentes/Estrutura';
import { Icone, NomeIcone } from '../componentes/Icone';
import { Botao, Cartao, T } from '../componentes/Ui';
import { useLoja } from '../estado/loja';
import { MEDALHAS } from '../lib/medalhas';
import { cores } from '../tema';
import type { Notificacao } from '../tipos';
import { quando } from './comunidade/util';

const ICONE: Record<Notificacao['tipo'], NomeIcone> = { cheers: 'cheers', comentario: 'comentario', seguidor: 'convidar', medalha: 'medalha', profissional: 'verificado' };

export function Notificacoes() {
  const { estado, commit } = useLoja();
  /* quem chegou como "nova" continua destacada nesta visita; ao entrar, tudo vira lido */
  const novas = useRef(new Set(estado.notificacoes.filter((n) => !n.lida).map((n) => n.id))).current;
  useEffect(() => {
    if (estado.notificacoes.some((n) => !n.lida)) commit((e) => { for (const n of e.notificacoes) n.lida = true; });
  }, [estado.notificacoes, commit]);

  const lista = estado.notificacoes;
  return (
    <Tela>
      <T tam={15} peso="400" centro>Notificações</T>
      <T tam={13} centro style={{ marginTop: 6 }}>Tudo o que chega para o seu perfil fica guardado aqui.</T>
      <View style={{ gap: 10, marginTop: 22 }}>
        {lista.length === 0 ? (
          <Cartao>
            <T tam={16}>Nada por aqui ainda.</T>
            <T tam={13.5} style={{ marginTop: 6, lineHeight: 20 }}>Quando alguém der cheers, comentar ou seguir você, e quando você ganhar uma medalha, aparece aqui.</T>
          </Cartao>
        ) : lista.map((n) => {
          const medalha = n.ref ? MEDALHAS.find((m) => m.id === n.ref) : undefined;
          return (
            <View key={n.id} style={[st.item, novas.has(n.id) && st.nova]}>
              {medalha ? (
                <Image source={medalha.img} style={{ width: 44, height: 42 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              ) : (
                <View style={st.icone}><Icone nome={ICONE[n.tipo]} tamanho={20} cor="#ffffff" /></View>
              )}
              <View style={{ flex: 1 }}>
                <T tam={14.5} style={{ lineHeight: 20 }}>{n.texto}</T>
                <T tam={12} cor={cores.placeholder} style={{ marginTop: 3 }}>{quando(n.quando)}</T>
              </View>
              {novas.has(n.id) ? <View style={st.ponto} /> : null}
            </View>
          );
        })}
      </View>
      {lista.length > 0 ? <Botao tipo="discreto" titulo="Limpar notificações" aoPressionar={() => commit((e) => { e.notificacoes = []; })} style={{ marginTop: 20 }} /> : null}
    </Tela>
  );
}

const st = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.cartao },
  nova: { borderColor: cores.destaqueForte },
  icone: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  ponto: { width: 9, height: 9, borderRadius: 5, backgroundColor: cores.destaque },
});
