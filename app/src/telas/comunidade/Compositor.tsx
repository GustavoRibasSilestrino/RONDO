/* Nova publicação em tela cheia: Cancelar e Publicar no alto; o destino (feed geral ou um dos seus clubes); um SUBTÍTULO (o
   assunto da publicação, gravado no campo `destaque`) e o texto; logo abaixo, só quatro ferramentas (pedido do dono, 2026-11-18):
   foto da galeria, câmera, treino (põe no texto o resumo de um treino concluído) e @ (busca uma pessoa e põe o @ dela no texto).
   Se a pessoa fechar sem publicar, o rascunho fica guardado até a próxima vez. */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buscarPessoas, listarClubes, publicarPost, type Pessoa } from '../../api/social';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, T } from '../../componentes/Ui';
import { volumeDe } from '../../lib/calc';
import { dataCurta, fmt } from '../../lib/datas';
import { arrobaDe } from './util';
import { useLista } from '../../estado/lista';
import { useLoja } from '../../estado/loja';
import { useConta } from '../../lib/beneficios';
import { useLayoutLargo } from '../../lib/largura';
import { enviarMidia, escolherMidia, removerMidia } from '../../lib/midia';
import { cores, larguraMax, FONTE, estilos } from '../../tema';
import type { Midia } from '../../tipos';
import { Avatar } from './Avatar';
import { Miniatura } from './Midia';
import { DeslizarParaVoltar } from '../../componentes/Deslizar';

const LIMITE_TEXTO = 600;
const LIMITE_SUBTITULO = 120;

