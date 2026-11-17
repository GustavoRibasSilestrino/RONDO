/* As formas de entrar, uma embaixo da outra, como nos apps de referência do dono (2026-11-17): "Continuar com a Apple" (o botão
   claro, o mais forte), "Continuar com o Google" (o botão oficial do Google) e "Continuar com e-mail" (contorno discreto, que abre
   os campos de e-mail e senha). Apple e Google só aparecem quando o ID de cliente do provedor está configurado
   (lib/loginSocial.ts) e, por enquanto, só no navegador; sem nenhum dos dois, a tela de entrar mostra os campos direto. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { entrarComProvedor, type ResultadoSocial } from '../api/loginSocial';
import { appleDisponivel, desenharBotaoGoogle, entrarComAppleNoNavegador, googleDisponivel } from '../lib/loginSocial';
import { CINZA_SOBRE, cores, estilos, raio } from '../tema';
import { Icone } from './Icone';
import { T } from './Ui';

export const temLoginSocial = googleDisponivel || appleDisponivel;

type Textos = { apple: string; google: string; email: string; locale: string };

/* a maçã, desenhada (o ícone da Apple é o símbolo obrigatório no botão dela) */
function Maca({ cor }: { cor: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path fill={cor} d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.41-3.65zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28z" />
    </Svg>
  );
}

const PADRAO: Textos = { apple: 'Continuar com a Apple', google: 'Continuar com o Google', email: 'Continuar com e-mail', locale: 'pt-BR' };

export function BotoesSociais({ aoResultado, aoEmail, textos = PADRAO }: { aoResultado: (r: ResultadoSocial) => void; aoEmail?: () => void; textos?: Textos }) {
  const caixa = useRef<React.ElementRef<typeof View>>(null);
  const [largura, setLargura] = useState(0);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const entrar = async (provedor: 'google' | 'apple', idToken: string) => {
    setErro(''); setOcupado(true);
    try { aoResultado(await entrarComProvedor(provedor, idToken)); } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível entrar agora.'); } finally { setOcupado(false); }
  };

  useEffect(() => {   // o botão do Google é desenhado pelo próprio Google dentro desta caixa
    if (!googleDisponivel || !largura || !caixa.current) return;
    const el = caixa.current as unknown as HTMLElement;
    desenharBotaoGoogle(el, Math.min(400, Math.max(200, largura)), (t) => void entrar('google', t), textos.locale).catch(() => setErro('Não foi possível carregar o login do Google agora.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [largura, textos.locale]);

  const apple = async () => {
    setErro(''); setOcupado(true);
    try {
      const { idToken } = await entrarComAppleNoNavegador();
      aoResultado(await entrarComProvedor('apple', idToken));
    } catch (e) {
      /* fechar a janela da Apple não é erro */
      const msg = e instanceof Error ? e.message : '';
      if (msg && !/popup_closed|user_cancelled|cancel/i.test(msg) && !(e as { error?: string }).error) setErro(msg === 'apple' ? 'Não foi possível carregar o login da Apple agora.' : msg);
    } finally { setOcupado(false); }
  };

  return (
    <View style={{ gap: 12 }}>
      {appleDisponivel ? (
        <Pressable accessibilityRole="button" accessibilityLabel={textos.apple} disabled={ocupado} onPress={apple}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.botao, st.apple, hovered && st.appleSobre, (pressed || ocupado) && { opacity: 0.8 }]}>
          <View style={st.icone}><Maca cor="#000000" /></View>
          <T tam={15} peso="500" cor="#000000">{textos.apple}</T>
        </Pressable>
      ) : null}
      {googleDisponivel ? (
        <View ref={caixa} onLayout={(e) => setLargura(e.nativeEvent.layout.width)} style={[st.google, ocupado && { opacity: 0.6 }]} accessibilityLabel={textos.google} />
      ) : null}
      {aoEmail ? (
      <Pressable accessibilityRole="button" accessibilityLabel={textos.email} onPress={aoEmail}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.botao, st.email, hovered && CINZA_SOBRE, pressed && { opacity: 0.85 }]}>
        <View style={st.icone}><Icone nome="email" tamanho={18} cor={cores.texto} /></View>
        <T tam={15} peso="500" cor={cores.texto}>{textos.email}</T>
      </Pressable>
      ) : null}
      {erro ? <T tam={13} cor={cores.erro} centro style={{ lineHeight: 18 }}>{erro}</T> : null}
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  /* o texto no meio e o ícone preso à esquerda, como nos prints */
  botao: { height: 46, borderRadius: raio.pilula, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', paddingHorizontal: 48 },
  icone: { position: 'absolute', left: 18, top: 0, bottom: 0, justifyContent: 'center' },
  apple: { backgroundColor: '#ffffff' },
  appleSobre: { backgroundColor: '#d6d4dc' },
  email: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(255,255,255,0.03)' },
  google: { minHeight: 44, alignItems: 'center' },
}));
