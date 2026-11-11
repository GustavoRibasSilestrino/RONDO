/* A análise da execução no app instalado (iPhone e Android). Ao tocar na câmera, o app pede ao celular a permissão de usar a
   câmera (o aviso do próprio sistema); com ela concedida, abre em tela cheia a mesma análise da versão do navegador
   (AnaliseExecucao.web.tsx: a pergunta do RONDIN, o vídeo e as correções desenhadas por cima), carregada do site do RONDO
   num WebView que tem acesso à câmera. A análise roda no aparelho: o vídeo não é gravado nem enviado. */
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { SITE } from '../telas/Login';
import { Folha } from './Estrutura';
import { Icone } from './Icone';
import { Botao, T } from './Ui';

type Situacao = 'pedindo' | 'liberada' | 'negada';

export function AnaliseExecucao({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const [situacao, setSituacao] = useState<Situacao>('pedindo');
  const [podePerguntar, setPodePerguntar] = useState(true);

  /* abriu: pede a permissão da câmera ao celular (se já foi dada, volta na hora, sem aviso) */
  useEffect(() => {
    if (!aberta) return;
    let vivo = true;
    setSituacao('pedindo');
    ImagePicker.requestCameraPermissionsAsync().then((r) => {
      if (!vivo) return;
      setPodePerguntar(r.canAskAgain);
      setSituacao(r.granted ? 'liberada' : 'negada');
    }).catch(() => vivo && setSituacao('negada'));
    return () => { vivo = false; };
  }, [aberta]);

  if (!aberta) return null;

  if (situacao === 'negada') {
    return (
      <Folha aberta aoFechar={aoFechar} titulo="Análise da execução">
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Icone nome="camera" tamanho={34} cor="#ffffff" />
          <T tam={15} centro style={{ lineHeight: 22 }}>
            Para analisar a execução, o RONDO precisa usar a câmera. O vídeo fica só no seu celular: não é gravado nem enviado.
          </T>
          {podePerguntar ? (
            <Botao icone="camera" titulo="Permitir a câmera" aoPressionar={async () => {
              const r = await ImagePicker.requestCameraPermissionsAsync();
              setPodePerguntar(r.canAskAgain);
              if (r.granted) setSituacao('liberada');
            }} style={{ alignSelf: 'stretch' }} />
          ) : (
            <Botao icone="camera" titulo="Abrir os ajustes do celular" aoPressionar={() => Linking.openSettings()} style={{ alignSelf: 'stretch' }} />
          )}
        </View>
      </Folha>
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={aoFechar} statusBarTranslucent>
      <View style={st.fundo}>
        {situacao === 'liberada' ? (
          <WebView
            source={{ uri: `${SITE}/app/?camera=1` }}
            style={st.fundo}
            originWhitelist={[SITE]}
            /* a página pede a câmera ao WebView: com a permissão do app já concedida, o WebView repassa sem perguntar de novo */
            mediaCapturePermissionGrantType="grant"
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            startInLoadingState
            renderLoading={() => <View style={[st.fundo, st.centro]}><ActivityIndicator color="#a78bfa" /></View>}
            /* o X da página fecha a tela aqui */
            onMessage={(e) => { if (e.nativeEvent.data === 'fechar') aoFechar(); }}
            /* só o próprio site do RONDO abre dentro: qualquer outro link vai para o navegador */
            onShouldStartLoadWithRequest={(r) => {
              if (r.url.startsWith(SITE) || r.url.startsWith('about:') || r.url.startsWith('blob:')) return true;
              Linking.openURL(r.url).catch(() => {});
              return false;
            }}
          />
        ) : (
          <View style={[st.fundo, st.centro]}><ActivityIndicator color="#a78bfa" /></View>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: '#07060b' },
  centro: { alignItems: 'center', justifyContent: 'center' },
});
