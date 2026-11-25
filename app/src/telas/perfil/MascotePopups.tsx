/* As janelas da aba Coleção, todas em pixel art e no meio da tela (componentes/Pixel.tsx), desde 2026-11-19 (pedido do dono):
   - o mascote grande, com o nível e as ações, não é mais janela: desde 2026-11-25 é a tela em 3D (TelaMascote.tsx);
   - PopupLapis: o lápis da loja. Mostra todos os mascotes da conta; a pessoa escolhe um, digita o nome e confirma. Cada nome
     gasta um lápis (comprado na loja do site). O nome é só dela e passa pelo filtro de palavras do servidor;
   - PopupTroca: propor a troca de um repetido. A outra pessoa é achada pela @ ou pelo nome (Buscar) ou na lista de quem a
     conta segue (Seguindo); depois escolhe-se um repetido dela;
   - PopupPropostas: as propostas recebidas (aceitar ou recusar) e enviadas (cancelar).
   Só repetidos entram em troca, dos dois lados: ninguém fica sem um mascote que tinha (o servidor confere de novo no aceite). */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { darNome, lerRepetidosDe, lerTrocas, proporTroca, responderTroca, type Casa, type MascoteDaColecao, type Troca } from '../../api/mascotes';
import { buscarPessoas, lerSeguindo, type Pessoa } from '../../api/social';
import { Mascote } from '../../componentes/Mascote';
import { BotaoPixel, CampoPixel, ErroPixel, EstrelasPixel, LapisPixel, Moldura, PopupPixel, PX, TP } from '../../componentes/Pixel';
import { mascoteDe, TODOS_MASCOTES, type MascoteInfo } from '../../lib/mascotes';
import { SITE } from '../Login';

export type Tenho = Record<string, MascoteDaColecao>;
const erroDe = (e: unknown, padrao: string) => (e instanceof Error ? e.message : padrao);
const chaveDa = (c: Casa) => `${c.linha}-${c.coluna}`;
const arroba = (p: { nome: string; arroba: string | null }) => (p.arroba ? `@${p.arroba}` : p.nome);

/* um mascote numa linha: o desenho, uma legenda miúda, o nome e a raridade */
function LinhaMascote({ chave, legenda, nome }: { chave: string; legenda?: string; nome?: string | null }) {
  const m = mascoteDe(chave);
  if (!m) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Mascote chave={chave} tamanho={66} />
      <View style={{ flex: 1, gap: 3 }}>
        {legenda ? <TP tam={12.5} cor={PX.tinta2} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{legenda}</TP> : null}
        <TP tam={18} peso="500">{nome || m.nome}</TP>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <EstrelasPixel n={m.raridade.estrelas} cor={m.raridade.cor} />
          <TP tam={14} cor={m.raridade.cor}>{m.raridade.nome}</TP>
        </View>
      </View>
    </View>
  );
}

/* uma grade de mascotes para tocar (os da conta, ou os repetidos de outra pessoa) */
function Grade({ itens, aoEscolher }: { itens: { m: MascoteInfo; nome?: string | null; quantidade?: number }[]; aoEscolher: (m: MascoteInfo) => void }) {
  return (
    <View style={st.grade}>
      {itens.map(({ m, nome, quantidade }) => (
        <Pressable
          key={m.chave} onPress={() => aoEscolher(m)} accessibilityRole="button"
          accessibilityLabel={`${nome || m.nome}, ${m.raridade.nome}${quantidade && quantidade > 1 ? `, ${quantidade} iguais` : ''}`}
          style={({ pressed }) => [st.casa, pressed && { transform: [{ translateY: 2 }] }]}
        >
          <Moldura cor={m.raridade.cor} b={3}>
            <View style={st.casaDentro}>
              <Mascote chave={m.chave} tamanho={58} />
              <TP tam={12.5} centro linhas={2} style={{ lineHeight: 14 }}>{nome || m.nome}</TP>
              {quantidade && quantidade > 1 ? <View style={[st.qtd, { backgroundColor: m.raridade.cor }]}><TP tam={11.5} peso="500" cor={PX.contorno}>x{quantidade}</TP></View> : null}
            </View>
          </Moldura>
        </Pressable>
      ))}
    </View>
  );
}

