/* O brownie de recompensa (desde 2026-11-19, no lugar das medalhas): cada missão cumprida (lib/missoes.ts) e cada nível de
   conta alcançado (lib/nivel.ts) pedem ao servidor um brownie, um mascote sorteado para a coleção. A raridade sobe a cada
   brownie ganho (o sorteio é do servidor). O servidor dá um só por chave; aqui o app lembra o que já pediu
   (estado.recompensasPedidas) e, quando chega um brownie novo, mostra a comemoração com o mascote. Sem rede, tenta de novo
   mais tarde. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { escolherMascote, pedirRecompensa } from '../api/mascotes';
import { useLoja } from '../estado/loja';
import { mascoteDe, type MascoteInfo } from '../lib/mascotes';
import { missoesDe, MISSOES } from '../lib/missoes';
import { useMovimentoReduzido } from '../lib/movimento';
import { nivelDe, xpTotal } from '../lib/nivel';
import { adicionar } from '../lib/notificacoes';
import { cores, estilos, larguraMax } from '../tema';
import { Icone } from './Icone';
import { Mascote } from './Mascote';
import { Botao, T } from './Ui';

/* as chaves que a conta já cumpriu: as missões e os níveis do 2 ao atual */
function chavesCumpridas(estado: Parameters<typeof missoesDe>[0]): string[] {
  const missoes = missoesDe(estado, new Date()).filter((m) => m.cumprida).map((m) => `missao:${m.id}`);
  const nivel = nivelDe(xpTotal(estado));
  const niveis = Array.from({ length: Math.max(0, nivel - 1) }, (_, i) => `nivel:${i + 2}`);
  return [...missoes, ...niveis];
}

/* de onde veio o brownie, numa frase */
function motivo(chave: string): string {
  if (chave.startsWith('nivel:')) return `Nível ${chave.slice(6)} alcançado`;
  const m = MISSOES.find((x) => `missao:${x.id}` === chave);
  return m ? `Missão cumprida: ${m.nome}` : 'Missão cumprida';
}

type Ganho = { chave: string; mascote: MascoteInfo };

/* `pausado`: com o RONDIN aberto por cima, a comemoração espera ele fechar (os pedidos ao servidor seguem) */
export function AvisoBrownie({ pausado }: { pausado?: boolean }) {
  const { estado, pronto, commit } = useLoja();
  const reduzido = useMovimentoReduzido();
  const nativo = Platform.OS !== 'web';
  const [fila, setFila] = useState<Ganho[]>([]);
  const pedindo = useRef(false);
  const esperarAte = useRef(0);   // depois de uma falha (sem rede), espera um minuto antes de tentar de novo
  const pulo = useRef(new Animated.Value(0)).current;

  const pendentes = estado.usuario ? chavesCumpridas(estado).filter((k) => !(estado.recompensasPedidas ?? []).includes(k)) : [];
  const assinatura = pendentes.join(',');

  useEffect(() => {
    if (!pronto || !estado.usuario || !pendentes.length || pedindo.current || Date.now() < esperarAte.current) return;
    pedindo.current = true;
    (async () => {
      const feitas: string[] = [];
      const novos: Ganho[] = [];
      for (const chave of pendentes) {
        try {
          const r = await pedirRecompensa(chave);
          feitas.push(chave);
          const m = mascoteDe(`${r.mascote.linha}-${r.mascote.coluna}`);
          if (r.nova && m) novos.push({ chave, mascote: m });
        } catch {
          esperarAte.current = Date.now() + 60_000;
          break;
        }
      }
      if (feitas.length) {
        commit((e) => {
          e.recompensasPedidas = [...(e.recompensasPedidas ?? []), ...feitas];
          for (const g of novos) adicionar(e, { tipo: 'brownie', texto: `${motivo(g.chave)}. Você ganhou um brownie: ${g.mascote.nome} (${g.mascote.raridade.nome}).`, ref: g.mascote.chave });
          /* o primeiro mascote vira o da conta (o servidor faz o mesmo) */
          if (e.usuario && !e.usuario.mascote && novos.length) e.usuario.mascote = novos[0].mascote.chave;
        });
      }
      if (novos.length) setFila((f) => [...f, ...novos]);
      pedindo.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pronto, estado.usuario?.email, assinatura, commit]);

  const atual = pausado ? undefined : fila[0];
  useEffect(() => {
    if (!atual) return undefined;
    pulo.setValue(reduzido ? 1 : 0);
    if (reduzido) return undefined;
    const a = Animated.spring(pulo, { toValue: 1, friction: 5, tension: 110, useNativeDriver: nativo });
    a.start();
    return () => a.stop();
  }, [atual, pulo, reduzido, nativo]);

  if (!atual) return null;
  const outros = fila.length - 1;
  const ehOMeu = estado.usuario?.mascote === atual.mascote.chave;
  const proximo = () => setFila((f) => f.slice(1));
  const usar = async () => {
    try {
      await escolherMascote(atual.mascote.chave);
      commit((e) => { if (e.usuario) e.usuario.mascote = atual.mascote.chave; });
    } catch { /* sem rede: fica o mascote de antes */ }
    proximo();
  };
  const r = atual.mascote.raridade;

  return (
    <View style={st.fundo} accessibilityViewIsModal>
      <View style={st.cartao}>
        <View style={st.palco}>
          <View pointerEvents="none" style={[st.brilho, { backgroundColor: r.cor }]} />
          <Animated.View style={{ transform: [{ scale: pulo.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }, { translateY: pulo.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
            <Mascote chave={atual.mascote.chave} tamanho={150} />
          </Animated.View>
        </View>
        <T tam={12.5} peso="500" centro cor={r.cor} style={{ letterSpacing: 2 }}>{r.nome.toUpperCase()} {'★'.repeat(r.estrelas)}</T>
        <T tam={22} peso="500" centro style={{ marginTop: 6 }}>Você ganhou um brownie!</T>
        <T tam={15} centro style={{ marginTop: 4 }}>{atual.mascote.nome}, nº {atual.mascote.numero}</T>
        <View style={st.motivo}>
          <Icone nome="brownie" tamanho={18} cor={cores.destaque2} />
          <T tam={13.5} style={{ flex: 1, lineHeight: 19 }}>{motivo(atual.chave)}</T>
        </View>
        {outros > 0 ? <T tam={12.5} centro style={{ marginTop: 10 }}>e mais {outros} {outros === 1 ? 'brownie' : 'brownies'} esperando</T> : null}
        <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: 10, marginTop: 18 }}>
          {ehOMeu ? null : <Botao titulo="Usar como meu mascote" aoPressionar={usar} />}
          <Botao tipo={ehOMeu ? 'primario' : 'fantasma'} titulo={outros > 0 ? 'Próximo' : 'Continuar'} aoPressionar={proximo} />
        </View>
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  fundo: { ...StyleSheet.absoluteFill, zIndex: 2400, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  cartao: { width: '100%', maxWidth: Math.min(larguraMax, 400), alignItems: 'center', padding: 24, borderRadius: 28, backgroundColor: cores.painel, borderWidth: 1, borderColor: cores.linha2 },
  palco: { width: 190, height: 176, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  brilho: { position: 'absolute', width: 150, height: 150, borderRadius: 75, opacity: 0.22 },
  motivo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, alignSelf: 'stretch', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.cartao },
}));
