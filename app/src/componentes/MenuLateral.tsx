/* Menu lateral do computador (refeito em 2026-11-18, pedido do dono): no alto, a sua conta (é o Perfil) com a seta de recolher na
   mesma linha; logo abaixo, o upgrade para o PRO, com contorno pontilhado; uma linha fina; as abas; e, embaixo, as notificações.
   Fechado, vira uma régua de ícones centralizados. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useMovimentoReduzido } from '../lib/movimento';
import { LARGURA_MENU, LARGURA_MENU_FECHADO } from '../lib/largura';
import { cores, estilos } from '../tema';
import type { ItemAba } from './BarraAbas';
import { Icone, NomeIcone } from './Icone';
import { IconeMenu } from './IconeMenu';
import { T } from './Ui';
import { Avatar } from '../telas/comunidade/Avatar';
import { useLoja } from '../estado/loja';
import { TelaPlanos } from './TelaPlanos';
import { BotaoTema } from './BotaoTema';

type Props = {
  itens: ItemAba[]; atual: string; aoEscolher: (id: string) => void;
  recolhido: boolean; aoAlternar: () => void;
  naoLidas: number; notificacoesAbertas: boolean; aoAbrirNotificacoes: () => void;
  nome: string; nivel: number; aoAbrirConta: () => void;
};

type ItemProps = { icone: NomeIcone; rotulo: string; recolhido: boolean; ativo?: boolean; selo?: number; papel?: 'tab' | 'button'; aoPressionar: () => void };

function Item({ icone, rotulo, recolhido, ativo, selo, papel = 'tab', aoPressionar }: ItemProps) {
  const [sobre, setSobre] = useState(false);
  return (
    <View style={{ position: 'relative', zIndex: sobre ? 5 : 0 }}>
      <Pressable
        accessibilityRole={papel}
        accessibilityState={{ selected: !!ativo }}
        accessibilityLabel={selo ? `${rotulo}: ${selo} novas` : rotulo}
        onPress={aoPressionar}
        onHoverIn={() => setSobre(true)}
        onHoverOut={() => setSobre(false)}
        style={({ pressed }) => [st.item, recolhido && st.itemFechado, ativo && st.itemAtivo, !ativo && (sobre || pressed) && st.itemSobre]}
      >
        <View pointerEvents="none" style={st.icone}>
          <Icone nome={icone} tamanho={21} cor={ativo ? '#ffffff' : sobre ? cores.texto : cores.texto2} />
          {recolhido && selo ? <View style={st.ponto} /> : null}
        </View>
        {recolhido ? null : <T tam={14.5} peso={ativo ? '500' : '400'} cor={ativo ? '#ffffff' : sobre ? cores.texto : cores.texto2} style={{ flex: 1 }}>{rotulo}</T>}
        {!recolhido && selo ? <View pointerEvents="none" style={st.selo}><T tam={11} peso="500" cor="#ffffff">{selo > 9 ? '9+' : String(selo)}</T></View> : null}
      </Pressable>
      {recolhido && sobre ? <View pointerEvents="none" style={st.dica}><T tam={12.5} peso="400">{rotulo}</T></View> : null}
    </View>
  );
}

export function MenuLateral({ itens, atual, aoEscolher, recolhido, aoAlternar, naoLidas, notificacoesAbertas, aoAbrirNotificacoes, nome, nivel, aoAbrirConta }: Props) {
  const reduzido = useMovimentoReduzido();
  const largura = useRef(new Animated.Value(recolhido ? LARGURA_MENU_FECHADO : LARGURA_MENU)).current;
  useEffect(() => {
    const alvo = recolhido ? LARGURA_MENU_FECHADO : LARGURA_MENU;
    if (reduzido) { largura.setValue(alvo); return; }
    Animated.timing(largura, { toValue: alvo, duration: 240, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: false }).start();
  }, [recolhido, reduzido, largura]);

  const { estado } = useLoja();
  const [pro, setPro] = useState(false);   // a tela de planos (componentes/TelaPlanos.tsx)
  const perfilAtivo = atual === 'perfil' && !notificacoesAbertas;

  const botaoMenu = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={recolhido ? 'Abrir o menu' : 'Recolher o menu'}
      accessibilityState={{ expanded: !recolhido }}
      onPress={aoAlternar}
      hitSlop={4}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.botaoMenu, (pressed || hovered) && { backgroundColor: cores.cartao2 }]}
    >
      {({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => (recolhido
        ? <IconeMenu tamanho={20} ativo={!!hovered || pressed} />
        : <Icone nome="voltar" tamanho={18} cor={cores.texto2} />)}
    </Pressable>
  );

  const conta = (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={`Seu perfil: ${nome}, nível ${nivel}`}
      accessibilityState={{ selected: perfilAtivo }}
      onPress={aoAbrirConta}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.conta, recolhido && st.contaFechada, perfilAtivo ? st.itemAtivo : (pressed || hovered) && st.itemSobre]}
    >
      <Avatar nome={nome || '?'} voce tamanho={recolhido ? 34 : 38} />
      {recolhido ? null : (
        <View style={{ flex: 1, minWidth: 0 }}>
          <T tam={14.5} peso="500" linhas={1} cor={perfilAtivo ? '#ffffff' : cores.texto}>{nome}</T>
          <T tam={12} linhas={1} cor={perfilAtivo ? 'rgba(255,255,255,0.75)' : cores.texto3}>Nível {nivel}{estado.pro ? ' · PRO' : ''}</T>
        </View>
      )}
    </Pressable>
  );

  /* o upgrade para o PRO (pedido do dono, 2026-11-18): logo abaixo do perfil, com contorno pontilhado preto; o fundo do cartão é um
     pouco mais claro que o do menu, para os traços pretos aparecerem. Quem já é PRO vê "Plano PRO ativo", sem o pontilhado. */
  const upgrade = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={estado.pro ? 'Plano PRO ativo' : 'Fazer upgrade para o plano PRO'}
      onPress={() => setPro(true)}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.pro, recolhido && st.proFechado, estado.pro && st.proAtivo, (pressed || hovered) && { backgroundColor: `rgba(${cores.tinta},0.12)` }]}
    >
      <View style={st.proIcone}><Icone nome="estrela" tamanho={15} cor="#ffffff" espessura={2} /></View>
      {recolhido ? null : (
        <View style={{ flex: 1, minWidth: 0 }}>
          <T tam={12} peso="500" linhas={1} style={{ letterSpacing: 0.3 }}>{estado.pro ? 'PLANO PRO ATIVO' : 'UPGRADE PLANO PRO'}</T>
          <T tam={11.5} linhas={1} cor={cores.texto3}>{estado.pro ? 'Todos os recursos liberados' : 'Mais recursos e RONDO AI'}</T>
        </View>
      )}
    </Pressable>
  );

  return (
    <Animated.View style={[st.menu, { width: largura }]} accessibilityRole="navigation">
      {/* o topo (2026-11-18): aberto, a conta e a seta de recolher na mesma linha; fechado, o ícone do menu e a foto, um embaixo do outro */}
      {recolhido ? (
        <View style={{ alignItems: 'center', gap: 10 }}>
          {botaoMenu}
          {conta}
          {upgrade}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={st.topo}>
            <View style={{ flex: 1, minWidth: 0 }}>{conta}</View>
            {botaoMenu}
          </View>
          {upgrade}
        </View>
      )}

      <View style={st.divisa} />

      <View accessibilityRole="tablist" style={{ gap: 4 }}>
        {itens.filter((it) => it.id !== 'perfil').map((it) => (
          <Item key={it.id} icone={it.icone} rotulo={it.rotulo} recolhido={recolhido} ativo={it.id === atual && !notificacoesAbertas} aoPressionar={() => aoEscolher(it.id)} />
        ))}
      </View>

      <View style={{ flex: 1 }} />

      {/* o ícone do tema (sol/lua, desde 2026-11-26): no computador não há o cabeçalho de cima, então ele mora aqui */}
      <View style={[st.tema, recolhido && { alignItems: 'center' }]}><BotaoTema tamanho={36} /></View>

      <View style={st.rodape}>
        <Item papel="button" icone="sino" rotulo="Notificações" recolhido={recolhido} ativo={notificacoesAbertas} selo={naoLidas} aoPressionar={aoAbrirNotificacoes} />
      </View>

      <TelaPlanos aberto={pro} aoFechar={() => setPro(false)} />
    </Animated.View>
  );
}

