/* A aba Coleção do perfil (desde 2026-11-19, no lugar das medalhas): os 69 mascotes, os que a conta já tem em cor e os que
   faltam só em silhueta, por raridade. Tocar num mascote da coleção mostra ele grande e deixa escolher qual a conta mostra
   (ao lado da foto, nas publicações e passeando pelo app). As missões, que dão os brownies, ficam em "Ver missões". */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { escolherMascote, lerColecao, type MascoteDaColecao } from '../../api/mascotes';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Mascote } from '../../componentes/Mascote';
import { Barra, Botao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { fmt } from '../../lib/datas';
import { mascoteDe, RARIDADES, TODOS_MASCOTES, TOTAL_MASCOTES, type MascoteInfo } from '../../lib/mascotes';
import { missoesDe } from '../../lib/missoes';
import { progressoNivel, xpTotal } from '../../lib/nivel';
import { cores, estilos } from '../../tema';

export function ColecaoMascotes({ aoVerMissoes }: { aoVerMissoes: () => void }) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const [tenho, setTenho] = useState<Record<string, MascoteDaColecao> | null>(null);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState<MascoteInfo | null>(null);
  const [salvando, setSalvando] = useState(false);
  const meu = estado.usuario?.mascote ?? null;
  const xp = xpTotal(estado);
  const nivel = progressoNivel(xp);
  const missoes = missoesDe(estado, new Date());
  const cumpridas = missoes.filter((m) => m.cumprida).length;

  const carregar = useCallback(async () => {
    setErro('');
    try {
      const c = await lerColecao();
      setTenho(Object.fromEntries(c.mascotes.map((m) => [`${m.linha}-${m.coluna}`, m])));
      if ((c.escolhido ?? null) !== (estado.usuario?.mascote ?? null)) commit((e) => { if (e.usuario) e.usuario.mascote = c.escolhido; });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a coleção.');
    }
  }, [commit, estado.usuario?.mascote]);
  // a coleção recarrega quando um brownie novo chega (a lista de recompensas pedidas cresce)
  useEffect(() => { void carregar(); }, [estado.recompensasPedidas?.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  const n = tenho ? Object.keys(tenho).length : 0;
  const escolher = async (chave: string | null) => {
    setSalvando(true);
    try {
      await escolherMascote(chave);
      commit((e) => { if (e.usuario) e.usuario.mascote = chave; });
      avisar(chave ? `${mascoteDe(chave)?.nome} agora é o seu mascote.` : 'O seu mascote não aparece mais.');
      setAberto(null);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível trocar agora.');
    } finally {
      setSalvando(false);
    }
  };
  const meuInfo = mascoteDe(meu);

  return (
    <View style={{ marginTop: 18, gap: 16 }}>
      {/* o nível da conta: cada nível novo também dá um brownie */}
      <View style={st.cartao}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T tam={20} peso="500">Nível {nivel.nivel}</T>
          <T tam={13}>{fmt(xp)} XP</T>
        </View>
        <View style={{ marginTop: 10 }}><Barra valor={nivel.noNivel} max={nivel.tamanho} cor={cores.destaque2} /></View>
        <T tam={12.5} style={{ marginTop: 8 }}>Faltam {fmt(nivel.faltam)} XP para o nível {nivel.nivel + 1} e o próximo brownie.</T>
      </View>

      {/* o mascote da conta */}
      <View style={[st.cartao, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
        {meuInfo ? <Mascote chave={meuInfo.chave} tamanho={74} /> : <View style={st.semMascote}><Icone nome="brownie" tamanho={30} cor={cores.texto3} /></View>}
        <View style={{ flex: 1 }}>
          <T tam={12} peso="500" cor={cores.texto3} style={{ letterSpacing: 1 }}>SEU MASCOTE</T>
          <T tam={17} peso="500" style={{ marginTop: 2 }}>{meuInfo ? meuInfo.nome : n ? 'Nenhum escolhido' : 'Ainda sem mascote'}</T>
          <T tam={12.5} style={{ marginTop: 3, lineHeight: 18 }}>
            {meuInfo ? `${meuInfo.raridade.nome}. Aparece ao lado da sua foto, nas suas publicações e passeia pelo app.` : n ? 'Toque num mascote da coleção para ele andar com você.' : 'Cumpra uma missão ou suba de nível para ganhar o seu primeiro brownie.'}
          </T>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <T tam={18} peso="500">Coleção</T>
        <T tam={13}>{n} de {TOTAL_MASCOTES}</T>
      </View>
      <Barra valor={n} max={TOTAL_MASCOTES} cor={cores.destaque2} />

      {tenho === null ? (
        erro ? (
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
            <T tam={14} centro>{erro}</T>
            <Botao pequeno tipo="fantasma" titulo="Tentar de novo" aoPressionar={carregar} />
          </View>
        ) : <ActivityIndicator color={cores.destaque2} style={{ marginVertical: 24 }} />
      ) : (
        RARIDADES.map((r, linha) => {
          const daLinha = TODOS_MASCOTES.filter((m) => m.linha === linha);
          const quantos = daLinha.filter((m) => tenho[m.chave]).length;
          return (
            <View key={r.id}>
              <View style={st.cabecaRaridade}>
                <View style={[st.ponto, { backgroundColor: r.cor }]} />
                <T tam={14} peso="500" style={{ flex: 1 }}>{r.nome} <T tam={12} cor={r.cor}>{'★'.repeat(r.estrelas)}</T></T>
                <T tam={12.5} cor={quantos === daLinha.length ? cores.bom : cores.texto2}>{quantos}/{daLinha.length}</T>
              </View>
              <View style={st.grade}>
                {daLinha.map((m) => {
                  const tem = !!tenho[m.chave];
                  const ehMeu = m.chave === meu;
                  return (
                    <Pressable
                      key={m.chave} disabled={!tem} onPress={() => setAberto(m)}
                      accessibilityRole="button" accessibilityLabel={tem ? `${m.nome}, ${r.nome}${ehMeu ? ', o seu mascote' : ''}` : `Mascote nº ${m.numero}, ainda não tem`}
                      style={({ pressed }) => [st.celula, ehMeu && { borderColor: r.cor, backgroundColor: 'rgba(255,255,255,0.06)' }, pressed && { opacity: 0.7 }]}
                    >
                      <Mascote chave={m.chave} tamanho={54} apagado={!tem} />
                      {tem && tenho[m.chave].quantidade > 1 ? <View style={st.qtd}><T tam={10} peso="500" cor="#ffffff">x{tenho[m.chave].quantidade}</T></View> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })
      )}

      <Botao tipo="fantasma" icone="brownie" titulo={`Ver missões (${cumpridas}/${missoes.length})`} aoPressionar={aoVerMissoes} style={{ alignSelf: 'stretch' }} />

      <Folha aberta={aberto !== null} aoFechar={() => setAberto(null)} titulo={aberto?.nome}>
        {aberto ? (
          <View style={{ alignItems: 'center', gap: 10, paddingBottom: 6 }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', width: 190, height: 170 }}>
              <View pointerEvents="none" style={[st.brilho, { backgroundColor: aberto.raridade.cor }]} />
              <Mascote chave={aberto.chave} tamanho={150} />
            </View>
            <T tam={12.5} peso="500" cor={aberto.raridade.cor} style={{ letterSpacing: 2 }}>{aberto.raridade.nome.toUpperCase()} {'★'.repeat(aberto.raridade.estrelas)}</T>
            <T tam={14}>Nº {aberto.numero} de {TOTAL_MASCOTES}{tenho?.[aberto.chave]?.quantidade && tenho[aberto.chave].quantidade > 1 ? ` · você tem ${tenho[aberto.chave].quantidade}` : ''}</T>
            <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 8 }}>
              {aberto.chave === meu ? (
                <>
                  <T tam={13.5} centro cor={cores.bom}>Este é o seu mascote.</T>
                  <Botao tipo="discreto" titulo="Não mostrar mascote" aoPressionar={() => escolher(null)} carregando={salvando} />
                </>
              ) : (
                <Botao titulo="Usar como meu mascote" aoPressionar={() => escolher(aberto.chave)} carregando={salvando} />
              )}
            </View>
          </View>
        ) : null}
      </Folha>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  cartao: { padding: 16, borderRadius: 20, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  semMascote: { width: 72, height: 74, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: cores.linha2 },
  cabecaRaridade: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  celula: { width: '20%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'transparent', minHeight: 44 },
  qtd: { position: 'absolute', right: 4, bottom: 4, paddingHorizontal: 5, borderRadius: 8, backgroundColor: cores.destaqueForte },
  brilho: { position: 'absolute', width: 150, height: 150, borderRadius: 75, opacity: 0.22 },
}));
