/* Criar um story: uma foto (galeria ou câmera) com legenda, ou um texto sobre um fundo colorido.
   Vai para o servidor: a foto sobe antes (enviarMidia) e o story guarda o endereço dela. */
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { publicarStory } from '../../api/social';
import { enviarMidia, escolherFoto, removerMidia, useUriMidia } from '../../lib/midia';
import { FUNDOS_STORY } from '../../lib/stories';
import { cores, estilos, FONTE, larguraMax } from '../../tema';
import type { Midia } from '../../tipos';
import { useAviso } from '../Estrutura';
import { Icone, NomeIcone } from '../Icone';
import { Botao, T } from '../Ui';

type Etapa = 'escolher' | 'foto' | 'texto';

function Previa({ id }: { id: string }) {
  const uri = useUriMidia(id);
  return uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors /> : null;
}

export function CriarStory({ aberto, aoFechar, aoPublicar }: { aberto: boolean; aoFechar: () => void; aoPublicar?: () => void }) {
  const insets = useSafeAreaInsets();
  const avisar = useAviso();
  const [enviando, setEnviando] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>('escolher');
  const [foto, setFoto] = useState<Midia | null>(null);
  const [legenda, setLegenda] = useState('');
  const [texto, setTexto] = useState('');
  const [fundo, setFundo] = useState(0);

  const limpar = (apagarFoto: boolean) => {
    if (apagarFoto && foto) removerMidia([foto.id]);   // desistiu: a foto escolhida não fica no aparelho
    setEtapa('escolher'); setFoto(null); setLegenda(''); setTexto(''); setFundo(0);
  };
  const fechar = () => { if (enviando) return; limpar(true); aoFechar(); };

  const escolher = async (origem: 'galeria' | 'camera') => {
    try {
      const m = await escolherFoto(origem, [9, 16]);
      if (!m) return;
      if (foto) removerMidia([foto.id]);
      setFoto(m); setEtapa('foto');
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível abrir as fotos.');
    }
  };

  const publicar = async () => {
    if (enviando) return;
    const comFoto = etapa === 'foto' && !!foto;
    if (!comFoto && !(etapa === 'texto' && texto.trim())) return;
    setEnviando(true);
    try {
      if (comFoto && foto) {
        const enviada = await enviarMidia(foto);   // a foto sobe primeiro; o story guarda o endereço dela
        await publicarStory({ midia: enviada, legenda: legenda.trim() || undefined });
      } else {
        await publicarStory({ texto: texto.trim(), fundo });
      }
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível publicar agora. Tente de novo.');
      return;
    } finally {
      setEnviando(false);
    }
    avisar('Story publicado. Fica no ar por 24 horas.');
    limpar(false);   // a foto continua no aparelho: o seu story abre mais rápido
    aoPublicar?.();
    aoFechar();
  };

  const Opcao = ({ icone, titulo, sub, aoPressionar }: { icone: NomeIcone; titulo: string; sub: string; aoPressionar: () => void }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={titulo} onPress={aoPressionar} style={({ pressed }) => [st.opcao, pressed && { opacity: 0.85 }]}>
      <View style={st.icone}><Icone nome={icone} tamanho={22} cor="#ffffff" /></View>
      <View style={{ flex: 1 }}>
        <T tam={15.5} peso="500">{titulo}</T>
        <T tam={13} style={{ marginTop: 2 }}>{sub}</T>
      </View>
    </Pressable>
  );

  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={fechar} statusBarTranslucent>
      <View style={[st.tela, etapa === 'texto' && { backgroundColor: FUNDOS_STORY[fundo] }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.coluna}>
          <View style={[st.topo, { paddingTop: insets.top + 8 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={etapa === 'escolher' ? 'Fechar' : 'Voltar'} onPress={() => { if (enviando) return; if (etapa === 'escolher') fechar(); else limpar(true); }} style={st.botaoTopo}>
              <Icone nome={etapa === 'escolher' ? 'fechar' : 'voltar'} tamanho={22} cor="#ffffff" />
            </Pressable>
            <T tam={16} peso="500" style={{ flex: 1 }}>Novo story</T>
          </View>

          {etapa === 'escolher' ? (
            <View style={{ padding: 20, gap: 12 }}>
              <Opcao icone="imagem" titulo="Foto da galeria" sub="Escolha uma foto em pé, de 9 por 16." aoPressionar={() => escolher('galeria')} />
              {Platform.OS !== 'web' ? <Opcao icone="camera" titulo="Câmera" sub="Tire uma foto agora." aoPressionar={() => escolher('camera')} /> : null}
              <Opcao icone="comentario" titulo="Texto" sub="Escreva algo sobre um fundo colorido." aoPressionar={() => setEtapa('texto')} />
              <T tam={12.5} centro style={{ marginTop: 8, lineHeight: 18 }}>O story fica no ar por 24 horas.</T>
            </View>
          ) : null}

          {etapa === 'foto' && foto ? (
            <View style={{ flex: 1, padding: 16, gap: 12 }}>
              <View style={st.moldura}><Previa id={foto.id} /></View>
              <TextInput value={legenda} onChangeText={setLegenda} placeholder="Escreva uma legenda (opcional)" placeholderTextColor={cores.placeholder} selectionColor={cores.destaque} maxLength={120} accessibilityLabel="Legenda do story" style={st.campo} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Botao tipo="discreto" titulo="Trocar foto" desabilitado={enviando} aoPressionar={() => limpar(true)} style={{ flex: 1 }} />
                <Botao icone="enviar" titulo="Publicar" carregando={enviando} aoPressionar={publicar} style={{ flex: 1 }} />
              </View>
            </View>
          ) : null}

          {etapa === 'texto' ? (
            <View style={{ flex: 1, padding: 16 }}>
              <View style={st.areaTexto}>
                <TextInput value={texto} onChangeText={setTexto} placeholder="Escreva o seu story" placeholderTextColor="rgba(255,255,255,0.6)" selectionColor="#ffffff" multiline maxLength={140} accessibilityLabel="Texto do story" style={st.texto} />
              </View>
              <View style={st.cores}>
                {FUNDOS_STORY.map((c, k) => (
                  <Pressable key={c} accessibilityRole="button" accessibilityLabel={`Cor ${k + 1}`} accessibilityState={{ selected: k === fundo }} onPress={() => setFundo(k)} style={[st.cor, { backgroundColor: c }, k === fundo && st.corAtiva]} />
                ))}
              </View>
              <Botao icone="enviar" titulo="Publicar" desabilitado={!texto.trim()} carregando={enviando} aoPressionar={publicar} style={{ marginTop: 14, marginBottom: insets.bottom + 8 }} />
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: Math.min(larguraMax, 480) },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 60 },
  botaoTopo: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 4, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 68 },
  icone: { width: 46, height: 46, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  moldura: { flex: 1, borderRadius: 4, overflow: 'hidden', backgroundColor: '#161616' },
  campo: { height: 48, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, color: cores.texto, fontSize: 14.5, fontFamily: FONTE['300'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  areaTexto: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  texto: { width: '100%', color: '#ffffff', fontSize: 28, lineHeight: 38, textAlign: 'center', fontFamily: FONTE['400'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  cores: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
  cor: { width: 34, height: 34, borderRadius: 4, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  corAtiva: { borderColor: '#ffffff', borderWidth: 3 },
}));
