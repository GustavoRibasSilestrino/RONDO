/* A tela do mascote, em 3D (desde 2026-11-25, pedidos do dono: "quando a pessoa clicar no mascote, abra uma tela que dê
   para ela vê-lo, girá-lo" e depois "quero que essas opções fiquem no 3D, não quero a tela anterior, e o 3D ativo no
   momento em que a pessoa clicar, não carregando"). Tocar num mascote da Coleção abre direto esta tela, por cima de tudo,
   na noite roxa: o nome e a raridade em cima; o mascote no meio, girando devagar até a pessoa arrastar (girar) ou usar
   dois dedos ou a rodinha (aproximar); embaixo, o número, o NÍVEL (lib/nivelMascote.ts) e as ações: usar como meu
   mascote, dar um nome (lápis) e, se for repetido, propor troca.

   O 3D é a página public/visor3d.html (three.js), numa WebView no celular e num iframe no navegador
   (componentes/QuadroVisor). Para abrir na hora, a Coleção deixa o three.js, o decodificador e os modelos da conta
   pré-carregados (PreCarregar3D); e, enquanto o 3D monta, o retrato do mascote fica no mesmo lugar e some quando o 3D
   aparece, sem tela de carregando. Sem internet, o retrato fica. */
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MascoteDaColecao } from '../../api/mascotes';
import { Mascote } from '../../componentes/Mascote';
import { BotaoPixel, EstrelasPixel, Pixels, PX, TP, X_MAPA } from '../../componentes/Pixel';
import { QuadroVisor } from '../../componentes/QuadroVisor';
import { TOTAL_MASCOTES, type MascoteInfo } from '../../lib/mascotes';
import { progressoMascote, XP_MASCOTE } from '../../lib/nivelMascote';

const endereco = (m: MascoteInfo) => `/visor3d.html?m=${m.chave}&c=${m.raridade.cor.slice(1)}`;

/* escondido, na Coleção: carrega o three.js, o decodificador e os modelos da conta, para a tela do mascote abrir na hora */
export function PreCarregar3D({ chaves }: { chaves: string[] }) {
  const ignorar = useCallback(() => undefined, []);
  if (!chaves.length) return null;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={st.escondido}>
      <QuadroVisor endereco={`/visor3d.html?pre=${chaves.join(',')}`} aoAviso={ignorar} />
    </View>
  );
}

type Props = {
  mascote: MascoteInfo | null; item?: MascoteDaColecao; ehMeu: boolean; salvando: boolean; lapis: number;
  xp?: number;   // o XP deste mascote (só o mascote escolhido ganha XP, a cada treino e a cada missão cumprida)
  aoFechar: () => void; aoUsar: (chave: string | null) => void; aoDarNome: (m: MascoteInfo) => void; aoTrocar: (m: MascoteInfo) => void;
};

