/* O vidro das BARRAS e dos BOTÕES (desde 2026-11-26, pedido do dono): no iPhone com iOS 26 ou mais novo, o Liquid Glass de
   verdade (expo-glass-effect); em todo o resto (Android, iOS antigo e navegador), a mesma View de antes: fundo translúcido com
   borda clara e, no navegador, o desfoque do que passa por trás (VIDRO, em tema.ts). Cartões e fundos não usam este vidro.
   Com o Liquid Glass, a cor de fundo do estilo sai (quem pinta é o vidro) e o tom vira `tintColor`. */
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTema } from '../estado/tema';

/* o vidro nativo só existe no iOS 26+; a segunda checagem evita os iOS 26 de teste em que a API ainda não existia */
const seguro = (f: () => boolean): boolean => { try { return f(); } catch { return false; } };
export const VIDRO_NATIVO = Platform.OS === 'ios' && seguro(isLiquidGlassAvailable) && seguro(isGlassEffectAPIAvailable);

type Props = ViewProps & {
  style?: StyleProp<ViewStyle>;
  interativo?: boolean;   // botões: o vidro reage ao toque (só no Liquid Glass)
  tom?: string;           // a cor que tinge o vidro (só no Liquid Glass)
  children?: React.ReactNode;
};

export function Vidro({ style, interativo, tom, children, ...resto }: Props) {
  const { tema } = useTema();
  if (!VIDRO_NATIVO) return <View style={style} {...resto}>{children}</View>;
  return (
    <GlassView
      glassEffectStyle="regular"
      isInteractive={interativo}
      tintColor={tom}
      colorScheme={tema === 'claro' ? 'light' : 'dark'}
      style={[style, st.semFundo]}
      {...resto}
    >
      {children}
    </GlassView>
  );
}

const st = StyleSheet.create({ semFundo: { backgroundColor: 'transparent' } });
