/* Nova publicação em tela cheia: barra com fechar e Publicar, texto grande, fotos e vídeos em destaque (até 4, galeria ou câmera)
   e o destino (feed geral ou um dos seus grupos). Se a pessoa fechar sem publicar, o rascunho fica guardado até a próxima vez. */
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { listarGrupos } from '../../lib/grupos';
import { escolherMidia, MAX_MIDIAS, removerMidia } from '../../lib/midia';
import { cores, larguraMax, FONTE } from '../../tema';
import type { Midia } from '../../tipos';
import { Avatar } from './Avatar';
import { Miniatura } from './Midia';

const LIMITE_TEXTO = 600;

export function Compositor({ aberto, aoFechar, grupoInicial }: { aberto: boolean; aoFechar: () => void; grupoInicial: string | null }) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const insets = useSafeAreaInsets();
  const meusGrupos = listarGrupos(estado).filter((g) => g.meu);
  const nome = estado.usuario?.nome ?? 'Você';

  const [texto, setTexto] = useState('');
  const [midia, setMidia] = useState<Midia[]>([]);
  const [destino, setDestino] = useState<string | null>(grupoInicial);
  const [origem, setOrigem] = useState<'galeria' | 'camera' | null>(null);   // qual botão está esperando o seletor
  const [erro, setErro] = useState('');

  /* garantia de saída: o Modal só se desmonta quando o sistema avisa o fim da animação; passados 400 ms, sai de qualquer jeito */
  const [montada, setMontada] = useState(aberto);
  useEffect(() => {
    if (aberto) { setMontada(true); setDestino(grupoInicial); setErro(''); return undefined; }
    const t = setTimeout(() => setMontada(false), 400);
    return () => clearTimeout(t);
  }, [aberto, grupoInicial]);

  const pode = (texto.trim().length > 0 || midia.length > 0) && origem === null;
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
    setErro('');
  };

  const publicar = () => {
    if (!pode) return;
    const post = { id: `u${Date.now()}`, autor: 'Você', texto: texto.trim(), quando: Date.now(), midia: midia.length ? midia : undefined, grupo: destino ?? undefined };
    commit((e) => { e.posts.unshift(post); });
    setTexto('');
    setMidia([]);
    setErro('');
    aoFechar();
    avisar(destino ? 'Publicado no clube.' : 'Publicado no feed.');
  };

  if (!montada && !aberto) return null;
  const rascunho = texto.length > 0 || midia.length > 0;

  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.tela}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%', maxWidth: larguraMax }}>
          <View style={[st.coluna, { paddingTop: insets.top + 10 }]}>
            <View style={st.barra}>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} hitSlop={8} style={st.circulo}>
                  <Icone nome="fechar" tamanho={21} cor={cores.texto} />
                </Pressable>
              </View>
              <T tam={17} peso="300">Nova publicação</T>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !pode }}
                  disabled={!pode}
                  onPress={publicar}
                  style={[st.publicar, !pode && { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                >
                  <T tam={14} peso="500" cor={pode ? '#ffffff' : cores.texto3}>Publicar</T>
                </Pressable>
              </View>
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
                value={texto}
                onChangeText={setTexto}
                multiline
                maxLength={LIMITE_TEXTO}
                autoFocus
                placeholder="Compartilhe um treino, uma refeição, uma conquista…"
                placeholderTextColor={cores.placeholder}
                selectionColor={cores.destaque}
                accessibilityLabel="Texto da publicação"
                style={st.texto}
              />
              <T tam={11.5} mono cor={texto.length > LIMITE_TEXTO - 40 ? cores.alerta : cores.texto3} style={{ alignSelf: 'flex-end' }}>{texto.length}/{LIMITE_TEXTO}</T>

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

            <View style={[st.ferramentas, { paddingBottom: insets.bottom + 12 }]}>
              <Ferramenta icone="imagem" rotulo="Fotos e vídeos" ocupado={origem === 'galeria'} desabilitado={cheio || origem === 'camera'} aoTocar={() => adicionar('galeria')} />
              <Ferramenta icone="camera" rotulo="Câmera" ocupado={origem === 'camera'} desabilitado={cheio || origem === 'galeria'} aoTocar={() => adicionar('camera')} />
              <View style={{ flex: 1 }} />
              <T tam={12.5} cor={cores.texto3}>{midia.length} de {MAX_MIDIAS}</T>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Destino({ nome, ativo, aoTocar }: { nome: string; ativo: boolean; aoTocar: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={aoTocar} style={[st.destino, ativo && st.destinoAtivo]}>
      <T tam={13} peso={ativo ? '500' : '300'} cor={ativo ? '#ffffff' : cores.texto2}>{nome}</T>
    </Pressable>
  );
}

function Ferramenta({ icone, rotulo, ocupado, desabilitado, aoTocar }: { icone: 'imagem' | 'camera'; rotulo: string; ocupado: boolean; desabilitado: boolean; aoTocar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: desabilitado, busy: ocupado }}
      disabled={desabilitado}
      onPress={aoTocar}
      style={[st.ferramenta, { opacity: desabilitado ? 0.4 : 1 }]}
    >
      <Icone nome={icone} tamanho={24} cor={ocupado ? cores.texto3 : cores.destaque2} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  circulo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2, borderWidth: 1, borderColor: cores.linha },
  publicar: { height: 40, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  corpo: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },
  autor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  destinos: { gap: 8, paddingVertical: 16 },
  destino: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  destinoAtivo: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  texto: { minHeight: 150, color: cores.texto, fontSize: 21, fontFamily: FONTE['200'], lineHeight: 30, textAlignVertical: 'top', paddingVertical: 4, outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  miniaturas: { gap: 10, paddingTop: 16, paddingBottom: 8 },
  tile: { width: 132, height: 132 },
  x: { position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17122a', borderWidth: 1, borderColor: cores.linha2 },
  mais: { width: 132, height: 132, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(196,168,255,0.4)', backgroundColor: 'rgba(139,92,246,0.06)' },
  erro: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,107,129,0.35)', backgroundColor: 'rgba(255,107,129,0.08)' },
  ferramentas: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: cores.linha, backgroundColor: 'rgba(5,5,7,0.96)' },
  ferramenta: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,92,246,0.12)' },
});
