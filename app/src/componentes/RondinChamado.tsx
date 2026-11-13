/* "Olá Rondin": quando o RONDIN é chamado pela voz (lib/escuta.ts), ele aparece por cima do app, na língua em que foi chamado,
   e pergunta o que a pessoa quer: responder à pergunta do dia, abrir o diário ou fechar. Enquanto está aberto, a escuta fica
   pausada (ele não pode se ouvir). */
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePausarEscuta } from '../lib/escuta';
import { CONVERSA } from '../lib/rondinConversa';
import { sotaqueDoIdioma, type Idioma } from '../lib/rondinVoz';
import { useFalaRondin } from '../lib/useFalaRondin';
import { CenaRondin } from './CenaRondin';
import { Botao } from './Ui';

type Props = { idioma: Idioma; aoRecado: () => void; aoDiario: () => void; aoFechar: () => void };

export function RondinChamado({ idioma, aoRecado, aoDiario, aoFechar }: Props) {
  const sotaque = useMemo(() => sotaqueDoIdioma(idioma), [idioma]);
  const ui = CONVERSA[idioma].ui;
  const fala = useFalaRondin(sotaque);
  usePausarEscuta(true);
  const falou = useRef(false);

  useEffect(() => {
    if (falou.current) return;
    falou.current = true;
    fala.dizer([CONVERSA[idioma].falas.chamado]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ir = (f: () => void) => () => { fala.calar(); f(); };

  return (
    <View style={st.camada}>
      <CenaRondin
        sotaque={sotaque} fala={fala} estadoOrbe={fala.falando && !fala.completa ? 'falando' : 'ouvindo'}
        rotuloOrbe={fala.falando && !fala.completa ? ui.pularFala : ui.repetirFala}
        rotuloVoltar={ui.fechar} aoVoltar={ir(aoFechar)} iconeVoltar="fechar"
      >
        <View style={st.acoes}>
          <Botao orbita icone="recado" titulo={ui.falarRecado} aoPressionar={ir(aoRecado)} />
          <Botao tipo="fantasma" icone="calendario" titulo={ui.abrirDiario} aoPressionar={ir(aoDiario)} />
          <Botao tipo="discreto" titulo={ui.fechar} aoPressionar={ir(aoFechar)} />
        </View>
      </CenaRondin>
    </View>
  );
}

const st = StyleSheet.create({
  camada: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 },
  acoes: { marginTop: 14, width: '100%', gap: 10 },
});
