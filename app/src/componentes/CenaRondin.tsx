/* A cena do RONDIN em tela cheia: fundo preto com as ondas de voz, o orbe, a legenda palavra por palavra e, embaixo, o que a
   tela quiser (botões, onda...). É o visual da conversa do cadastro (telas/Rondin.tsx) para as telas do recado, da chegada e do
   "Olá Rondin". No navegador a coluna inteira escala com a janela, para caber sem rolar e nunca ficar gigante. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayoutLargo } from '../lib/largura';
import type { EstadoOrbe } from '../lib/orbe';
import type { Sotaque } from '../lib/rondinVoz';
import type { FalaRondin } from '../lib/useFalaRondin';
import { cores, estilos } from '../tema';
import { Legenda } from '../telas/Rondin';
import { BotaoVoz } from './BotaoVoz';
import { FundoRondin } from './FundoRondin';
import { Icone } from './Icone';
import { Orbe } from './Orbe';

type Props = {
  sotaque: Sotaque;
  fala: FalaRondin;
  estadoOrbe: EstadoOrbe;
  rotuloOrbe: string;                     // o que o leitor de tela diz do orbe (tocar pula ou repete a fala)
  rotuloVoltar: string;
  aoVoltar?: () => void;                  // a seta (ou o X) no canto de cima, à esquerda
  iconeVoltar?: 'voltar' | 'fechar';
  direita?: React.ReactNode;              // botões ao lado do alto-falante
  zIndex?: number;
  children?: React.ReactNode;             // o que fica embaixo da legenda
};

export function CenaRondin({ sotaque, fala, estadoOrbe, rotuloOrbe, rotuloVoltar, aoVoltar, iconeVoltar = 'voltar', direita, zIndex = 60, children }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { largo } = useLayoutLargo();
  const k = Platform.OS !== 'web' ? 1
    : largo ? Math.min(1.3, Math.max(0.9, Math.min(width / 390, height / 680)))
      : Math.min(1.12, Math.max(0.78, Math.min(width / 390, height / 740)));
  const orbe = Math.round(Math.max(120, Math.min(largo ? 250 : 220, (width / k) * 0.6, (height / k) * 0.27)));

  /* o centro do orbe na janela: as ondas do fundo nascem dele */
  const orbeRef = useRef<React.ComponentRef<typeof View>>(null);
  const [centro, setCentro] = useState<{ x: number; y: number } | null>(null);
  const medirOrbe = useCallback(() => {
    orbeRef.current?.measureInWindow((x, y, w, h) => {
      if (!(w > 0 && h > 0)) return;
      const nx = x + w / 2, ny = y + h / 2;
      setCentro((c) => (c && Math.abs(c.x - nx) < 1 && Math.abs(c.y - ny) < 1 ? c : { x: nx, y: ny }));
    });
  }, []);
  useEffect(() => { const id = setTimeout(medirOrbe, 60); return () => clearTimeout(id); }, [medirOrbe, width, height, orbe, estadoOrbe]);

  return (
    <View style={[st.tela, { zIndex }]}>
      <FundoRondin estado={estadoOrbe} cx={centro?.x} cy={centro?.y} />
      <ScrollView
        style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingTop: insets.top + 64, paddingBottom: insets.bottom + 28, paddingHorizontal: 20 }}
      >
        <View style={[st.coluna, largo ? st.colunaLarga : null, k !== 1 ? ({ zoom: k } as object) : null]}>
          <View style={{ alignItems: 'center' }}>
            <View ref={orbeRef} collapsable={false} onLayout={medirOrbe}>
              <Orbe hud tamanho={orbe} estado={estadoOrbe} aoPressionar={fala.tocarNoOrbe} rotulo={rotuloOrbe} />
            </View>
          </View>
          <Legenda
            largo={largo} texto={fala.fala} chave={fala.chave} taxa={sotaque.taxa} duracaoMs={fala.duracaoMs}
            indiceVoz={fala.indiceVoz} completa={fala.completa} aoCompletar={fala.aoCompletarLegenda}
          />
          {children}
        </View>
      </ScrollView>

      {aoVoltar ? (
        <Pressable
          accessibilityRole="button" accessibilityLabel={rotuloVoltar} onPress={aoVoltar} hitSlop={8}
          style={({ hovered, pressed }: { hovered?: boolean; pressed: boolean }) => [st.canto, largo ? { top: insets.top + 24, left: 24 } : { top: insets.top + 8, left: 10 }, (hovered || pressed) && { backgroundColor: cores.cartao2 }]}
        >
          <Icone nome={iconeVoltar} tamanho={24} cor="#ffffff" />
        </Pressable>
      ) : null}
      <View style={[st.direita, largo ? { top: insets.top + 24, right: 24 } : { top: insets.top + 10, right: 12 }]}>
        {direita}
        <BotaoVoz idioma={sotaque.idioma} />
      </View>
    </View>
  );
}

/* o botão redondo discreto dos cantos da cena (o diário, por exemplo) */
export function BotaoCanto({ icone, rotulo, aoPressionar }: { icone: 'calendario' | 'fechar'; rotulo: string; aoPressionar: () => void }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={rotulo} onPress={aoPressionar} hitSlop={6}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.botaoRedondo, (hovered || pressed) && st.botaoRedondoAceso]}
    >
      <Icone nome={icone} tamanho={20} cor="#ffffff" />
    </Pressable>
  );
}

const st = estilos(() => StyleSheet.create({
  tela: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000' },
  coluna: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  colunaLarga: { maxWidth: 520, paddingHorizontal: 26 },
  canto: { position: 'absolute', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  direita: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8 },
  botaoRedondo: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(196,168,255,0.22)',
  },
  botaoRedondoAceso: { backgroundColor: 'rgba(167,139,250,0.16)', borderColor: 'rgba(196,168,255,0.45)' },
}));
