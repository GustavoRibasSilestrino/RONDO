/* Campo de texto com rótulo que sobe: o rótulo ocupa o lugar do texto e, ao focar ou preencher, vira o título pequeno do campo.
   O rótulo nunca some (some só o "placeholder"), o erro aparece colado ao campo com ícone e texto, e o foco acende a borda.
   Desde 2026-11-16 é mais baixo e mais discreto (pedido do dono), e no navegador o preenchimento automático não pinta mais
   o meio do campo de cinza-azulado. */
import React, { forwardRef, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { cores as coresClaras, escuro, FONTE, estilos } from '../tema';
import { Icone, NomeIcone } from './Icone';
import { EscuroContexto, T } from './Ui';

export type CampoRef = React.ElementRef<typeof TextInput>;

type Props = TextInputProps & {
  rotulo: string;
  icone?: NomeIcone;       // ícone fixo à esquerda
  erro?: string;           // mensagem junto ao campo
  valido?: boolean;        // mostra um "ok" verde quando o valor já está certo
  direita?: React.ReactNode;   // ação à direita (ex.: mostrar a senha)
};

/* o navegador pinta o fundo dos campos que ele mesmo preenche (e-mail e senha salvos): aqui o fundo fica transparente e o
   texto continua branco */
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('campo-sem-autofill')) {
  const css = document.createElement('style');
  css.id = 'campo-sem-autofill';
  css.textContent = 'input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus{-webkit-text-fill-color:currentColor;caret-color:currentColor;-webkit-box-shadow:0 0 0 1000px transparent inset;box-shadow:0 0 0 1000px transparent inset;transition:background-color 99999s ease-in-out 0s;}';
  document.head.appendChild(css);
}

export const CampoFlutuante = forwardRef<CampoRef, Props>(function CampoFlutuante(
  { rotulo, icone, erro, valido, direita, value, onFocus, onBlur, style, ...resto },
  ref,
) {
  const [foco, setFoco] = useState(false);
  /* nas telas do RONDIN (escuras) o campo é escuro; nas de dentro do app, de vidro claro */
  const naTelaEscura = useContext(EscuroContexto);
  const cores = naTelaEscura ? escuro : coresClaras;
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
      <View style={[st.caixa, !naTelaEscura && st.caixaClara, alto && st.caixaAlta, foco && st.caixaFoco, foco && !naTelaEscura && { borderColor: coresClaras.destaque, backgroundColor: `rgba(${coresClaras.tinta},0.04)` }, !!erro && { borderColor: cores.erro }]}>
        {icone ? (
          <View style={[st.icone, alto && { alignSelf: 'flex-start', marginTop: 20 }]}>
            <Icone nome={icone} tamanho={18} cor={corIcone} />
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
                  { translateY: sobe.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
                  { scale: sobe.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) },
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
            style={[st.entrada, { color: cores.texto }, alto && st.entradaAlta, style]}
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
    height: 46, flexDirection: 'row', alignItems: 'center', paddingLeft: 13, paddingRight: 4,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  caixaAlta: { height: undefined, minHeight: 112, alignItems: 'stretch' },
  caixaFoco: { borderColor: `rgba(${escuro.tom},0.7)`, backgroundColor: 'rgba(255,255,255,0.04)' },
  caixaClara: { borderColor: `rgba(${coresClaras.tinta},0.16)`, backgroundColor: `rgba(${coresClaras.tinta},0.06)` },   // o véu acompanha o tema (branco no escuro)
  icone: { marginRight: 11 },
  meio: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  rotulo: { position: 'absolute', left: 0, top: 13, fontSize: 14.5, fontFamily: FONTE['300'], transformOrigin: 'left center' },
  entrada: { height: 46, paddingTop: 15, paddingBottom: 0, paddingHorizontal: 0, color: escuro.texto, fontSize: 15, fontFamily: FONTE['300'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  entradaAlta: { height: undefined, minHeight: 112, paddingTop: 32, paddingBottom: 12, textAlignVertical: 'top' },
  valido: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  erroLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, paddingHorizontal: 6 },
}));
