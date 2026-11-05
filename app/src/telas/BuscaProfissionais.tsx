/* Procurar profissionais dentro do app: nutricionistas (para a dieta) e profissionais de educação física (para o treino).
   Todos aparecem com o selo de verificado, o registro (CRN ou CREF), as especialidades e a nota. */
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAviso } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Botao, Cartao, T } from '../componentes/Ui';
import { useLoja } from '../estado/loja';
import { adicionar } from '../lib/notificacoes';
import { Profissional, PROFISSIONAIS, ROTULO_TIPO, TipoProfissional } from '../lib/profissionais';
import { cores, FONTE, larguraMax, estilos } from '../tema';
import { Avatar } from './comunidade/Avatar';
import { normalizar } from './comunidade/util';

type Props = { aberto: boolean; aoFechar: () => void; tipo: TipoProfissional };

export function BuscaProfissionais({ aberto, aoFechar, tipo }: Props) {
  const insets = useSafeAreaInsets();
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<string | null>(null);

  const rotulo = ROTULO_TIPO[tipo];
  const lista = useMemo(() => PROFISSIONAIS.filter((p) => p.tipo === tipo), [tipo]);
  const especialidades = useMemo(() => [...new Set(lista.flatMap((p) => p.especialidades))], [lista]);
  const q = normalizar(busca);
  const visiveis = lista.filter((p) => (!filtro || p.especialidades.includes(filtro)) && (!q || normalizar(`${p.nome} ${p.especialidades.join(' ')} ${p.cidade}`).includes(q)));

  const contatar = (p: Profissional) => {
    commit((e) => {
      e.profissionais[p.id] = true;
      adicionar(e, { tipo: 'profissional', texto: `Pedido enviado para ${p.nome}. Você será avisado quando a resposta chegar.` });
    });
    avisar(`Pedido enviado para ${p.nome}.`);
  };

  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.tela}>
        <View style={[st.coluna, { paddingTop: insets.top + 10 }]}>
          <View style={st.topo}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={aoFechar} style={st.voltar}>
              <Icone nome="voltar" tamanho={22} cor="#ffffff" />
            </Pressable>
            <T tam={20} peso="300" style={{ flex: 1 }}>{rotulo.plural}</T>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
            <View style={st.busca}>
              <Icone nome="busca" tamanho={19} cor="#ffffff" />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Nome, especialidade ou cidade"
                placeholderTextColor={cores.placeholder}
                selectionColor={cores.destaque}
                accessibilityLabel="Buscar profissionais"
                autoCapitalize="none"
                autoCorrect={false}
                style={st.campoBusca}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 14 }}>
              {[null, ...especialidades].map((e) => {
                const ativo = e === filtro;
                return (
                  <Pressable key={e ?? 'todas'} accessibilityRole="button" accessibilityState={{ selected: ativo }} onPress={() => setFiltro(e)} style={[st.filtro, ativo && st.filtroAtivo]}>
                    <T tam={13} peso={ativo ? '500' : '300'}>{e ?? 'Todos'}</T>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={{ gap: 12 }}>
              {visiveis.length === 0 ? (
                <Cartao>
                  <T tam={15}>{lista.length ? 'Nenhum resultado.' : 'Ainda não há profissionais verificados.'}</T>
                  <T tam={13} style={{ marginTop: 6, lineHeight: 19 }}>{lista.length ? 'Tente outra palavra ou limpe o filtro de especialidade.' : `Os ${rotulo.plural.toLowerCase()} aparecem aqui assim que o cadastro deles for conferido pela equipe.`}</T>
                </Cartao>
              ) : visiveis.map((p) => {
                const enviado = !!estado.profissionais[p.id];
                return (
                  <Cartao key={p.id}>
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                      <Avatar nome={p.nome.replace(/^Dra?\.\s*/, '')} tamanho={52} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <T tam={16} peso="500" linhas={1} style={{ flexShrink: 1 }}>{p.nome}</T>
                          <Icone nome="verificado" tamanho={18} cor={cores.destaque} />
                        </View>
                        <T tam={12.5} style={{ marginTop: 2 }}>{p.registro} · verificado pela RONDO</T>
                      </View>
                    </View>
                    <T tam={14} style={{ marginTop: 12, lineHeight: 20 }}>{p.sobre}</T>
                    <View style={st.chips}>
                      {p.especialidades.map((e) => <View key={e} style={st.chip}><T tam={12}>{e}</T></View>)}
                    </View>
                    <View style={st.meta}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Icone nome="estrela" tamanho={15} cor="#ffffff" />
                        <T tam={13} peso="500">{p.nota.toFixed(1).replace('.', ',')}</T>
                        <T tam={12.5}>({p.avaliacoes})</T>
                      </View>
                      <T tam={12.5}>{p.cidade} · {p.atende}</T>
                    </View>
                    <View style={st.rodape}>
                      <T tam={13} peso="500" style={{ flex: 1 }}>{p.preco}</T>
                      <Botao pequeno tipo={enviado ? 'discreto' : 'primario'} icone={enviado ? 'ok' : 'enviar'} titulo={enviado ? 'Pedido enviado' : 'Enviar mensagem'} desabilitado={enviado} aoPressionar={() => contatar(p)} />
                    </View>
                  </Cartao>
                );
              })}
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 52 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  busca: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, height: 50, borderRadius: 25, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  campoBusca: { flex: 1, height: 50, color: cores.texto, fontSize: 14.5, fontFamily: FONTE['300'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  filtro: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  filtroAtivo: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: cores.cartao2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 8, flexWrap: 'wrap' },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: cores.linha },
}));