/* ============================== o lápis: dar um nome ============================== */
type PopupLapisProps = { aberto: boolean; inicial: MascoteInfo | null; tenho: Tenho; lapis: number; aoFechar: () => void; aoRenomeado: (chave: string, nome: string, lapis: number) => void };
export function PopupLapis({ aberto, inicial, tenho, lapis, aoFechar, aoRenomeado }: PopupLapisProps) {
  const [escolhido, setEscolhido] = useState<MascoteInfo | null>(null);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState('');
  useEffect(() => { if (aberto) { setEscolhido(inicial); setNome(''); setErro(''); setFeito(''); } }, [aberto, inicial]);

  const meus = TODOS_MASCOTES.filter((m) => tenho[m.chave]);
  const limpo = nome.replace(/\s+/g, ' ').trim();
  const confirmar = async () => {
    if (!escolhido || enviando || limpo.length < 2) return;
    setErro(''); setEnviando(true);
    try {
      const r = await darNome(escolhido.chave, limpo);
      aoRenomeado(escolhido.chave, r.nome, r.lapis);
      setFeito(r.nome);
    } catch (e) {
      setErro(erroDe(e, 'Não foi possível dar o nome agora.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <PopupPixel aberto={aberto} aoFechar={aoFechar} titulo={feito ? 'Nome dado' : 'Lápis de nome'} largura={420}>
      {feito && escolhido ? (
        <>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Mascote chave={escolhido.chave} tamanho={130} />
            <TP tam={22} peso="500" cor={PX.ouroClaro} centro>{feito}</TP>
            <TP tam={15} cor={PX.tinta2} centro>É assim que o seu {escolhido.nome} se chama agora. Sobram {lapis} lápis.</TP>
          </View>
          <BotaoPixel titulo="Fechar" aoPressionar={aoFechar} />
        </>
      ) : lapis <= 0 ? (
        <>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <LapisPixel tamanho={96} />
            <TP tam={16} centro>Você não tem lápis.</TP>
            <TP tam={15} cor={PX.tinta2} centro style={{ lineHeight: 20 }}>O lápis dá um nome só seu a um mascote. Ele é vendido na loja do site e fica guardado na sua conta.</TP>
          </View>
          <BotaoPixel titulo="Abrir a loja" aoPressionar={() => { void Linking.openURL(`${SITE}/loja`); }} />
        </>
      ) : !escolhido ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <LapisPixel tamanho={52} />
            <TP tam={15.5} style={{ flex: 1, lineHeight: 20 }}>Você tem {lapis} lápis. Escolha o mascote que vai ganhar um nome só seu.</TP>
          </View>
          {meus.length ? <Grade itens={meus.map((m) => ({ m, nome: tenho[m.chave].nome }))} aoEscolher={(m) => { setEscolhido(m); setNome(''); setErro(''); }} /> : <TP tam={15} cor={PX.tinta2}>Você ainda não tem mascotes.</TP>}
        </>
      ) : (
        <>
          <LinhaMascote chave={escolhido.chave} legenda={tenho[escolhido.chave]?.nome ? 'Hoje se chama' : 'Vai ganhar um nome'} nome={tenho[escolhido.chave]?.nome} />
          <View style={{ gap: 6 }}>
            <TP tam={15}>Nome novo</TP>
            <CampoPixel
              value={nome} onChangeText={(v) => { setNome(v); setErro(''); }} maxLength={20} autoFocus autoCapitalize="words" autoCorrect={false}
              placeholder="De 2 a 20 letras" returnKeyType="done" onSubmitEditing={confirmar} accessibilityLabel="Nome novo do mascote"
            />
            <TP tam={13.5} cor={PX.tinta2}>Este nome gasta 1 lápis. Você tem {lapis}.</TP>
          </View>
          <ErroPixel texto={erro} />
          <BotaoPixel titulo={enviando ? 'Guardando...' : 'Confirmar'} aoPressionar={confirmar} desabilitado={limpo.length < 2} carregando={enviando} />
          <BotaoPixel tipo="escuro" titulo="Escolher outro" aoPressionar={() => { setEscolhido(null); setErro(''); }} />
        </>
      )}
    </PopupPixel>
  );
}

/* ============================== propor uma troca ============================== */
type Etapa = 'pessoa' | 'mascote' | 'confirmar' | 'feito';

function AbaPixel({ titulo, ativa, aoPressionar }: { titulo: string; ativa: boolean; aoPressionar: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: ativa }} onPress={aoPressionar} style={{ flex: 1 }}>
      <Moldura cor={ativa ? PX.ouro : PX.roxoLuz} b={3}>
        <View style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: ativa ? '#3a2a12' : PX.roxoSombra }}>
          <TP tam={15} peso={ativa ? '500' : '300'} cor={ativa ? PX.ouroClaro : PX.tinta2}>{titulo}</TP>
        </View>
      </Moldura>
    </Pressable>
  );
}