export function TelaMascote({ mascote, item, ehMeu, salvando, lapis, xp = 0, aoFechar, aoUsar, aoDarNome, aoTrocar }: Props) {
  const [visto, setVisto] = useState<MascoteInfo | null>(mascote);   // o último aberto fica na tela enquanto ela some
  const [pronto, setPronto] = useState(false);
  const ins = useSafeAreaInsets();
  useEffect(() => { if (mascote) { setVisto(mascote); setPronto(false); } }, [mascote]);
  const aoAviso = useCallback((msg: string) => { if (msg === 'pronto') setPronto(true); }, []);
  const m = mascote ?? visto;
  if (!m) return null;
  const proprio = item?.nome ?? null;
  const quantos = item?.quantidade ?? 1;
  const pm = progressoMascote(xp);
  return (
    <Modal visible={mascote !== null} animationType="fade" onRequestClose={aoFechar} statusBarTranslucent transparent>
      <View style={st.fundo} accessibilityViewIsModal>
        {/* o nome e a raridade */}
        <View style={[st.topo, { paddingTop: ins.top + 10 }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <TP tam={23} peso="500" cor={PX.ouroClaro} linhas={1}>{proprio ?? m.nome}</TP>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <EstrelasPixel n={m.raridade.estrelas} cor={m.raridade.cor} tamanho={11} />
              <TP tam={14} cor={m.raridade.cor} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>{m.raridade.nome}</TP>
              {proprio ? <TP tam={14} cor={PX.tinta2}>· {m.nome}</TP> : null}
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={aoFechar} hitSlop={10} style={({ pressed }) => [st.x, pressed && { opacity: 0.6 }]}>
            <Pixels mapa={X_MAPA} cores={{ X: PX.tinta2 }} tamanho={18} />
          </Pressable>
        </View>

        {/* o mascote em 3D; o retrato fica no lugar até o 3D aparecer */}
        <View style={{ flex: 1 }}>
          {!pronto ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, st.centro]}>
              <Mascote chave={m.chave} tamanho={240} />
            </View>
          ) : null}
          {mascote !== null ? (
            <View style={[{ flex: 1 }, !pronto && { opacity: 0 }]}>
              <QuadroVisor key={m.chave} endereco={endereco(m)} aoAviso={aoAviso} />
            </View>
          ) : null}
        </View>

        {/* o número, o nível e as ações */}
        <View style={[st.painel, { paddingBottom: ins.bottom + 16 }]}>
          <View style={st.painelDentro}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <TP tam={15}>Nº {m.numero} de {TOTAL_MASCOTES}{quantos > 1 ? ` · você tem ${quantos}` : ''}</TP>
              {ehMeu ? <TP tam={14.5} cor={PX.verde}>O seu mascote</TP> : null}
            </View>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <TP tam={18} peso="500" cor={PX.ouroClaro}>Nível {pm.nivel}</TP>
                <TP tam={14.5} cor={PX.tinta2}>{pm.noNivel}/{pm.tamanho} XP</TP>
              </View>
              <View
                accessible accessibilityRole="progressbar" accessibilityLabel={`Nível ${pm.nivel}: ${pm.noNivel} de ${pm.tamanho} XP para o próximo`}
                accessibilityValue={{ min: 0, max: pm.tamanho, now: pm.noNivel }} style={st.trilhoNivel}
              >
                <View style={{ width: `${Math.round(pm.p * 100)}%`, height: '100%', backgroundColor: PX.ouro }} />
              </View>
              <TP tam={13} cor={PX.tinta2} centro style={{ lineHeight: 17 }}>
                {ehMeu
                  ? `Ele ganha +${XP_MASCOTE.treino} XP a cada treino e +${XP_MASCOTE.missao} XP a cada missão cumprida.`
                  : `Só o seu mascote ganha XP. Use este para ele ganhar +${XP_MASCOTE.treino} a cada treino e +${XP_MASCOTE.missao} a cada missão.`}
              </TP>
            </View>
            <View style={{ gap: 8 }}>
              {ehMeu
                ? <BotaoPixel tipo="escuro" titulo="Não mostrar mascote" aoPressionar={() => aoUsar(null)} carregando={salvando} />
                : <BotaoPixel titulo="Usar como meu mascote" aoPressionar={() => aoUsar(m.chave)} carregando={salvando} />}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <BotaoPixel tipo="escuro" titulo={proprio ? `Mudar nome (${lapis})` : `Dar nome (${lapis})`} aoPressionar={() => aoDarNome(m)} style={{ flex: 1 }} />
                {quantos > 1 ? <BotaoPixel tipo="escuro" titulo="Propor troca" aoPressionar={() => aoTrocar(m)} style={{ flex: 1 }} /> : null}
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: PX.noite2 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingBottom: 4 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  centro: { alignItems: 'center', justifyContent: 'center' },
  painel: { paddingHorizontal: 18, paddingTop: 6, alignItems: 'center' },
  painelDentro: { width: '100%', maxWidth: 460, gap: 14 },
  trilhoNivel: { height: 16, borderWidth: 3, borderColor: PX.contorno, backgroundColor: PX.noite },
  escondido: { position: 'absolute', width: 2, height: 2, left: 0, top: 0, opacity: 0, overflow: 'hidden' },
});
