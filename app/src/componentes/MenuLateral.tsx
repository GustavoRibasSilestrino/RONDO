/* Menu lateral do computador: faz o papel da barra de abas e do cabeçalho do celular.
   A marca no alto, as abas com nome, e embaixo notificações, plano PRO e tema. */
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LARGURA_MENU } from '../lib/largura';
import { cores, DEGRADE, estilos, FIM_DIAGONAL, INICIO_DIAGONAL, temaAtual } from '../tema';
import type { ItemAba } from './BarraAbas';
import { Icone, NomeIcone } from './Icone';
import { Marca } from './Marca';
import { T } from './Ui';

type Props = {
  itens: ItemAba[]; atual: string; aoEscolher: (id: string) => void;
  naoLidas: number; notificacoesAbertas: boolean; aoAbrirNotificacoes: () => void;
  aoAbrirPro: () => void; temaBloqueado: boolean; aoTrocarTema: () => void;
};

function Item({ icone, rotulo, ativo, selo, cadeado, papel = 'tab', aoPressionar }: { icone: NomeIcone; rotulo: string; ativo?: boolean; selo?: number; cadeado?: boolean; papel?: 'tab' | 'button'; aoPressionar: () => void }) {
  return (
    <Pressable
      accessibilityRole={papel}
      accessibilityState={{ selected: !!ativo }}
      accessibilityLabel={selo ? `${rotulo}: ${selo} novas` : rotulo}
      onPress={aoPressionar}
      style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [st.item, !ativo && (hovered || pressed) ? st.itemSobre : null]}
    >
      {ativo ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, st.itemAtivo]}>
          {temaAtual() === 'normal' ? <LinearGradient colors={DEGRADE.roxo} start={INICIO_DIAGONAL} end={FIM_DIAGONAL} style={StyleSheet.absoluteFill} /> : null}
        </View>
      ) : null}
      <View pointerEvents="none" style={st.icone}>
        <Icone nome={icone} tamanho={22} cor={ativo ? '#ffffff' : cores.texto2} />
        {cadeado ? <View style={st.cadeado}><Icone nome="cadeado" tamanho={9} cor="#ffffff" espessura={2.2} /></View> : null}
      </View>
      <T tam={15} peso={ativo ? '500' : '400'} cor={ativo ? '#ffffff' : cores.texto2} style={{ flex: 1 }}>{rotulo}</T>
      {selo ? <View pointerEvents="none" style={st.selo}><T tam={11} peso="500">{selo > 9 ? '9+' : String(selo)}</T></View> : null}
    </Pressable>
  );
}

export function MenuLateral({ itens, atual, aoEscolher, naoLidas, notificacoesAbertas, aoAbrirNotificacoes, aoAbrirPro, temaBloqueado, aoTrocarTema }: Props) {
  return (
    <View style={st.menu} accessibilityRole="navigation">
      <View style={st.marca}>
        <Marca altura={22} />
        <T tam={18} peso="500" style={{ letterSpacing: 5 }}>RONDO</T>
      </View>
      <View accessibilityRole="tablist" style={{ gap: 4 }}>
        {itens.map((it) => (
          <Item key={it.id} icone={it.icone} rotulo={it.rotulo} ativo={it.id === atual && !notificacoesAbertas} aoPressionar={() => aoEscolher(it.id)} />
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <View style={st.rodape}>
        <Item papel="button" icone="sino" rotulo="Notificações" ativo={notificacoesAbertas} selo={naoLidas} aoPressionar={aoAbrirNotificacoes} />
        <Item papel="button" icone="estrela" rotulo="Plano PRO" aoPressionar={aoAbrirPro} />
        <Item papel="button" icone="tema" rotulo={temaBloqueado ? 'Tema (nível 15)' : 'Trocar o tema'} cadeado={temaBloqueado} aoPressionar={aoTrocarTema} />
      </View>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  menu: { width: LARGURA_MENU, height: '100%', paddingHorizontal: 14, paddingTop: 22, paddingBottom: 18, borderRightWidth: 1, borderRightColor: cores.linha, backgroundColor: cores.fundo2 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginBottom: 26 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 46, paddingHorizontal: 12, borderRadius: 14, overflow: 'hidden' },
  itemSobre: { backgroundColor: cores.cartao2 },
  itemAtivo: { borderRadius: 14, overflow: 'hidden', backgroundColor: cores.destaqueForte },
  icone: { width: 24, alignItems: 'center' },
  cadeado: { position: 'absolute', right: -6, bottom: -4, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  selo: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  rodape: { gap: 4, paddingTop: 14, borderTopWidth: 1, borderTopColor: cores.linha },
}));
