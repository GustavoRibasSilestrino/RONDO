/* Configurações do perfil, em uma tela só com um menu: Seus dados, Aparência, Títulos, Benefícios por nível, Atalhos e Conta.
   Tudo o que deixaria o perfil carregado mora aqui. */
import React, { useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone, NomeIcone } from '../../componentes/Icone';
import { useTrocaTema } from '../../componentes/TrocaTema';
import { Botao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { BENEFICIOS, limitesDe, NIVEL_ULTRA } from '../../lib/beneficios';
import { medalhasDe } from '../../lib/medalhas';
import { progressoNivel, TITULOS, xpTotal } from '../../lib/nivel';
import { cores, estilos, larguraMax } from '../../tema';
import { SITE } from '../Login';
import { SeusDados } from './SeusDados';

type Secao = 'dados' | 'aparencia' | 'titulos' | 'beneficios' | 'atalhos' | 'conta';

const ITENS: { id: Secao; titulo: string; sub: string; icone: NomeIcone }[] = [
  { id: 'dados', titulo: 'Seus dados', sub: 'Medidas, atividade e objetivo', icone: 'perfil' },
  { id: 'aparencia', titulo: 'Aparência', sub: 'Tema Normal ou Ultra', icone: 'tema' },
  { id: 'titulos', titulo: 'Títulos', sub: 'Os que aparecem no seu perfil', icone: 'medalha' },
  { id: 'beneficios', titulo: 'Benefícios por nível', sub: 'O que cada nível libera', icone: 'estrela' },
  { id: 'atalhos', titulo: 'Atalhos', sub: 'Hoje, Evolução, Coleções e Recados', icone: 'menu' },
  { id: 'conta', titulo: 'Conta', sub: 'Sair, apagar e o site', icone: 'sair' },
];

type Props = { aberto: boolean; aoFechar: () => void; ir: (tela: string) => void };

export function Configuracoes({ aberto, aoFechar, ir }: Props) {
  const insets = useSafeAreaInsets();
  const { estado, commit, limpar } = useLoja();
  const avisar = useAviso();
  const trocarTema = useTrocaTema();
  const [secao, setSecao] = useState<Secao | null>(null);
  const [apagando, setApagando] = useState(false);

  const nivel = progressoNivel(xpTotal(estado)).nivel;
  const limites = limitesDe(nivel);
  const temaEfetivo = nivel >= NIVEL_ULTRA ? estado.tema : 'normal';
  const titulo = secao ? ITENS.find((i) => i.id === secao)!.titulo : 'Configurações';
  const sair = () => { setSecao(null); aoFechar(); };

  const alternarTitulo = (id: string, liberado: boolean) => {
    if (!liberado) return;
    commit((e) => {
      const l = e.perfilSocial.titulos;
      const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1);
      else if (l.length < limites.titulos) l.push(id);
    });
  };

  const irPara = (tela: string) => { sair(); ir(tela); };

  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={() => (secao ? setSecao(null) : sair())} statusBarTranslucent>
      <View style={st.tela}>
        <View style={[st.coluna, { paddingTop: insets.top + 8 }]}>
          <View style={st.topo}>
            <Pressable accessibilityRole="button" accessibilityLabel={secao ? 'Voltar às configurações' : 'Fechar'} onPress={() => (secao ? setSecao(null) : sair())} style={st.voltar}>
              <Icone nome={secao ? 'voltar' : 'fechar'} tamanho={22} cor="#ffffff" />
            </Pressable>
            <T tam={17} peso="500" style={{ flex: 1 }}>{titulo}</T>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, paddingTop: 8 }}>
            {secao === null ? (
              <View style={{ gap: 10 }}>
                {ITENS.map((i) => (
                  <Pressable key={i.id} accessibilityRole="button" accessibilityLabel={i.titulo} onPress={() => setSecao(i.id)} style={({ pressed }) => [st.linha, pressed && { opacity: 0.85 }]}>
                    <View style={st.icone}><Icone nome={i.icone} tamanho={20} cor="#ffffff" /></View>
                    <View style={{ flex: 1 }}>
                      <T tam={15.5} peso="500">{i.titulo}</T>
                      <T tam={12.5} style={{ marginTop: 1 }}>{i.sub}</T>
                    </View>
                    <Icone nome="setaDireita" tamanho={18} cor="#ffffff" />
                  </Pressable>
                ))}
                <T tam={11.5} style={{ marginTop: 14 }}>RONDO · versão 0.1.0</T>
              </View>
            ) : null}

            {secao === 'dados' ? <SeusDados /> : null}

            {secao === 'aparencia' ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['normal', 'ultra'] as const).map((id) => {
                  const ativo = temaEfetivo === id;
                  const bloqueado = id === 'ultra' && nivel < NIVEL_ULTRA;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: ativo, disabled: bloqueado }}
                      accessibilityLabel={`Tema ${id === 'ultra' ? 'Ultra' : 'Normal'}${bloqueado ? ', bloqueado até o nível 15' : ativo ? ', ativo' : ''}`}
                      onPress={() => {
                        if (bloqueado) { avisar('O tema Ultra libera no nível 15, o da tag Lenda de ontem.'); return; }
                        if (!ativo) trocarTema(id);
                      }}
                      style={[st.tema, ativo && { borderColor: cores.destaque }]}
                    >
                      <View style={[st.previa, id === 'ultra' ? st.previaUltra : st.previaNormal]}>
                        {id === 'ultra' ? <><View style={[st.mancha, { backgroundColor: '#2f6bff', left: -10, top: -10 }]} /><View style={[st.mancha, { backgroundColor: '#00d4ff', right: -14, bottom: -14 }]} /></> : <View style={[st.mancha, { backgroundColor: '#6a00d4', width: 26, height: 26, left: 12, bottom: 10 }]} />}
                        {bloqueado ? <View style={st.cadeado}><Icone nome="cadeado" tamanho={20} cor="#ffffff" /></View> : null}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                        <T tam={14} peso="500">{id === 'ultra' ? 'Ultra' : 'Normal'}</T>
                        {ativo ? <Icone nome="ok" tamanho={16} cor={cores.bom} /> : null}
                      </View>
                      <T tam={12} style={{ marginTop: 2 }}>{bloqueado ? 'Libera no nível 15' : id === 'ultra' ? 'Vidro, aurora e ondas' : 'Preto profundo'}</T>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {secao === 'titulos' ? (
              <View>
                <T tam={13} style={{ marginBottom: 12, lineHeight: 19 }}>Escolha até {limites.titulos} para mostrar no seu perfil.</T>
                <View style={st.colecao}>
                  {TITULOS.map((t) => {
                    const liberado = t.nivel <= nivel;
                    const ativo = estado.perfilSocial.titulos.includes(t.id) && liberado;
                    return (
                      <Pressable key={t.id} disabled={!liberado} accessibilityRole="button" accessibilityState={{ selected: ativo, disabled: !liberado }} accessibilityLabel={liberado ? `${t.nome}${ativo ? ', exibido' : ''}` : `${t.nome}, bloqueado: nível ${t.nivel}`} onPress={() => alternarTitulo(t.id, liberado)} style={[st.chipTitulo, ativo && st.chipTituloAtivo, !liberado && { opacity: 0.55 }]}>
                        {!liberado ? <Icone nome="cadeado" tamanho={13} cor="#ffffff" /> : ativo ? <Icone nome="ok" tamanho={14} cor="#ffffff" /> : null}
                        <T tam={13} peso={ativo ? '500' : '300'}>{t.nome}</T>
                        {!liberado ? <T tam={11.5}>nível {t.nivel}</T> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {secao === 'beneficios' ? (
              <View style={{ gap: 8 }}>
                {BENEFICIOS.map((b) => {
                  const aberto2 = nivel >= b.nivel;
                  return (
                    <View key={b.nivel} style={[st.linhaBeneficio, aberto2 && { borderColor: cores.linha2 }]}>
                      <View style={[st.nivelBeneficio, aberto2 && { backgroundColor: cores.destaqueForte }]}><T tam={13} peso="500">{b.nivel}</T></View>
                      <T tam={14} style={{ flex: 1, lineHeight: 19, opacity: aberto2 ? 1 : 0.6 }}>{b.texto}</T>
                      {aberto2 ? <Icone nome="ok" tamanho={18} cor={cores.bom} /> : <Icone nome="cadeado" tamanho={16} cor="#ffffff" />}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {secao === 'atalhos' ? (
              <View style={{ gap: 10 }}>
                {([
                  { id: 'hoje', rotulo: 'Hoje', sub: 'Resumo do dia', icone: 'relogio' },
                  { id: 'evolucao', rotulo: 'Evolução', sub: 'Peso e gráficos', icone: 'evolucao' },
                  { id: 'colecoes', rotulo: 'Coleções', sub: `${medalhasDe(estado, new Date()).filter((x) => x.aberta).length} medalhas`, icone: 'medalha' },
                  { id: 'recado', rotulo: 'Recados', sub: 'Voz do futuro', icone: 'recado' },
                ] as const).map((a) => (
                  <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`${a.rotulo}: ${a.sub}`} onPress={() => irPara(a.id)} style={({ pressed }) => [st.linha, pressed && { opacity: 0.85 }]}>
                    <View style={st.icone}><Icone nome={a.icone} tamanho={20} cor="#ffffff" /></View>
                    <View style={{ flex: 1 }}>
                      <T tam={15.5} peso="500">{a.rotulo}</T>
                      <T tam={12.5} style={{ marginTop: 1 }}>{a.sub}</T>
                    </View>
                    <Icone nome="setaDireita" tamanho={18} cor="#ffffff" />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {secao === 'conta' ? (
              <View style={{ gap: 12 }}>
                <Botao tipo="fantasma" icone="sair" titulo="Sair da conta" aoPressionar={() => { sair(); commit((e) => { e.usuario = null; }); }} />
                <Pressable accessibilityRole="link" onPress={() => Linking.openURL(SITE)} style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
                  <T tam={13} peso="500">Assinatura, termos e privacidade no site →</T>
                </Pressable>
                <Botao tipo="perigo" icone="lixo" titulo="Apagar conta" aoPressionar={() => setApagando(true)} />
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <Folha aberta={apagando} aoFechar={() => setApagando(false)} titulo="Apagar conta?">
        <T tam={14} style={{ lineHeight: 21 }}>Isso apaga a sua conta e todos os seus dados deste aparelho: treinos, dieta, publicações, stories, medalhas e recados. Não dá para desfazer.</T>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <Botao tipo="discreto" titulo="Cancelar" aoPressionar={() => setApagando(false)} style={{ flex: 1 }} />
          <Botao tipo="perigo" icone="lixo" titulo="Apagar" aoPressionar={async () => { setApagando(false); sair(); await limpar(); avisar('Conta apagada.'); }} style={{ flex: 1 }} />
        </View>
      </Folha>
    </Modal>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo, alignItems: 'center' },
  coluna: { flex: 1, width: '100%', maxWidth: larguraMax },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 52 },
  voltar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 64 },
  icone: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  tema: { flex: 1, padding: 12, borderRadius: 18, borderWidth: 1.5, borderColor: cores.linha2, backgroundColor: cores.cartao },
  previa: { height: 74, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  previaNormal: { backgroundColor: '#000000', borderWidth: 1, borderColor: '#333333' },
  previaUltra: { backgroundColor: '#040817' },
  mancha: { position: 'absolute', width: 70, height: 70, borderRadius: 35, opacity: 0.7 },
  cadeado: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)' },
  colecao: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipTitulo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  chipTituloAtivo: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  linhaBeneficio: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: cores.linha },
  nivelBeneficio: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 },
}));
