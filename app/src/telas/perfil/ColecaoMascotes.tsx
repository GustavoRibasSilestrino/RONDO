/* A aba Coleção do perfil (desde 2026-11-19, no lugar das medalhas): os 66 mascotes, os que a conta já tem em cor e os que
   faltam só em silhueta, por raridade. Tocar num mascote da coleção mostra ele grande e deixa escolher qual a conta mostra
   (ao lado da foto, nas publicações e passeando pelo app). As missões, que dão os brownies, ficam em "Ver missões".
   Desde 2026-11-19 (pedido do dono): o mascote abre numa janela em pixel art no meio da tela (antes subia de baixo); o
   LÁPIS (comprado na loja do site) dá um nome próprio a um mascote; e os repetidos entram em TROCA com outra pessoa, achada
   pela @ ou entre quem a conta segue. As janelas estão em MascotePopups.tsx e as peças de pixel em componentes/Pixel.tsx.
   Desde 2026-11-23 (pedido do dono): cada mascote liberado tem uma BARRA DE NÍVEL em cima dele; ela enche com o XP de cada
   treino e de cada missão cumprida depois de ele entrar na coleção (lib/nivelMascote.ts). */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { escolherMascote, lerColecao, type MascoteDaColecao } from '../../api/mascotes';
import { useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Mascote } from '../../componentes/Mascote';
import { LapisPixel, Moldura, PX, TP } from '../../componentes/Pixel';
import { Barra, Botao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { fmt } from '../../lib/datas';
import { mascoteDe, RARIDADES, TODOS_MASCOTES, TOTAL_MASCOTES, type MascoteInfo } from '../../lib/mascotes';
import { missoesDe } from '../../lib/missoes';
import { progressoNivel, xpTotal } from '../../lib/nivel';
import { progressoMascote, XP_MASCOTE, xpDoMascote } from '../../lib/nivelMascote';
import { cores, estilos } from '../../tema';
import { PopupLapis, PopupMascote, PopupPropostas, PopupTroca } from './MascotePopups';
import { lerTrocas } from '../../api/mascotes';

export function ColecaoMascotes({ aoVerMissoes }: { aoVerMissoes: () => void }) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const [tenho, setTenho] = useState<Record<string, MascoteDaColecao> | null>(null);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState<MascoteInfo | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [lapis, setLapis] = useState(0);                                  // lápis guardados na conta
  const [lapisAberto, setLapisAberto] = useState(false);                  // a janela do lápis
  const [paraNomear, setParaNomear] = useState<MascoteInfo | null>(null); // o mascote já escolhido ao abrir o lápis
  const [paraTrocar, setParaTrocar] = useState<MascoteInfo | null>(null); // o repetido oferecido na troca
  const [propostas, setPropostas] = useState(false);                      // a janela das propostas
  const [esperando, setEsperando] = useState(0);                          // propostas que esperam a resposta desta conta
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
      setLapis(c.lapis ?? 0);
      lerTrocas().then((r) => setEsperando(r.pendentes_recebidas)).catch(() => undefined);
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
      commit((e) => { if (e.usuario) { e.usuario.mascote = chave; e.usuario.mascoteNome = chave ? tenho?.[chave]?.nome ?? null : null; } });
      avisar(chave ? `${tenho?.[chave]?.nome ?? mascoteDe(chave)?.nome} agora é o seu mascote.` : 'O seu mascote não aparece mais.');
      setAberto(null);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível trocar agora.');
    } finally {
      setSalvando(false);
    }
  };
  const meuInfo = mascoteDe(meu);
  /* o nível de um mascote da coleção: o XP dos treinos e das missões cumpridos desde que ele chegou */
  const nivelDo = (chave: string) => progressoMascote(xpDoMascote(estado, tenho?.[chave]));
  const meuNivel = meuInfo && tenho?.[meuInfo.chave] ? nivelDo(meuInfo.chave) : null;
  const meuNome = meuInfo ? tenho?.[meuInfo.chave]?.nome ?? meuInfo.nome : '';   // o nome próprio, se a pessoa deu um
  const repetidos = tenho ? Object.values(tenho).filter((m) => m.quantidade > 1).length : 0;

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
          <T tam={17} peso="500" style={{ marginTop: 2 }}>{meuInfo ? meuNome : n ? 'Nenhum escolhido' : 'Ainda sem mascote'}</T>
          <T tam={12.5} style={{ marginTop: 3, lineHeight: 18 }}>
            {meuInfo ? `${meuInfo.raridade.nome}. Aparece ao lado da sua foto, nas suas publicações e passeia pelo app.` : n ? 'Toque num mascote da coleção para ele andar com você.' : 'Cumpra uma missão ou suba de nível para ganhar o seu primeiro brownie.'}
          </T>
          {meuInfo && meuNivel ? (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <T tam={13.5} peso="500" cor={cores.texto}>Nível {meuNivel.nivel}</T>
                <T tam={12}>{fmt(meuNivel.noNivel)}/{fmt(meuNivel.tamanho)} XP</T>
              </View>
              <Barra valor={meuNivel.noNivel} max={meuNivel.tamanho} cor={meuInfo.raridade.cor} />
            </View>
          ) : null}
        </View>
      </View>

      {/* o lápis e as trocas, em pixel art como a loja: o lápis abre a lista dos mascotes para dar um nome; as trocas, as propostas */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Lápis de nome: você tem ${lapis}. Dar um nome a um mascote`} onPress={() => { setParaNomear(null); setLapisAberto(true); }} style={({ pressed }) => [{ flex: 1 }, pressed && { transform: [{ translateY: 2 }] }]}>
          <Moldura cor={PX.contorno}>
            <Moldura cor={PX.madeiraClara} b={3}>
              <View style={st.pixelCartao}>
                <LapisPixel tamanho={42} />
                <View style={{ flex: 1 }}>
                  <TP tam={15.5} peso="500" cor={PX.ouroClaro}>Lápis</TP>
                  <TP tam={13.5} cor={PX.tinta2}>{lapis ? `Você tem ${lapis}` : 'Dê um nome'}</TP>
                </View>
              </View>
            </Moldura>
          </Moldura>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Trocas de mascotes repetidos${esperando ? `: ${esperando} esperando a sua resposta` : ''}`} onPress={() => setPropostas(true)} style={({ pressed }) => [{ flex: 1 }, pressed && { transform: [{ translateY: 2 }] }]}>
          <Moldura cor={PX.contorno}>
            <Moldura cor={esperando ? PX.ouro : PX.madeiraClara} b={3}>
              <View style={st.pixelCartao}>
                <View style={{ flex: 1 }}>
                  <TP tam={15.5} peso="500" cor={PX.ouroClaro}>Trocas</TP>
                  <TP tam={13.5} cor={esperando ? PX.verde : PX.tinta2}>{esperando ? `${esperando} esperando você` : repetidos ? `${repetidos} ${repetidos === 1 ? 'repetido' : 'repetidos'}` : 'Sem repetidos'}</TP>
                </View>
              </View>
            </Moldura>
          </Moldura>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <T tam={18} peso="500">Coleção</T>
        <T tam={13}>{n} de {TOTAL_MASCOTES}</T>
      </View>
      <Barra valor={n} max={TOTAL_MASCOTES} cor={cores.destaque2} />
      <T tam={12.5} style={{ lineHeight: 18 }}>
        Todo mascote liberado sobe de nível: ganha {XP_MASCOTE.treino} XP a cada treino e {XP_MASCOTE.missao} XP a cada missão que você cumpre depois de ele chegar.
      </T>

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
                  const pm = tem ? nivelDo(m.chave) : null;
                  return (
                    <Pressable
                      key={m.chave} disabled={!tem} onPress={() => setAberto(m)}
                      accessibilityRole="button" accessibilityLabel={tem ? `${tenho[m.chave].nome ?? m.nome}, ${r.nome}, nível ${pm?.nivel ?? 1}${ehMeu ? ', o seu mascote' : ''}` : `Mascote nº ${m.numero}, ainda não tem`}
                      style={({ pressed }) => [st.celula, ehMeu && { borderColor: r.cor, backgroundColor: 'rgba(255,255,255,0.06)' }, pressed && { opacity: 0.7 }]}
                    >
                      {/* a barra de nível, em cima de cada mascote liberado (os que faltam ficam com o espaço vazio, alinhados) */}
                      {pm ? (
                        <View style={st.nivel}>
                          <T tam={10} peso="500" cor={cores.texto2}>Nv {pm.nivel}</T>
                          <View style={st.nivelTrilho}><View style={{ width: `${Math.round(pm.p * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: r.cor }} /></View>
                        </View>
                      ) : <View style={st.nivelVazio} />}
                      <Mascote chave={m.chave} tamanho={48} apagado={!tem} />
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

      {/* o mascote, grande, numa janela em pixel art no meio da tela */}
      <PopupMascote
        mascote={aberto} item={aberto ? tenho?.[aberto.chave] : undefined} ehMeu={!!aberto && aberto.chave === meu} salvando={salvando} lapis={lapis}
        xp={aberto ? xpDoMascote(estado, tenho?.[aberto.chave]) : 0}
        aoFechar={() => setAberto(null)} aoUsar={escolher}
        aoDarNome={(m) => { setAberto(null); setParaNomear(m); setLapisAberto(true); }}
        aoTrocar={(m) => { setAberto(null); setParaTrocar(m); }}
      />
      <PopupLapis
        aberto={lapisAberto} inicial={paraNomear} tenho={tenho ?? {}} lapis={lapis} aoFechar={() => setLapisAberto(false)}
        aoRenomeado={(chave, nome, sobram) => {
          setLapis(sobram);
          setTenho((t) => (t && t[chave] ? { ...t, [chave]: { ...t[chave], nome } } : t));
          if (chave === meu) commit((e) => { if (e.usuario) e.usuario.mascoteNome = nome; });   // o balão e o perfil já mostram o nome novo
        }}
      />
      <PopupTroca ofereco={paraTrocar} meuId={estado.social.id} aoFechar={() => setParaTrocar(null)} aoEnviada={() => undefined} />
      <PopupPropostas aberto={propostas} aoFechar={() => setPropostas(false)} aoMudou={() => { void carregar(); }} />
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  cartao: { padding: 16, borderRadius: 20, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  semMascote: { width: 72, height: 74, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: cores.linha2 },
  cabecaRaridade: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  celula: { width: '20%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'transparent', minHeight: 44, marginBottom: 10 },
  qtd: { position: 'absolute', right: 4, bottom: 4, paddingHorizontal: 5, borderRadius: 8, backgroundColor: cores.destaqueForte },
  nivel: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 4, height: 13, paddingHorizontal: 6 },
  nivelTrilho: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: cores.linha2 },
  nivelVazio: { height: 13 },
  pixelCartao: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: PX.noite },
}));
