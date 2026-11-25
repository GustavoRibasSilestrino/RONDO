/* A tela do mascote em 3D (desde 2026-11-25, pedido do dono: "quando a pessoa clicar no mascote, abra uma tela que dê
   para ela vê-lo, girá-lo"). Abre por cima de tudo, na noite roxa da coleção: o nome, a raridade e o mascote no meio, que
   gira sozinho devagar até a pessoa arrastar (girar) ou usar dois dedos (aproximar).

   O 3D é a página public/visor3d.html (three.js), aberta numa WebView no celular e num iframe no navegador
   (QuadroVisor.tsx / QuadroVisor.web.tsx). Os modelos ficam em public/modelos/<chave>.glb, exportados do Blender por
   brand/mascotes-voxel/exportar.py. Enquanto carrega, aparece o retrato do mascote (a folha), para a tela nunca ficar
   vazia; se o 3D falhar (sem internet), o retrato fica e um aviso diz o que houve. */
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mascoteDe } from '../lib/mascotes';
import { Mascote } from './Mascote';
import { EstrelasPixel, Pixels, PX, TP, X_MAPA } from './Pixel';
import { QuadroVisor } from './QuadroVisor';

type Estado = 'carregando' | 'pronto' | 'erro';

export function Visor3D({ chave, nome, aoFechar }: { chave: string | null; nome?: string | null; aoFechar: () => void }) {
  const [visto, setVisto] = useState<string | null>(chave);   // o último aberto fica na tela enquanto ela some
  const [estado, setEstado] = useState<Estado>('carregando');
  const ins = useSafeAreaInsets();
  useEffect(() => { if (chave) { setVisto(chave); setEstado('carregando'); } }, [chave]);
  const aoAviso = useCallback((msg: string) => {
    if (msg === 'pronto') setEstado('pronto');
    else if (msg === 'erro') setEstado('erro');
  }, []);
  const m = mascoteDe(chave ?? visto);
  if (!m) return null;
  const endereco = `/visor3d.html?m=${m.chave}&c=${m.raridade.cor.slice(1)}`;
  return (
    <Modal visible={chave !== null} animationType="fade" onRequestClose={aoFechar} statusBarTranslucent presentationStyle="overFullScreen" transparent>
      <View style={st.fundo} accessibilityViewIsModal>
        <View style={[st.topo, { paddingTop: ins.top + 8 }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <TP tam={22} peso="500" cor={PX.ouroClaro} linhas={1}>{nome || m.nome}</TP>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <EstrelasPixel n={m.raridade.estrelas} cor={m.raridade.cor} tamanho={11} />
              <TP tam={14} cor={m.raridade.cor} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{m.raridade.nome}</TP>
              {nome ? <TP tam={14} cor={PX.tinta2}>· {m.nome}</TP> : null}
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} hitSlop={10} style={({ pressed }) => [st.x, pressed && { opacity: 0.6 }]}>
            <Pixels mapa={X_MAPA} cores={{ X: PX.tinta2 }} tamanho={18} />
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>
          {/* o retrato, enquanto o 3D carrega (ou se ele não carregar) */}
          {estado !== 'pronto' ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, st.centro]}>
              <View style={[st.brilho, { backgroundColor: m.raridade.cor }]} />
              <Mascote chave={m.chave} tamanho={260} />
              <TP tam={14} cor={PX.tinta2} style={{ marginTop: 14 }}>
                {estado === 'erro' ? 'Não deu para abrir em 3D agora. Confira a internet.' : 'Preparando o 3D...'}
              </TP>
            </View>
          ) : null}
          {chave !== null ? (
            <View style={[{ flex: 1 }, estado !== 'pronto' && { opacity: 0 }]}>
              <QuadroVisor key={m.chave} endereco={endereco} aoAviso={aoAviso} />
            </View>
          ) : null}
        </View>
        <View style={{ height: ins.bottom }} />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: PX.noite2 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingBottom: 6 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  centro: { alignItems: 'center', justifyContent: 'center' },
  brilho: { position: 'absolute', width: 260, height: 260, borderRadius: 130, opacity: 0.18 },
});
