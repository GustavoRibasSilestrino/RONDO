/* Campo de texto com rótulo que sobe: o rótulo ocupa o lugar do texto e, ao focar ou preencher, vira o título pequeno do campo.
   O rótulo nunca some (some só o "placeholder"), o erro aparece colado ao campo com ícone e texto, e o foco acende a borda. */
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { cores, FONTE, estilos } from '../tema';
import { Icone, NomeIcone } from './Icone';
import { T } from './Ui';

export type CampoRef = React.ElementRef<typeof TextInput>;

type Props = TextInputProps & {
  rotulo: string;
  icone?: NomeIcone;       // ícone fixo à esquerda
  erro?: string;           // mensagem junto ao campo
  valido?: boolean;        // mostra um "ok" verde quando o valor já está certo
  direita?: React.ReactNode;   // ação à direita (ex.: mostrar a senha)
};

export const CampoFlutuante = forwardRef<CampoRef, Props>(function CampoFlutuante(
  { rotulo, icone, erro, valido, direita, value, onFocus, onBlur, style, ...resto },
  ref,
) {
  const [foco, setFoco] = useState(false);
  const alto = !!resto.multiline;   // várias linhas: o campo cresce e o texto começa logo abaixo do rótulo
  const subiu = foco || !!value;
  const sobe = useRef(new Animated.Value(subiu ? 1 : 0)).current;
  const nativo = Platform.OS !== 'web';

  useEffect(() => {
    Animated.timing(sobe, { toValue: subiu ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: nativo }).start();
  }, [subiu, sobe, nativo]);

  const corRotulo = erro ? cores.erro : foco ? cores.destaque2 : cores.texto2;
  const corIcone = erro ? cores.erro : foco ? cores.destaque2 : cores.texto3;

  return (
    <View>
      <View style={[st.caixa, alto && st.caixaAlta, foco && st.caixaFoco, !!erro && st.caixaErro]}>
        {icone ? (
          <View style={[st.icone, alto && { alignSelf: 'flex-start', marginTop: 20 }]}>
            <Icone nome={icone} tamanho={20} cor={corIcone} />
          </View>
        ) : null}
        <View style={st.meio}>
          <Animated.Text
            pointerEvents="none"
            numberOfLines={1}
            style={[
              st.rotulo,
              {
                color: corRotulo,
                transform: [
                  { translateY: sobe.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) },
                  { scale: sobe.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] }) },
                ],
              },
            ]}
          >
            {rotulo}
          </Animated.Text>
          <TextInput
            ref={ref}
            value={value}
            accessibilityLabel={rotulo}
            selectionColor={cores.destaque}
            placeholderTextColor={cores.placeholder}
            style={[st.entrada, alto && st.entradaAlta, style]}
            onFocus={(e) => { setFoco(true); onFocus?.(e); }}
            onBlur={(e) => { setFoco(false); onBlur?.(e); }}
            {...resto}
          />
        </View>
        {direita ?? (valido && !foco && value ? (
          <View style={st.valido} accessibilityElementsHidden importantForAccessibility="no">
            <Icone nome="ok" tamanho={18} cor={cores.bom} />
          </View>
        ) : null)}
      </View>
      {erro ? (
        <View style={st.erroLinha} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Icone nome="alerta" tamanho={14} cor={cores.erro} />
          <T tam={12.5} cor={cores.erro} style={{ flex: 1, lineHeight: 17 }}>{erro}</T>
        </View>
      ) : null}
    </View>
  );
});

const st = estilos(() => StyleSheet.create({
  caixa: {
    height: 60, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6,
    borderRadius: 4, borderWidth: 1, borderColor: cores.linha2, backgroundColor: 'rgba(255,255,255,0.045)',
  },
  caixaAlta: { height: undefined, minHeight: 112, alignItems: 'stretch' },
  caixaFoco: { borderColor: cores.destaque, backgroundColor: `rgba(${cores.tom},0.07)`, boxShadow: `0 0 0 1px ${cores.destaque}` },
  caixaErro: { borderColor: cores.erro, boxShadow: '0 0 0 1px #ff6b81' },
  icone: { marginRight: 12 },
  meio: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  rotulo: { position: 'absolute', left: 0, top: 20, fontSize: 16, fontFamily: FONTE['300'], transformOrigin: 'left center' },
  entrada: { height: 60, paddingTop: 20, paddingBottom: 0, paddingHorizontal: 0, color: cores.texto, fontSize: 16, fontFamily: FONTE['300'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  entradaAlta: { height: undefined, minHeight: 112, paddingTop: 32, paddingBottom: 12, textAlignVertical: 'top' },
  valido: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  erroLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, paddingHorizontal: 6 },
}));