const st = estilos(() => StyleSheet.create({
  menu: { height: '100%', paddingHorizontal: 12, paddingTop: 16, paddingBottom: 14, borderRightWidth: 1, borderRightColor: cores.linha, backgroundColor: cores.fundo2, zIndex: 10, overflow: 'hidden' },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tema: { paddingHorizontal: 6, marginBottom: 8 },
  botaoMenu: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  conta: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 7, borderRadius: 14 },
  contaFechada: { justifyContent: 'center', paddingHorizontal: 0, width: 48 },
  pro: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#000000', backgroundColor: `rgba(${cores.tinta},0.08)`,
  },
  proFechado: { width: 48, minHeight: 48, paddingHorizontal: 0, justifyContent: 'center' },
  proAtivo: { borderStyle: 'solid', borderColor: cores.linha2 },
  proIcone: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.acao },
  divisa: { height: 1, backgroundColor: cores.linha, marginVertical: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 44, paddingHorizontal: 12, borderRadius: 12, overflow: 'hidden' },
  itemFechado: { justifyContent: 'center', paddingHorizontal: 0 },
  itemSobre: { backgroundColor: cores.cartao2 },
  itemAtivo: { backgroundColor: cores.destaqueForte },
  icone: { width: 24, alignItems: 'center', justifyContent: 'center' },
  ponto: { position: 'absolute', top: -2, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: cores.destaque2 },
  selo: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.acao },
  dica: { position: 'absolute', left: 64, top: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: cores.painel, borderWidth: 1, borderColor: cores.linha2, zIndex: 20, minWidth: 90 },
  rodape: { gap: 2, paddingTop: 12, borderTopWidth: 1, borderTopColor: cores.linha },
}));