export function PopupTroca({ ofereco, meuId, aoFechar, aoEnviada }: { ofereco: MascoteInfo | null; meuId: number; aoFechar: () => void; aoEnviada: () => void }) {
  const [dado, setDado] = useState<MascoteInfo | null>(ofereco);   // o último oferecido fica na tela enquanto a janela some
  const [etapa, setEtapa] = useState<Etapa>('pessoa');
  const [aba, setAba] = useState<'buscar' | 'seguindo'>('buscar');
  const [busca, setBusca] = useState('');
  const [pessoas, setPessoas] = useState<Pessoa[] | null>(null);
  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [repetidos, setRepetidos] = useState<MascoteDaColecao[] | null>(null);
  const [peco, setPeco] = useState<MascoteInfo | null>(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!ofereco) return;
    setDado(ofereco); setEtapa('pessoa'); setAba('buscar'); setBusca(''); setPessoas([]); setPessoa(null); setRepetidos(null); setPeco(null); setErro('');
  }, [ofereco]);

  /* a lista de pessoas: a busca pela @ ou pelo nome (espera a pessoa parar de digitar) ou quem a conta segue */
  useEffect(() => {
    if (!ofereco || etapa !== 'pessoa') return undefined;
    let vale = true;
    const termo = busca.trim();
    if (aba === 'buscar' && !termo) { setPessoas([]); return undefined; }
    setPessoas(null);
    const id = setTimeout(() => {
      (aba === 'buscar' ? buscarPessoas(termo) : lerSeguindo(meuId))
        .then((r) => { if (vale) { setPessoas(r.itens.filter((p) => !p.voce)); setErro(''); } })
        .catch((e) => { if (vale) { setPessoas([]); setErro(erroDe(e, 'Não foi possível buscar agora.')); } });
    }, aba === 'buscar' ? 320 : 0);
    return () => { vale = false; clearTimeout(id); };
  }, [aba, busca, ofereco, etapa, meuId]);

  const escolherPessoa = async (p: Pessoa) => {
    setPessoa(p); setRepetidos(null); setErro(''); setEtapa('mascote');
    try {
      const r = await lerRepetidosDe(p.id);
      setRepetidos(r.mascotes.filter((m) => `${m.linha}-${m.coluna}` !== dado?.chave));
    } catch (e) {
      setErro(erroDe(e, 'Não foi possível ver os repetidos dessa pessoa.')); setRepetidos([]);
    }
  };
  const enviar = async () => {
    if (!dado || !pessoa || !peco || enviando) return;
    setErro(''); setEnviando(true);
    try {
      await proporTroca(pessoa.id, dado.chave, peco.chave);
      setEtapa('feito'); aoEnviada();
    } catch (e) {
      setErro(erroDe(e, 'Não foi possível enviar a proposta agora.'));
    } finally {
      setEnviando(false);
    }
  };

  if (!dado) return null;
  const dela = (repetidos ?? []).flatMap((x) => { const m = mascoteDe(`${x.linha}-${x.coluna}`); return m ? [{ m, quantidade: x.quantidade }] : []; });
  return (
    <PopupPixel aberto={ofereco !== null} aoFechar={aoFechar} titulo={etapa === 'feito' ? 'Proposta enviada' : 'Propor troca'} largura={420}>
      <LinhaMascote chave={dado.chave} legenda="Você dá" />
      <ErroPixel texto={erro} />

      {etapa === 'pessoa' ? (
        <>
          <TP tam={15.5}>Com quem você quer trocar?</TP>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <AbaPixel titulo="Buscar" ativa={aba === 'buscar'} aoPressionar={() => setAba('buscar')} />
            <AbaPixel titulo="Seguindo" ativa={aba === 'seguindo'} aoPressionar={() => setAba('seguindo')} />
          </View>
          {aba === 'buscar' ? (
            <CampoPixel value={busca} onChangeText={setBusca} placeholder="@ ou nome da pessoa" autoCapitalize="none" autoCorrect={false} maxLength={60} accessibilityLabel="Buscar pessoa pela arroba ou pelo nome" />
          ) : null}
          {pessoas === null ? <ActivityIndicator color={PX.ouro} style={{ marginVertical: 12 }} /> : pessoas.length === 0 ? (
            <TP tam={14.5} cor={PX.tinta2}>{aba === 'seguindo' ? 'Você ainda não segue ninguém.' : busca.trim() ? 'Ninguém com esse nome.' : 'Digite a @ ou o nome de quem você procura.'}</TP>
          ) : (
            <View style={{ gap: 6 }}>
              {pessoas.slice(0, 30).map((p) => (
                <Pressable key={p.id} onPress={() => escolherPessoa(p)} accessibilityRole="button" accessibilityLabel={`${p.nome}${p.arroba ? `, arroba ${p.arroba}` : ''}`} style={({ pressed }) => [st.pessoa, pressed && { backgroundColor: 'rgba(255,200,61,0.18)' }]}>
                  <TP tam={16} peso="500" linhas={1} style={{ flexShrink: 1 }}>{p.nome}</TP>
                  {p.arroba ? <TP tam={14} cor={PX.tinta2} linhas={1}>@{p.arroba}</TP> : null}
                </Pressable>
              ))}
            </View>
          )}
        </>
      ) : null}

      {etapa === 'mascote' && pessoa ? (
        <>
          <TP tam={15.5} style={{ lineHeight: 20 }}>Os repetidos de {arroba(pessoa)}. Escolha o que você quer receber.</TP>
          {repetidos === null ? <ActivityIndicator color={PX.ouro} style={{ marginVertical: 12 }} /> : dela.length === 0 ? (
            <TP tam={14.5} cor={PX.tinta2}>Essa pessoa não tem repetidos para trocar agora.</TP>
          ) : <Grade itens={dela} aoEscolher={(m) => { setPeco(m); setEtapa('confirmar'); }} />}
          <BotaoPixel tipo="escuro" titulo="Outra pessoa" aoPressionar={() => { setEtapa('pessoa'); setErro(''); }} />
        </>
      ) : null}

      {etapa === 'confirmar' && pessoa && peco ? (
        <>
          <LinhaMascote chave={peco.chave} legenda={`Você recebe de ${arroba(pessoa)}`} />
          <TP tam={14.5} cor={PX.tinta2} style={{ lineHeight: 19 }}>Os dois continuam com um de cada. A troca só acontece se {arroba(pessoa)} aceitar.</TP>
          <BotaoPixel titulo={enviando ? 'Enviando...' : 'Propor troca'} aoPressionar={enviar} carregando={enviando} />
          <BotaoPixel tipo="escuro" titulo="Voltar" aoPressionar={() => { setEtapa('mascote'); setErro(''); }} />
        </>
      ) : null}

      {etapa === 'feito' && pessoa && peco ? (
        <>
          <LinhaMascote chave={peco.chave} legenda={`Você pediu a ${arroba(pessoa)}`} />
          <TP tam={14.5} cor={PX.tinta2} style={{ lineHeight: 19 }}>{arroba(pessoa)} recebe um aviso nas notificações e responde em Coleção, Trocas.</TP>
          <BotaoPixel titulo="Fechar" aoPressionar={aoFechar} />
        </>
      ) : null}
    </PopupPixel>
  );
}