export function Compositor({ aberto, aoFechar, grupoInicial }: { aberto: boolean; aoFechar: () => void; grupoInicial: number | null }) {
  const { estado, atualizarSocial } = useLoja();
  const avisar = useAviso();
  const insets = useSafeAreaInsets();
  const { largo } = useLayoutLargo();   // computador: as opções vão para os cantos da tela
  const meusGrupos = useLista((cursor) => listarClubes({ meus: true, antes: cursor }), [], aberto).itens;
  const nome = estado.usuario?.nome ?? 'Você';

  const [texto, setTexto] = useState('');
  const [subtitulo, setSubtitulo] = useState('');
  const [escolherTreino, setEscolherTreino] = useState(false);
  const [marcar, setMarcar] = useState(false);
  const [midia, setMidia] = useState<Midia[]>([]);
  const [destino, setDestino] = useState<number | null>(grupoInicial);
  const [origem, setOrigem] = useState<'galeria' | 'camera' | null>(null);   // qual botão está esperando o seletor
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  /* garantia de saída: o Modal só se desmonta quando o sistema avisa o fim da animação; passados 400 ms, sai de qualquer jeito */
  const [montada, setMontada] = useState(aberto);
  useEffect(() => {
    if (aberto) { setMontada(true); setDestino(grupoInicial); setErro(''); return undefined; }
    const t = setTimeout(() => setMontada(false), 400);
    return () => clearTimeout(t);
  }, [aberto, grupoInicial]);

  const pode = (texto.trim().length > 0 || subtitulo.trim().length > 0 || midia.length > 0) && origem === null && !enviando;
  const { limites } = useConta();
  const MAX_MIDIAS = limites.midias;
  const cheio = midia.length >= MAX_MIDIAS;

  const adicionar = async (de: 'galeria' | 'camera') => {
    if (cheio || origem) return;
    setErro('');
    setOrigem(de);
    try {
      const novos = await escolherMidia(de, MAX_MIDIAS - midia.length);
      setMidia((atual) => [...atual, ...novos].slice(0, MAX_MIDIAS));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível abrir a mídia agora. Tente de novo.');
    } finally {
      setOrigem(null);
    }
  };

  const tirar = (m: Midia) => {
    removerMidia([m.id]);
    setMidia((atual) => atual.filter((x) => x.id !== m.id));
  };

  const descartar = () => {
    removerMidia(midia.map((m) => m.id));
    setMidia([]);
    setTexto('');
    setSubtitulo('');
    setErro('');
  };

  /* põe um trecho no fim do texto (o resumo do treino, o @ de alguém), sem passar do limite */
  const acrescentar = (trecho: string, separador: string) =>
    setTexto((t) => (t.trim() ? `${t.replace(/\s+$/, '')}${separador}${trecho}` : trecho).slice(0, LIMITE_TEXTO));
  const treinos = [...estado.treinos].reverse().slice(0, 8);
  const resumoTreino = (t: (typeof treinos)[number]) => {
    const series = t.exercicios.reduce((n, x) => n + x.series.length, 0);
    const volume = t.exercicios.reduce((n, x) => n + volumeDe(x.series), 0);
    const min = Math.max(1, Math.round((t.fim - t.inicio) / 60000));
    return `${t.nome} · ${series} séries · ${fmt(volume / 1000, 1)} t · ${min} min`;
  };

  const publicar = async () => {
    if (!pode) return;
    setEnviando(true);
    setErro('');
    try {
      const enviadas = [];
      for (const m of midia) enviadas.push(await enviarMidia(m));   // sobe as fotos antes, para os outros verem
      await publicarPost({ texto: texto.trim(), destaque: subtitulo.trim() || undefined, midia: enviadas.length ? enviadas : undefined, clubeId: destino });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível publicar agora. Tente de novo.');
      setEnviando(false);
      return;
    }
    setEnviando(false);
    setTexto('');
    setSubtitulo('');
    setMidia([]);
    aoFechar();
    void atualizarSocial(true);
    avisar(destino ? 'Publicado no clube.' : 'Publicado no feed.');
  };

  if (!montada && !aberto) return null;
  const rascunho = texto.length > 0 || subtitulo.length > 0 || midia.length > 0;

  const botaoFechar = (
    <Pressable accessibilityRole="button" accessibilityLabel="Cancelar e fechar" onPress={aoFechar} hitSlop={10} style={({ pressed }) => [st.cancelar, pressed && { opacity: 0.6 }]}>
      <T tam={largo ? 16 : 15} peso="400">Cancelar</T>
    </Pressable>
  );
  const botaoPublicar = <Botao pequeno titulo="Publicar" aoPressionar={publicar} desabilitado={!pode} carregando={enviando} />;
  const ferramentas = (
    <>
      <Ferramenta grande={largo} icone="imagem" rotulo="Foto ou vídeo da galeria" ocupado={origem === 'galeria'} desabilitado={cheio || origem === 'camera'} aoTocar={() => adicionar('galeria')} />
      <Ferramenta grande={largo} icone="camera" rotulo="Câmera" ocupado={origem === 'camera'} desabilitado={cheio || origem === 'galeria'} aoTocar={() => adicionar('camera')} />
      <Ferramenta grande={largo} icone="halter" rotulo="Adicionar um treino" ocupado={false} desabilitado={false} aoTocar={() => { if (treinos.length) setEscolherTreino(true); else avisar('Você ainda não concluiu nenhum treino.'); }} />
      <Ferramenta grande={largo} icone="arroba" rotulo="Marcar alguém" ocupado={false} desabilitado={false} aoTocar={() => setMarcar(true)} />
    </>
  );

  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <DeslizarParaVoltar aoVoltar={aoFechar}>
      <View style={st.tela}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%', maxWidth: larguraMax }}>
          <View style={[st.coluna, { paddingTop: insets.top + 10 }]}>
            <View style={st.barra}>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>{largo ? null : botaoFechar}</View>
              <T tam={16} peso="500" linhas={1} style={{ flexShrink: 1, paddingHorizontal: 8 }}>Nova publicação</T>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>{largo ? null : botaoPublicar}</View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={st.corpo} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={st.autor}>
                <Avatar nome={nome} voce tamanho={44} />
                <View style={{ flex: 1 }}>
                  <T tam={16} peso="500">{nome}</T>
                  <T tam={12.5} cor={cores.texto2}>Publicar em</T>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.destinos} keyboardShouldPersistTaps="handled">
                <Destino nome="Feed geral" ativo={destino === null} aoTocar={() => setDestino(null)} />
                {meusGrupos.map((g) => <Destino key={g.id} nome={g.nome} ativo={destino === g.id} aoTocar={() => setDestino(g.id)} />)}
              </ScrollView>

              <TextInput
                value={subtitulo}
                onChangeText={setSubtitulo}
                maxLength={LIMITE_SUBTITULO}
                placeholder="Adicione um subtítulo"
                placeholderTextColor={cores.placeholder}
                selectionColor={cores.destaque}
                accessibilityLabel="Subtítulo da publicação"
                returnKeyType="next"
                style={st.subtitulo}
              />
              <TextInput
                value={texto}
                onChangeText={setTexto}
                multiline
                maxLength={LIMITE_TEXTO}
                placeholder="O que você fez hoje?"
                placeholderTextColor={cores.placeholder}
                selectionColor={cores.destaque}
                accessibilityLabel="Texto da publicação"
                style={st.texto}
              />
              {/* as ferramentas, logo abaixo do texto: foto, câmera, treino e @ */}
              {largo ? null : (
                <View style={st.linhaFerramentas}>
                  {ferramentas}
                  <View style={{ flex: 1 }} />
                  <T tam={11.5} mono cor={texto.length > LIMITE_TEXTO - 40 ? cores.alerta : cores.texto3}>{texto.length}/{LIMITE_TEXTO}</T>
                </View>
              )}

              {midia.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.miniaturas} keyboardShouldPersistTaps="handled">
                  {midia.map((m) => (
                    <View key={m.id} style={st.tile}>
                      <Miniatura m={m} style={{ width: 132, height: 132, borderRadius: 16 }} />
                      <Pressable accessibilityRole="button" accessibilityLabel="Remover da publicação" onPress={() => tirar(m)} hitSlop={8} style={st.x}>
                        <Icone nome="fechar" tamanho={14} cor="#ffffff" />
                      </Pressable>
                    </View>
                  ))}
                  {!cheio ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Adicionar mais fotos ou vídeos" onPress={() => adicionar('galeria')} style={st.mais}>
                      <Icone nome="mais" tamanho={26} cor={cores.destaque2} />
                    </Pressable>
                  ) : null}
                </ScrollView>
              ) : null}

              {erro ? (
                <View style={st.erro} accessibilityLiveRegion="polite" accessibilityRole="alert">
                  <Icone nome="alerta" tamanho={16} cor={cores.erro} />
                  <T tam={13} cor={cores.erro} style={{ flex: 1, lineHeight: 18 }}>{erro}</T>
                </View>
              ) : null}

              {rascunho ? (
                <Pressable accessibilityRole="button" onPress={descartar} style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
                  <T tam={13} cor={cores.texto2} style={{ textDecorationLine: 'underline' }}>Descartar rascunho</T>
                </Pressable>
              ) : null}
            </ScrollView>

          </View>
        </KeyboardAvoidingView>

        {/* computador: as opções ficam nos cantos da tela. Fechar e Publicar no alto; fotos, câmera e o contador embaixo, à esquerda */}
        {largo ? (
          <>
            <View style={[st.cantoEsq, { top: insets.top + 24 }]}>{botaoFechar}</View>
            <View style={[st.cantoDir, { top: insets.top + 24 }]}>{botaoPublicar}</View>
            <View style={[st.cantoBaixo, { bottom: insets.bottom + 24 }]}>
              {ferramentas}
              <T tam={13.5} cor={cores.texto3} style={{ marginLeft: 8 }}>{midia.length} de {MAX_MIDIAS}</T>
            </View>
          </>
        ) : null}
      </View>
      </DeslizarParaVoltar>

      {/* treino: um dos últimos concluídos vira uma linha no texto */}
      <Folha aberta={escolherTreino} aoFechar={() => setEscolherTreino(false)} titulo="Adicionar um treino">
        <View style={{ gap: 8, paddingBottom: 4 }}>
          {treinos.map((t, i) => (
            <Pressable key={`${t.inicio}-${i}`} accessibilityRole="button" onPress={() => { acrescentar(resumoTreino(t), '\n\n'); setEscolherTreino(false); }} style={({ pressed }) => [st.opcaoTreino, pressed && { opacity: 0.7 }]}>
              <Icone nome="halter" tamanho={20} cor={cores.texto} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T tam={15} peso="500" linhas={1}>{t.nome}</T>
                <T tam={12.5} cor={cores.texto2} linhas={1}>{dataCurta(t.data)} · {resumoTreino(t).split(' · ').slice(1).join(' · ')}</T>
              </View>
            </Pressable>
          ))}
        </View>
      </Folha>

      <MarcarPessoa aberta={marcar} aoFechar={() => setMarcar(false)} aoEscolher={(p) => { acrescentar(`@${p.arroba ?? arrobaDe(p.nome)} `, ' '); setMarcar(false); }} />
    </Modal>
  );
}

