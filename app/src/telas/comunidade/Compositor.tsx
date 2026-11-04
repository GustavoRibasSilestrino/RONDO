/* Nova publicação: texto, até 4 fotos ou vídeos (galeria ou câmera) e o destino (feed geral ou um dos seus grupos).
   Se a pessoa fechar sem publicar, o rascunho fica guardado até a próxima vez; "Descartar" apaga tudo. */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { listarGrupos } from '../../lib/grupos';
import { escolherMidia, MAX_MIDIAS, removerMidia } from '../../lib/midia';
import { cores } from '../../tema';
import type { Midia } from '../../tipos';
import { Avatar } from './Avatar';
import { Miniatura } from './Midia';

const LIMITE_TEXTO = 600;

export function Compositor({ aberto, aoFechar, grupoInicial }: { aberto: boolean; aoFechar: () => void; grupoInicial: string | null }) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const meusGrupos = listarGrupos(estado).filter((g) => g.meu);

  const [texto, setTexto] = useState('');
  const [midia, setMidia] = useState<Midia[]>([]);
  const [destino, setDestino] = useState<string | null>(grupoInicial);
  const [origem, setOrigem] = useState<'galeria' | 'camera' | null>(null);   // qual botão está esperando o seletor
  const [erro, setErro] = useState('');

  useEffect(() => { if (aberto) { setDestino(grupoInicial); setErro(''); } }, [aberto, grupoInicial]);

  const pode = (texto.trim().length > 0 || midia.length > 0) && origem === null;
  const cheio = midia.length >= MAX_MIDIAS;

  const adicionar = async (de: 'galeria' | 'camera') => {
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
    avisar(destino ? 'Publicado no grupo.' : 'Publicado no feed.');
  };

  return (
    <Folha aberta={aberto} aoFechar={aoFechar} titulo="Nova publicação">
      <View style={st.cabeca}>
        <Avatar nome={estado.usuario?.nome ?? 'Você'} voce />
        <View style={{ flex: 1 }}>
          <T tam={15} peso="500">{estado.usuario?.nome ?? 'Você'}</T>
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
        autoFocus={aberto}
        placeholder="Compartilhe um treino, uma refeição, uma conquista…"
        placeholderTextColor={cores.texto3}
        selectionColor={cores.destaque}
        accessibilityLabel="Texto da publicação"
        style={st.texto}
      />
      <T tam={11.5} mono cor={texto.length > LIMITE_TEXTO - 40 ? cores.alerta : cores.texto3} style={{ alignSelf: 'flex-end', marginTop: 2 }}>{texto.length}/{LIMITE_TEXTO}</T>

      {midia.length ? (
        <View style={st.miniaturas}>
          {midia.map((m) => (
            <View key={m.id} style={{ width: 84, height: 84 }}>
              <Miniatura m={m} style={{ width: 84, height: 84 }} />
              <Pressable accessibilityRole="button" accessibilityLabel="Remover da publicação" onPress={() => tirar(m)} hitSlop={8} style={st.x}>
                <Icone nome="fechar" tamanho={13} cor="#ffffff" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={st.acoes}>
        <Botao pequeno tipo="fantasma" icone="imagem" titulo="Fotos e vídeos" aoPressionar={() => adicionar('galeria')} carregando={origem === 'galeria'} desabilitado={cheio || origem === 'camera'} style={{ flex: 1 }} />
        <Botao pequeno tipo="fantasma" icone="camera" titulo="Câmera" aoPressionar={() => adicionar('camera')} carregando={origem === 'camera'} desabilitado={cheio || origem === 'galeria'} style={{ flex: 1 }} />
      </View>
      <T tam={12} cor={cores.texto3} style={{ marginTop: 8 }}>{cheio ? `Limite de ${MAX_MIDIAS} fotos ou vídeos por publicação.` : `${midia.length} de ${MAX_MIDIAS} fotos ou vídeos. Vídeos de até 1 minuto.`}</T>

      {erro ? (
        <View style={st.erro} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Icone nome="alerta" tamanho={16} cor={cores.erro} />
          <T tam={13} cor={cores.erro} style={{ flex: 1, lineHeight: 18 }}>{erro}</T>
        </View>
      ) : null}

      <Botao titulo="Publicar" aoPressionar={publicar} desabilitado={!pode} style={{ marginTop: 18 }} />
      {texto || midia.length ? (
        <Pressable accessibilityRole="button" onPress={descartar} style={{ alignSelf: 'center', paddingVertical: 12 }}>
          <T tam={13} cor={cores.texto2} style={{ textDecorationLine: 'underline' }}>Descartar rascunho</T>
        </Pressable>
      ) : null}
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

const st = StyleSheet.create({
  cabeca: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  destinos: { gap: 8, paddingVertical: 14 },
  destino: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  destinoAtivo: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  texto: { minHeight: 120, color: cores.texto, fontSize: 17, fontWeight: '300', lineHeight: 25, textAlignVertical: 'top', paddingVertical: 4, outlineWidth: 0, outlineColor: 'transparent' },
  miniaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  x: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17122a', borderWidth: 1, borderColor: cores.linha2 },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 16 },
  erro: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,107,129,0.35)', backgroundColor: 'rgba(255,107,129,0.08)' },
});
