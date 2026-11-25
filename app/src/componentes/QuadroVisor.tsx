/* O quadro do visor 3D no celular: uma WebView com a página public/visor3d.html (o three.js roda nela). A página avisa
   quando o mascote terminou de carregar ("pronto") ou se deu erro. Só o próprio site do RONDO abre aqui dentro. */
import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { SITE } from '../telas/Login';

export function QuadroVisor({ endereco, aoAviso }: { endereco: string; aoAviso: (msg: string) => void }) {
  return (
    <WebView
      source={{ uri: `${SITE}/app${endereco}` }}   // o app web (e os arquivos de public/) fica em /app no site
      style={st.quadro}
      containerStyle={st.quadro}
      originWhitelist={[SITE]}
      javaScriptEnabled
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      setBuiltInZoomControls={false}
      onMessage={(e) => aoAviso(e.nativeEvent.data)}
      onError={() => aoAviso('erro')}
      onShouldStartLoadWithRequest={(r) => {
        let doSite = false;
        try { doSite = new URL(r.url).origin === new URL(SITE).origin; } catch { /* endereço inválido */ }
        if (doSite || r.url.startsWith('about:') || r.url.startsWith('blob:')) return true;
        Linking.openURL(r.url).catch(() => {});
        return false;
      }}
    />
  );
}

const st = StyleSheet.create({ quadro: { flex: 1, backgroundColor: 'transparent' } });
