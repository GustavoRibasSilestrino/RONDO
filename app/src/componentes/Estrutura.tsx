/* Estrutura das telas: coluna rolável (Tela), painel que sobe de baixo (Folha) e aviso rápido (Aviso). */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { definirRolagem } from '../lib/rolagem';
import { cores, larguraMax, raio, estilos } from '../tema';
import { T } from './Ui';

/* ---------- Tela ---------- */
export function Tela({ children, comDoca = true, animada = true }: { children: React.ReactNode; comDoca?: boolean; animada?: boolean }) {
  /* com a barra de baixo há o cabeçalho do app no alto (56 px); sem ela (entrar), a coluna começa mais perto do topo */
  const insets = useSafeAreaInsets();
  useEffect(() => { definirRolagem(0); }, []);   // tela nova: começa no topo, então o nome do cabeçalho aparece
  /* a tela entra subindo e aparecendo (animada={false}: a tela coreografa a própria entrada) */
  const entrada = useRef(new Animated.Value(animada ? 0 : 1)).current;
  const [entrou, setEntrou] = useState(!animada);
  useEffect(() => {
    if (!animada) return;
    Animated.timing(entrada, { toValue: 1, duration: 520, easing: Easing.out(Easing.exp), useNativeDriver: Platform.OS !== 'web' }).start(() => setEntrou(true));
  }, [entrada, animada]);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + (comDoca ? 56 + 20 : 24), paddingBottom: insets.bottom + (comDoca ? 110 : 40), alignItems: 'center' }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => definirRolagem(e.nativeEvent.contentOffset.y)}
      >
        <Animated.View
          style={entrou ? { width: '100%', maxWidth: larguraMax, paddingHorizontal: 20 } : {
            width: '100%', maxWidth: larguraMax, paddingHorizontal: 20, opacity: entrada,
            transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
          }}
        >
          {children}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ---------- Folha: painel que sobe de baixo ---------- */
export function Folha({ aberta, aoFechar, titulo, children }: { aberta: boolean; aoFechar: () => void; titulo?: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  /* garantia de saída: o Modal só se desmonta quando o sistema avisa que a animação terminou; se esse aviso não vier
     (janela em segundo plano, por exemplo), a folha ficaria aberta por cima de tudo. Passados 400 ms, ela sai de qualquer jeito. */
  const [montada, setMontada] = useState(aberta);
  useEffect(() => {
    if (aberta) { setMontada(true); return undefined; }
    const t = setTimeout(() => setMontada(false), 400);
    return () => clearTimeout(t);
  }, [aberta]);
  if (!montada && !aberta) return null;
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

const st = estilos(() => StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  espaco: { width: '100%', maxWidth: larguraMax, alignSelf: 'center' },
  corpo: { backgroundColor: cores.painel, borderColor: cores.linha2, borderWidth: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12 },
  alca: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: cores.linha2, marginBottom: 16 },
  aviso: { position: 'absolute', left: 24, right: 24, alignSelf: 'center', maxWidth: 420, backgroundColor: cores.aviso, borderColor: cores.linha2, borderWidth: 1, borderRadius: raio.pilula, paddingVertical: 12, paddingHorizontal: 20, boxShadow: '0 16px 34px -14px rgba(0,0,0,0.9)' },
}));
