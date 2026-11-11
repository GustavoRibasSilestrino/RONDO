/* A primeira tela de quem não está logado: o orbe do RONDIN, na moldura de instrumento, e as duas opções, entrar ou criar
   conta. Qualquer uma das duas abre a conversa com o RONDIN (telas/Rondin.tsx). O orbe acompanha o cursor e responde ao toque.
   O fundo é o mesmo da conversa: preto, com as ondas de voz que nascem no orbe, a poeira de luz e as névoas roxas
   (componentes/FundoRondin). O cartão fica no centro da tela, na largura e na altura. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { aquecerApi } from '../api/cliente';
import type { ResultadoSocial } from '../api/loginSocial';
import { BotoesSociais } from '../componentes/BotoesSociais';
import { FundoRondin } from '../componentes/FundoRondin';
import { Orbe } from '../componentes/Orbe';
import { Botao, T } from '../componentes/Ui';
import { cores, estilos } from '../tema';

export function Inicio({ aoCriar, aoEntrar, aoSocial }: { aoCriar: () => void; aoEntrar: () => void; aoSocial: (r: ResultadoSocial) => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useEffect(() => { aquecerApi(); }, []);   // acorda o servidor enquanto a pessoa decide entre entrar e criar conta
  /* no navegador, a coluna inteira (orbe, letras e botões) escala com a janela: 1 = um celular de 390 px. Encolhe em tela
     estreita ou baixa, para caber sem rolar, e cresce só um pouco em tela grande (antes dobrava de tamanho no computador). */
  const k = Platform.OS === 'web' ? Math.min(1.15, Math.max(0.78, Math.min(width / 390, height / 700))) : 1;
  /* o orbe encolhe em tela baixa, para o cartão inteiro caber sem rolar */
  const sobra = (height - insets.top - insets.bottom - 48) / k;   // altura livre, em unidades da coluna
  const orbe = Math.round(Math.max(150, Math.min(300, (width / k) * 0.78, sobra - 320)));

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
  useEffect(() => { const id = setTimeout(medirOrbe, 60); return () => clearTimeout(id); }, [medirOrbe, width, height, orbe]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <FundoRondin estado="quieto" cx={centro?.x} cy={centro?.y} />
      <ScrollView
        style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}
      >
        <View style={[st.coluna, k !== 1 ? ({ zoom: k } as object) : null]}>
          <View style={{ alignItems: 'center' }}>
            <View ref={orbeRef} collapsable={false} onLayout={medirOrbe}>
              <Orbe hud tamanho={orbe} estado="quieto" aoPressionar={() => undefined} rotulo="RONDIN, o agente do RONDO" />
            </View>
          </View>
          <T tam={width / k < 400 ? 28 : 32} peso="200" centro style={{ marginTop: 12, lineHeight: 38 }}>Oi, eu sou o RONDIN</T>
          <T tam={14.5} cor={cores.texto2} centro style={{ marginTop: 8, lineHeight: 22 }}>
            Eu converso com você para criar a sua conta e montar o seu treino, ou para te receber de volta.
          </T>
          <View style={{ marginTop: 24, gap: 11 }}>
            <Botao orbita titulo="Criar conta" icone="ia" aoPressionar={aoCriar} />
            <Botao tipo="fantasma" titulo="Já tenho conta" aoPressionar={aoEntrar} />
            <BotoesSociais aoResultado={aoSocial} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  /* sem fundo próprio: as ondas e a poeira passam por trás, como na conversa */
  coluna: { width: '100%', maxWidth: 400, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 22 },
}));
