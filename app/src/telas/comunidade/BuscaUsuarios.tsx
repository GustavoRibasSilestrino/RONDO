/* Procurar pessoas: a lupa do Feed abre esta tela. Busca por nome ou @usuário; ao tocar em alguém, abre o perfil dela.
   A busca é no servidor, por nome ou @; sem texto, ele sugere quem você ainda não segue. */
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buscarPessoas } from '../../api/social';
import type { Pessoa } from '../../api/social';
import { Icone } from '../../componentes/Icone';
import { T } from '../../componentes/Ui';
import { cores, estilos, FONTE, larguraMax } from '../../tema';
import { Avatar } from './Avatar';
import { BotaoSeguir } from './Seguir';
import { arrobaDe } from './util';

type Props = { aberto: boolean; aoFechar: () => void; aoAbrirPerfil: (id: number) => void };

export function BuscaUsuarios({ aberto, aoFechar, aoAbrirPerfil }: Props) {
  const insets = useSafeAreaInsets();
  const [busca, setBusca] = useState('');
  const [lista, setLista] = useState<Pessoa[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const q = busca.replace(/^@/, '').trim();
  useEffect(() => {
    if (!aberto) return undefined;
    let valido = true;
    setCarregando(true);
    const t = setTimeout(async () => {
      try {
        const r = await buscarPessoas(q);
        if (valido) { setLista(r.itens); setErro(''); }
      } catch (e) {
        if (valido) setErro(e instanceof Error ? e.message : 'Não foi possível buscar agora.');
      } finally {
        if (valido) setCarregando(false);
      }
    }, q ? 300 : 0);
    return () => { valido = false; clearTimeout(t); };
  }, [q, aberto]);

  const abrir = (id: number) => { setBusca(''); aoFechar(); aoAbrirPerfil(id); };
  const fechar = () => { setBusca(''); aoFechar(); };

  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={fechar} statusBarTranslucent>
      <View style={st.tela}>
        <View style={[st.coluna, { paddingTop: insets.top + 8 }]}>
          <View style={st.topo}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={fechar} style={st.voltar}>
              <Icone nome="voltar" tamanho={22} cor="#ffffff" />
            </Pressable>
            <View style={st.busca}>
              <Icone nome="busca" tamanho={18} cor="#ffffff" />
              <TextInput
                autoFocus
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar pessoas"
                placeholderTextColor={cores.placeholder}
                selectionColor={cores.destaque}
                accessibilityLabel="Buscar pessoas"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={st.campo}
              />
              {busca ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Limpar a busca" onPress={() => setBusca('')} hitSlop={8} style={{ padding: 6 }}>
                  <Icone nome="fechar" tamanho={16} cor="#ffffff" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, paddingTop: 8 }}>
            <T tam={13} peso="500" style={{ marginBottom: 10 }}>{q ? `${lista.length} ${lista.length === 1 ? 'resultado' : 'resultados'}` : 'Sugestões para você'}</T>
            {lista.length === 0 ? (
              <View style={st.vazio}>
                <Icone nome="busca" tamanho={28} cor="#ffffff" />
                <T tam={15} peso="500" style={{ marginTop: 10 }}>{erro ? 'Sem conexão' : carregando ? 'Buscando...' : q ? 'Ninguém encontrado' : 'Sem sugestões por enquanto'}</T>
                <T tam={13} centro style={{ marginTop: 4, lineHeight: 19 }}>{erro || (q ? 'Tente outro nome ou o @usuário da pessoa.' : 'Quando mais gente entrar no RONDO, ela aparece aqui.')}</T>
              </View>
            ) : (
              <View style={{ gap: 4 }}>
                {lista.map((n) => (
                  <View key={n.id} style={st.linha}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir o perfil de ${n.nome}`} onPress={() => abrir(n.id)} style={st.pessoa}>
                      <Avatar nome={n.nome} tamanho={46} />
                      <View style={{ flex: 1 }}>
                        <T tam={15} peso="500" linhas={1}>{n.nome}</T>
                        <T tam={12.5} linhas={1} style={{ opacity: 0.75 }}>@{n.arroba ?? arrobaDe(n.nome)}</T>
                      </View>
                    </Pressable>
                    <BotaoSeguir pessoa={n} />
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 16, paddingLeft: 8, height: 56 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  busca: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 6, height: 46, borderRadius: 23, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  campo: { flex: 1, height: 46, color: cores.texto, fontSize: 15, fontFamily: FONTE['300'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  pessoa: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  vazio: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
}));
