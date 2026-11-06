/* Menu lateral do computador: o hambúrguer no alto abre e fecha o menu (aberto: ícones com nomes; fechado: só uma régua de ícones).
   Embaixo ficam as notificações, o plano PRO, a aparência (Normal ou Ultra) e a sua conta. Quadrado, de fios finos, sem brilho. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useMovimentoReduzido } from '../lib/movimento';
import { LARGURA_MENU, LARGURA_MENU_FECHADO } from '../lib/largura';
import { cores, estilos } from '../tema';
import type { ItemAba } from './BarraAbas';
import { Icone, NomeIcone } from './Icone';
import { Marca } from './Marca';
import { T } from './Ui';

type Props = {
  itens: ItemAba[]; atual: string; aoEscolher: (id: string) => void;
  recolhido: boolean; aoAlternar: () => void;
  naoLidas: number; notificacoesAbertas: boolean; aoAbrirNotificacoes: () => void;
  aoAbrirPro: () => void;
  tema: 'normal' | 'ultra'; temaBloqueado: boolean; aoTrocarTema: () => void;
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

/* a aparência: dois lados, Normal e Ultra, como uma chave. O Ultra tem cadeado até o nível 15. */
function Aparencia({ recolhido, tema, bloqueado, aoTrocar }: { recolhido: boolean; tema: 'normal' | 'ultra'; bloqueado: boolean; aoTrocar: () => void }) {
  if (recolhido) {
    return <Item papel="button" icone="tema" rotulo={bloqueado ? 'Aparência: Ultra no nível 15' : `Aparência: ${tema === 'ultra' ? 'Ultra' : 'Normal'}`} recolhido aoPressionar={aoTrocar} />;
  }
  const lado = (id: 'normal' | 'ultra', nome: string) => {
    const ativo = tema === id;
    return (
      <Pressable
        key={id}
        accessibilityRole="button"
        accessibilityState={{ selected: ativo }}
        accessibilityLabel={`Aparência ${nome}${id === 'ultra' && bloqueado ? ', libera no nível 15' : ''}`}
        onPress={() => { if (!ativo) aoTrocar(); }}
        style={[st.lado, ativo && st.ladoAtivo]}
      >
        <T tam={13} peso={ativo ? '500' : '400'} cor={ativo ? '#ffffff' : cores.texto2}>{nome}</T>
        {id === 'ultra' && bloqueado ? <Icone nome="cadeado" tamanho={11} cor={cores.texto3} /> : null}
      </Pressable>
    );
  };
  return (
    <View style={st.aparencia}>
      <T tam={12.5} cor={cores.texto3} style={{ marginBottom: 8, paddingHorizontal: 2 }}>Aparência</T>
      <View style={st.chave}>{lado('normal', 'Normal')}{lado('ultra', 'Ultra')}</View>
    </View>
  );
}

export function MenuLateral({ itens, atual, aoEscolher, recolhido, aoAlternar, naoLidas, notificacoesAbertas, aoAbrirNotificacoes, aoAbrirPro, tema, temaBloqueado, aoTrocarTema, nome, nivel, aoAbrirConta }: Props) {
  const reduzido = useMovimentoReduzido();
  const largura = useRef(new Animated.Value(recolhido ? LARGURA_MENU_FECHADO : LARGURA_MENU)).current;
  useEffect(() => {
    const alvo = recolhido ? LARGURA_MENU_FECHADO : LARGURA_MENU;
    if (reduzido) { largura.setValue(alvo); return; }
    Animated.timing(largura, { toValue: alvo, duration: 240, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: false }).start();
  }, [recolhido, reduzido, largura]);

  return (
    <Animated.View style={[st.menu, { width: largura }]} accessibilityRole="navigation">
      <View style={[st.topo, recolhido && { justifyContent: 'center' }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recolhido ? 'Abrir o menu' : 'Fechar o menu'}
          accessibilityState={{ expanded: !recolhido }}
          onPress={aoAlternar}
          style={({ pressed }) => [st.hamburguer, pressed && { backgroundColor: cores.cartao2 }]}
        >
          <Icone nome="menu" tamanho={22} cor={cores.texto} />
        </Pressable>
        {recolhido ? null : (
          <View style={st.marca}>
            <Marca altura={20} />
            <T tam={16} peso="500" style={{ letterSpacing: 5 }}>RONDO</T>
          </View>
        )}
      </View>

      <View accessibilityRole="tablist" style={{ gap: 2, marginTop: 14 }}>
        {itens.map((it) => (
          <Item key={it.id} icone={it.icone} rotulo={it.rotulo} recolhido={recolhido} ativo={it.id === atual && !notificacoesAbertas} aoPressionar={() => aoEscolher(it.id)} />
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <View style={st.rodape}>
        <Item papel="button" icone="sino" rotulo="Notificações" recolhido={recolhido} ativo={notificacoesAbertas} selo={naoLidas} aoPressionar={aoAbrirNotificacoes} />
        <Item papel="button" icone="estrela" rotulo="Plano PRO" recolhido={recolhido} aoPressionar={aoAbrirPro} />
        <Aparencia recolhido={recolhido} tema={tema} bloqueado={temaBloqueado} aoTrocar={aoTrocarTema} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sua conta: ${nome}, nível ${nivel}`}
          onPress={aoAbrirConta}
          style={({ pressed }) => [st.conta, recolhido && { justifyContent: 'center', paddingHorizontal: 0 }, pressed && { backgroundColor: cores.cartao2 }]}
        >
          <View style={st.inicial}><T tam={14} peso="500" cor="#ffffff">{(nome || '?').charAt(0).toUpperCase()}</T></View>
          {recolhido ? null : (
            <View style={{ flex: 1 }}>
              <T tam={14} peso="500" linhas={1}>{nome}</T>
              <T tam={12} cor={cores.texto3}>Nível {nivel}</T>
            </View>
          )}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const st = estilos(() => StyleSheet.create({
  menu: { height: '100%', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 14, borderRightWidth: 1, borderRightColor: cores.linha2, backgroundColor: cores.fundo2, zIndex: 10 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44 },
  hamburguer: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 44, paddingHorizontal: 10, borderRadius: 3 },
  itemFechado: { justifyContent: 'center', paddingHorizontal: 0 },
  itemSobre: { backgroundColor: cores.cartao2 },
  itemAtivo: { backgroundColor: cores.destaqueForte },
  icone: { width: 24, alignItems: 'center', justifyContent: 'center' },
  ponto: { position: 'absolute', top: -2, right: 0, width: 8, height: 8, borderRadius: 2, backgroundColor: cores.destaque2 },
  selo: { minWidth: 20, height: 20, borderRadius: 3, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  dica: { position: 'absolute', left: 64, top: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 3, backgroundColor: cores.painel, borderWidth: 1, borderColor: cores.linha2, zIndex: 20, minWidth: 90 },
  rodape: { gap: 2, paddingTop: 12, borderTopWidth: 1, borderTopColor: cores.linha },
  aparencia: { paddingVertical: 10, paddingHorizontal: 2 },
  chave: { flexDirection: 'row', borderWidth: 1, borderColor: cores.linha2, borderRadius: 3, padding: 2, gap: 2 },
  lado: { flex: 1, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 2 },
  ladoAtivo: { backgroundColor: cores.destaqueForte },
  conta: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, paddingHorizontal: 8, borderRadius: 3, marginTop: 6, borderTopWidth: 1, borderTopColor: cores.linha },
  inicial: { width: 32, height: 32, borderRadius: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
}));
