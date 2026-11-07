/* "Continuar com Google" e "Continuar com a Apple", abaixo de Criar conta e Já tenho conta. Só aparecem quando o ID de cliente do provedor
   está configurado (lib/loginSocial.ts) e, por enquanto, só no navegador. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { entrarComProvedor, type ResultadoSocial } from '../api/loginSocial';
import { appleDisponivel, desenharBotaoGoogle, entrarComAppleNoNavegador, googleDisponivel } from '../lib/loginSocial';
import { cores, estilos } from '../tema';
import { T } from './Ui';

export function BotoesSociais({ aoResultado }: { aoResultado: (r: ResultadoSocial) => void }) {
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
    desenharBotaoGoogle(el, Math.min(400, Math.max(200, largura)), (t) => void entrar('google', t)).catch(() => setErro('Não foi possível carregar o login do Google agora.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [largura]);

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

  if (!googleDisponivel && !appleDisponivel) return null;
  return (
    <View style={{ gap: 12 }}>
      <View style={st.ou}><View style={st.linha} /><T tam={12.5} cor={cores.texto3}>ou</T><View style={st.linha} /></View>
      {googleDisponivel ? <View ref={caixa} onLayout={(e) => setLargura(e.nativeEvent.layout.width)} style={{ minHeight: 44, alignItems: 'center', opacity: ocupado ? 0.6 : 1 }} /> : null}
      {appleDisponivel ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Continuar com a Apple" disabled={ocupado} onPress={apple} style={({ pressed }) => [st.apple, pressed && { opacity: 0.85 }, ocupado && { opacity: 0.6 }]}>
          <T tam={15} peso="500" cor="#000000">Continuar com a Apple</T>
        </Pressable>
      ) : null}
      {erro ? <T tam={13} cor={cores.erro} centro style={{ lineHeight: 18 }}>{erro}</T> : null}
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  ou: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linha: { flex: 1, height: 1, backgroundColor: cores.linha },
  apple: { height: 44, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
}));
