/* Estrutura das telas: coluna rolável (Tela), painel que sobe de baixo (Folha) e aviso rápido (Aviso). */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, larguraMax, raio } from '../tema';
import { T } from './Ui';

/* ---------- Tela ---------- */
export function Tela({ children, comDoca = true }: { children: React.ReactNode; comDoca?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + (comDoca ? 140 : 40), alignItems: 'center' }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ width: '100%', maxWidth: larguraMax, paddingHorizontal: 20 }}>{children}</View>
    </ScrollView>
  );
}

/* ---------- Folha: painel que sobe de baixo ---------- */
export function Folha({ aberta, aoFechar, titulo, children }: { aberta: boolean; aoFechar: () => void; titulo?: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={aberta} transparent animationType="slide" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.fundo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={aoFechar} accessibilityLabel="Fechar" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.espaco} pointerEvents="box-none">
          <View style={[st.corpo, { paddingBottom: insets.bottom + 18 }]}>
            <View style={st.alca} />
            {titulo ? <T tam={22} peso="300" style={{ marginBottom: 14, letterSpacing: -0.4 }}>{titulo}</T> : null}
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ---------- Aviso: mensagem rápida acima do menu ---------- */
const AvisoContexto = createContext<(mensagem: string) => void>(() => {});
export const useAviso = () => useContext(AvisoContexto);

export function AvisoProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [mensagem, setMensagem] = useState('');
  const opacidade = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativo = Platform.OS !== 'web';

  const avisar = useCallback((m: string) => {
    setMensagem(m);
    Animated.timing(opacidade, { toValue: 1, duration: 180, useNativeDriver: nativo }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => Animated.timing(opacidade, { toValue: 0, duration: 240, useNativeDriver: nativo }).start(), 2600);
  }, [opacidade, nativo]);

  return (
    <AvisoContexto.Provider value={avisar}>
      {children}
      <Animated.View pointerEvents="none" style={[st.aviso, { bottom: insets.bottom + 86, opacity: opacidade }]}>
        <T tam={13} peso="400" centro>{mensagem}</T>
      </Animated.View>
    </AvisoContexto.Provider>
  );
}

const st = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  espaco: { width: '100%', maxWidth: larguraMax, alignSelf: 'center' },
  corpo: { backgroundColor: '#0d0a16', borderColor: cores.linha2, borderWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10 },
  alca: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: cores.linha2, marginBottom: 14 },
  aviso: { position: 'absolute', left: 24, right: 24, alignSelf: 'center', maxWidth: 420, backgroundColor: '#17122a', borderColor: cores.linha2, borderWidth: 1, borderRadius: raio.m, paddingVertical: 11, paddingHorizontal: 16 },
});