/* @: busca a pessoa pelo nome ou pelo @ e põe o @ dela no texto */
function MarcarPessoa({ aberta, aoFechar, aoEscolher }: { aberta: boolean; aoFechar: () => void; aoEscolher: (p: Pessoa) => void }) {
  const [q, setQ] = useState('');
  const [achadas, setAchadas] = useState<Pessoa[]>([]);
  const [buscando, setBuscando] = useState(false);
  useEffect(() => { if (!aberta) { setQ(''); setAchadas([]); } }, [aberta]);
  useEffect(() => {
    const termo = q.trim().replace(/^@/, '');
    if (termo.length < 2) { setAchadas([]); return undefined; }
    let vivo = true;
    setBuscando(true);
    const t = setTimeout(() => {
      buscarPessoas(termo)
        .then((r) => { if (vivo) setAchadas(r.itens.filter((p) => !p.voce)); })
        .catch(() => { if (vivo) setAchadas([]); })
        .finally(() => { if (vivo) setBuscando(false); });
    }, 250);
    return () => { vivo = false; clearTimeout(t); };
  }, [q]);
  const termo = q.trim().replace(/^@/, '');
  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Marcar alguém">
      <View style={st.busca}>
        <Icone nome="arroba" tamanho={18} cor={cores.texto2} />
        <TextInput value={q} onChangeText={setQ} autoFocus autoCapitalize="none" autoCorrect={false} placeholder="Nome ou @" placeholderTextColor={cores.placeholder} selectionColor={cores.destaque} accessibilityLabel="Buscar pessoa para marcar" style={st.buscaCampo} />
      </View>
      <View style={{ gap: 4, marginTop: 10, minHeight: 60 }}>
        {achadas.map((p) => (
          <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Marcar ${p.nome}`} onPress={() => aoEscolher(p)} style={({ pressed }) => [st.pessoa, pressed && { opacity: 0.7 }]}>
            <Avatar nome={p.nome} tamanho={36} foto={p.foto ?? undefined} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T tam={14.5} peso="500" linhas={1}>{p.nome}</T>
              <T tam={12.5} cor={cores.texto2} linhas={1}>@{p.arroba ?? arrobaDe(p.nome)}</T>
            </View>
          </Pressable>
        ))}
        {termo.length >= 2 && !buscando && !achadas.length ? <T tam={13} cor={cores.texto2}>Ninguém encontrado.</T> : null}
        {termo.length < 2 ? <T tam={13} cor={cores.texto2}>Digite pelo menos 2 letras do nome ou do @.</T> : null}
      </View>
    </Folha>
  );
}

function Destino({ nome, ativo, aoTocar }: { nome: string; ativo: boolean; aoTocar: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={aoTocar} style={[st.destino, ativo && st.destinoAtivo]}>
      <T tam={13} peso={ativo ? '500' : '300'} cor={ativo ? '#ffffff' : cores.texto2}>{nome}</T>
    </Pressable>
  );
}

function Ferramenta({ icone, rotulo, ocupado, desabilitado, aoTocar, grande }: { icone: 'imagem' | 'camera' | 'halter' | 'arroba'; rotulo: string; ocupado: boolean; desabilitado: boolean; aoTocar: () => void; grande?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado, busy: ocupado }}
      disabled={desabilitado}
      onPress={aoTocar}
      style={[st.ferramenta, grande && st.ferramentaGrande, { opacity: desabilitado ? 0.4 : 1 }]}
    >
      <Icone nome={icone} tamanho={grande ? 26 : 23} cor={ocupado ? cores.texto3 : cores.destaque2} />
    </Pressable>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  circulo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2, borderWidth: 1, borderColor: cores.linha },
  cancelar: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  subtitulo: { color: cores.texto, fontSize: 19, fontFamily: FONTE['500'], paddingVertical: 6, outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  linhaFerramentas: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginTop: 4, borderTopWidth: 1, borderTopColor: cores.linha },
  opcaoTreino: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  busca: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14, borderRadius: 23, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  buscaCampo: { flex: 1, minWidth: 0, height: 46, color: cores.texto, fontSize: 15, fontFamily: FONTE['300'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  pessoa: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, minHeight: 48 },
  corpo: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  autor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  destinos: { gap: 8, paddingVertical: 16 },
  destino: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  destinoAtivo: { backgroundColor: cores.acao, borderColor: cores.acao },   // escolhido: o violeta de ação
  texto: { minHeight: 110, color: cores.texto, fontSize: 21, fontFamily: FONTE['200'], lineHeight: 30, textAlignVertical: 'top', paddingVertical: 4, outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  miniaturas: { gap: 10, paddingTop: 16, paddingBottom: 8 },
  tile: { width: 132, height: 132 },
  x: { position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17122a', borderWidth: 1, borderColor: cores.linha2 },
  mais: { width: 132, height: 132, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(196,168,255,0.4)', backgroundColor: `rgba(${cores.tom},0.06)` },
  erro: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,107,129,0.35)', backgroundColor: 'rgba(255,107,129,0.08)' },
  ferramentas: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: cores.linha, backgroundColor: 'rgba(5,5,7,0.96)' },
  circuloGrande: { width: 56, height: 56, borderRadius: 28 },
  publicarGrande: { height: 50, paddingHorizontal: 28, borderRadius: 25 },
  ferramentaGrande: { width: 58, height: 58, borderRadius: 29 },
  cantoEsq: { position: 'absolute', left: 28 },
  cantoDir: { position: 'absolute', right: 28 },
  cantoBaixo: { position: 'absolute', left: 28, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ferramenta: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
}));
