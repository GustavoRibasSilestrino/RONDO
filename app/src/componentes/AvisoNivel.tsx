/* O aviso de nível novo: aparece quando a conta sobe de nível, com o benefício liberado. No nível 15 oferece ativar o tema Ultra. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useLoja } from '../estado/loja';
import { BENEFICIOS, NIVEL_ULTRA } from '../lib/beneficios';
import { useMovimentoReduzido } from '../lib/movimento';
import { nivelDe, xpTotal } from '../lib/nivel';
import { adicionar } from '../lib/notificacoes';
import { PATENTES } from '../lib/patentes';
import { cores, estilos, larguraMax } from '../tema';
import { Icone } from './Icone';
import { useTrocaTema } from './TrocaTema';
import { Botao, T } from './Ui';

export function AvisoNivel() {
  const { estado, pronto, commit } = useLoja();
  const trocarTema = useTrocaTema();
  const reduzido = useMovimentoReduzido();
  const nativo = Platform.OS !== 'web';
  const nivel = nivelDe(xpTotal(estado));
  const [mostrar, setMostrar] = useState<{ de: number; para: number } | null>(null);
  const entrada = useRef(new Animated.Value(0)).current;
  const numero = useRef(new Animated.Value(0)).current;
  const anel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pronto || !estado.usuario || mostrar) return;
    if (estado.nivelAvisado === null || nivel < estado.nivelAvisado) { commit((e) => { e.nivelAvisado = nivel; }); return; }   // a primeira leitura não comemora
    if (nivel > estado.nivelAvisado) setMostrar({ de: estado.nivelAvisado, para: nivel });
  }, [pronto, estado.usuario, estado.nivelAvisado, nivel, mostrar, commit]);

  useEffect(() => {
    if (!mostrar) return undefined;
    entrada.setValue(0); numero.setValue(0); anel.setValue(0);
    if (reduzido) { entrada.setValue(1); numero.setValue(1); return undefined; }
    const a = Animated.parallel([
      Animated.timing(entrada, { toValue: 1, duration: 260, useNativeDriver: nativo }),
      Animated.sequence([Animated.delay(120), Animated.spring(numero, { toValue: 1, friction: 5, tension: 120, useNativeDriver: nativo })]),
    ]);
    const laco = Animated.loop(Animated.timing(anel, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: nativo }));
    a.start(); laco.start();
    return () => { a.stop(); laco.stop(); };
  }, [mostrar, entrada, numero, anel, nativo, reduzido]);

  if (!mostrar) return null;

  const ganhos = BENEFICIOS.filter((b) => b.nivel > mostrar.de && b.nivel <= mostrar.para);
  const vistos = ganhos.slice(-3);   // se subiu vários níveis de uma vez, mostra os três últimos
  const resto = ganhos.length - vistos.length;
  const patente = PATENTES.find((p) => p.nivel === mostrar.para);
  const ultra = mostrar.de < NIVEL_ULTRA && mostrar.para >= NIVEL_ULTRA;

  const fechar = () => {
    const para = mostrar.para;
    commit((e) => {
      e.nivelAvisado = para;
      adicionar(e, { tipo: 'medalha', texto: `Você chegou ao nível ${para}.${ganhos.length ? ` ${ganhos[ganhos.length - 1].texto}.` : ''}` });
    });
    setMostrar(null);
  };

  return (
    <Animated.View style={[st.fundo, { opacity: entrada }]} accessibilityViewIsModal>
      <View style={st.cartao}>
        <View style={st.palco}>
          <Animated.View pointerEvents="none" style={[st.anel, { opacity: anel.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: anel.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.7] }) }] }]} />
          {patente ? (
            <Animated.View style={{ transform: [{ scale: numero }] }}>
              <Image source={patente.img} style={{ width: 150, height: 142 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </Animated.View>
          ) : (
            <Animated.View style={[st.selo, { transform: [{ scale: numero }] }]}>
              <T tam={44} peso="500">{mostrar.para}</T>
            </Animated.View>
          )}
        </View>
        <T tam={13} peso="500" centro style={{ letterSpacing: 2 }}>NÍVEL {mostrar.para}</T>
        <T tam={22} peso="500" centro style={{ marginTop: 6 }}>Você subiu de nível!</T>

        <View style={{ gap: 8, marginTop: 18, alignSelf: 'stretch' }}>
          {vistos.map((b) => (
            <View key={b.nivel} style={st.beneficio}>
              <Icone nome="ok" tamanho={18} cor={cores.bom} />
              <T tam={14} style={{ flex: 1, lineHeight: 20 }}>{b.texto}</T>
            </View>
          ))}
          {resto > 0 ? <T tam={12.5} centro>e mais {resto} {resto === 1 ? 'benefício' : 'benefícios'} em Perfil, Benefícios por nível</T> : null}
        </View>

        <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 20 }}>
          {ultra ? (
            <Botao icone="ia" titulo="Ativar o tema Ultra" aoPressionar={() => { fechar(); trocarTema('ultra'); }} />
          ) : null}
          <Botao tipo={ultra ? 'discreto' : 'primario'} titulo="Continuar" aoPressionar={fechar} />
        </View>
      </View>
    </Animated.View>
  );
}

const st = estilos(() => StyleSheet.create({
  fundo: { ...StyleSheet.absoluteFill, zIndex: 2500, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  cartao: { width: '100%', maxWidth: Math.min(larguraMax, 400), alignItems: 'center', padding: 24, borderRadius: 4, backgroundColor: cores.painel, borderWidth: 1, borderColor: cores.linha2 },
  palco: { width: 170, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  anel: { position: 'absolute', width: 130, height: 130, borderRadius: 4, borderWidth: 2, borderColor: cores.destaque },
  selo: { width: 112, height: 112, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  beneficio: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 4, borderWidth: 1, borderColor: cores.linha, backgroundColor: cores.cartao },
}));