/* ============================== as propostas ============================== */
const ESTADO: Record<Troca['estado'], string> = { pendente: 'Esperando resposta', aceita: 'Troca feita', recusada: 'Recusada', cancelada: 'Cancelada' };

export function PopupPropostas({ aberto, aoFechar, aoMudou }: { aberto: boolean; aoFechar: () => void; aoMudou: () => void }) {
  const [trocas, setTrocas] = useState<Troca[] | null>(null);
  const [erro, setErro] = useState('');
  const [ocupada, setOcupada] = useState<number | null>(null);
  const carregar = useCallback(() => {
    lerTrocas().then((r) => setTrocas(r.trocas)).catch((e) => { setTrocas([]); setErro(erroDe(e, 'Não foi possível carregar as propostas.')); });
  }, []);
  useEffect(() => { if (aberto) { setErro(''); setTrocas(null); carregar(); } }, [aberto, carregar]);

  const responder = async (t: Troca, acao: 'aceitar' | 'recusar' | 'cancelar') => {
    if (ocupada !== null) return;
    setErro(''); setOcupada(t.id);
    try {
      await responderTroca(t.id, acao);
    } catch (e) {
      setErro(erroDe(e, 'Não foi possível responder agora.'));
    } finally {
      setOcupada(null); carregar(); aoMudou();   // os mascotes podem ter mudado de conta: a coleção lê de novo
    }
  };

  return (
    <PopupPixel aberto={aberto} aoFechar={aoFechar} titulo="Trocas" largura={420}>
      <TP tam={14.5} cor={PX.tinta2} style={{ lineHeight: 19 }}>Para propor uma troca, toque num mascote que você tem repetido (com o x2) e escolha "Propor troca".</TP>
      <ErroPixel texto={erro} />
      {trocas === null ? <ActivityIndicator color={PX.ouro} style={{ marginVertical: 16 }} /> : trocas.length === 0 ? (
        <TP tam={15}>Nenhuma proposta ainda.</TP>
      ) : trocas.map((t) => (
        <Moldura key={t.id} cor={t.estado === 'pendente' ? PX.ouro : PX.roxoLuz} b={3}>
          <View style={{ backgroundColor: PX.noite2, padding: 12, gap: 10 }}>
            <View style={{ gap: 2 }}>
              <TP tam={15.5}>{t.recebida ? `${arroba(t.pessoa)} quer trocar com você` : `Você propôs a ${arroba(t.pessoa)}`}</TP>
              <TP tam={12.5} cor={t.estado === 'aceita' ? PX.verde : PX.tinta2} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{ESTADO[t.estado]}</TP>
            </View>
            <LinhaMascote chave={chaveDa(t.dou)} legenda={t.estado === 'aceita' ? 'Você deu' : 'Você dá'} />
            <LinhaMascote chave={chaveDa(t.recebo)} legenda={t.estado === 'aceita' ? 'Você recebeu' : 'Você recebe'} />
            {t.estado === 'pendente' ? (
              t.recebida ? (
                <View style={{ gap: 6 }}>
                  <BotaoPixel titulo="Aceitar" aoPressionar={() => responder(t, 'aceitar')} carregando={ocupada === t.id} />
                  <BotaoPixel tipo="escuro" titulo="Recusar" aoPressionar={() => responder(t, 'recusar')} desabilitado={ocupada === t.id} />
                </View>
              ) : <BotaoPixel tipo="escuro" titulo="Cancelar proposta" aoPressionar={() => responder(t, 'cancelar')} carregando={ocupada === t.id} />
            ) : null}
          </View>
        </Moldura>
      ))}
    </PopupPixel>
  );
}

const st = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  casa: { width: '31%', minWidth: 96, flexGrow: 1, maxWidth: 130 },
  casaDentro: { alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 4, backgroundColor: PX.noite2, minHeight: 104 },
  qtd: { position: 'absolute', right: 3, top: 3, paddingHorizontal: 4, paddingVertical: 1 },
  pessoa: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
});
