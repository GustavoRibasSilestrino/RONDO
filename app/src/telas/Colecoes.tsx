/* Missões: as que estão em andamento e as cumpridas. Cada missão cumprida dá um brownie (um mascote para a coleção do perfil;
   desde 2026-11-19, no lugar das medalhas), e cada nível de conta também. A raridade sobe a cada brownie ganho. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Folha, Tela } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Barra, Cartao, T } from '../componentes/Ui';
import { useLoja } from '../estado/loja';
import { COLECOES, emAndamento, missoesDe, textoValor, type MissaoVista } from '../lib/missoes';
import { cores, estilos } from '../tema';

/* o ícone da missão: o brownie, aceso quando cumprida */
function Selo({ m, tamanho }: { m: MissaoVista; tamanho: number }) {
  return (
    <View style={[st.selo, { width: tamanho, height: tamanho, borderRadius: tamanho * 0.3 }, m.cumprida && st.seloAceso]}>
      <Icone nome={m.cumprida ? 'brownie' : 'cadeado'} tamanho={Math.round(tamanho * 0.5)} cor={m.cumprida ? '#ffffff' : cores.texto3} />
    </View>
  );
}

export function Colecoes() {
  const { estado } = useLoja();
  const [aberta, setAberta] = useState<MissaoVista | null>(null);
  const todas = missoesDe(estado, new Date());
  /* uma missão de sequência pode "desacender" se a sequência quebrar, mas o brownie dela já foi dado: conta como cumprida */
  const pedidas = new Set(estado.recompensasPedidas ?? []);
  const vistas = todas.map((m) => (pedidas.has(`missao:${m.id}`) ? { ...m, cumprida: true, atual: m.meta } : m));
  const feitas = vistas.filter((m) => m.cumprida);
  const andamento = emAndamento(vistas);

  return (
    <Tela>
      <T tam={15} peso="400" centro>Missões</T>
      <T tam={13} centro cor={cores.texto2} style={{ marginTop: 6 }}>Cada missão cumprida dá um brownie para a sua coleção. Quanto mais você ganha, mais raros eles ficam.</T>

      <Cartao destaque style={{ marginTop: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T tam={34} peso="200">{feitas.length} de {vistas.length}</T>
          <T tam={13} cor={cores.texto2}>missões cumpridas</T>
        </View>
        <View style={{ marginTop: 12 }}>
          <Barra valor={feitas.length} max={vistas.length} cor={cores.destaque2} />
        </View>
      </Cartao>

      <T tam={20} peso="300" style={{ letterSpacing: -0.4, marginTop: 24, marginBottom: 14 }}>Em andamento</T>
      {andamento.length === 0 ? (
        <T tam={14} cor={cores.texto2}>Todas as missões cumpridas. Os próximos brownies vêm com os níveis.</T>
      ) : (
        <View style={{ gap: 10 }}>
          {andamento.map((m) => (
            <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`Missão: ${m.desc} ${textoValor(m, m.atual)} de ${textoValor(m, m.meta)}`} onPress={() => setAberta(m)} style={({ pressed }) => [st.missao, pressed && { opacity: 0.85 }]}>
              <Selo m={m} tamanho={48} />
              <View style={{ flex: 1, gap: 6 }}>
                <T tam={14.5} peso="400" style={{ lineHeight: 20 }}>{m.desc}</T>
                <Barra valor={m.atual} max={m.meta} cor={cores.destaque2} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T tam={12} mono cor={cores.texto2}>{textoValor(m, m.atual)} / {textoValor(m, m.meta)}</T>
                  <T tam={12} cor={cores.texto3} linhas={1}>{m.nome}</T>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {feitas.length ? (
        COLECOES.map((c) => {
          const lista = feitas.filter((m) => m.colecao === c.id);
          if (!lista.length) return null;
          return (
            <View key={c.id} style={{ marginTop: 26 }}>
              <T tam={20} peso="300" style={{ letterSpacing: -0.4, marginBottom: 10 }}>Cumpridas · {c.nome}</T>
              <View style={{ gap: 8 }}>
                {lista.map((m) => (
                  <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`Missão cumprida: ${m.desc}`} onPress={() => setAberta(m)} style={st.feita}>
                    <Selo m={m} tamanho={34} />
                    <T tam={14} cor={cores.texto2} linhas={1} style={{ flex: 1 }}>{m.desc}</T>
                    <Icone nome="ok" tamanho={18} cor={cores.bom} />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })
      ) : null}

      <Folha aberta={aberta !== null} aoFechar={() => setAberta(null)} titulo={aberta?.nome}>
        {aberta ? (
          <View style={{ alignItems: 'center', gap: 12, paddingBottom: 6 }}>
            <Selo m={aberta} tamanho={88} />
            <T tam={11.5} peso="500" cor={cores.destaque2} style={{ letterSpacing: 0.4 }}>MISSÃO</T>
            <T tam={16} centro style={{ lineHeight: 23, marginTop: -6 }}>{aberta.desc}</T>
            {aberta.cumprida ? (
              <T tam={14} peso="500" cor={cores.bom} centro>Missão cumprida. O brownie dela já está na sua coleção.</T>
            ) : (
              <View style={{ width: '100%', gap: 8 }}>
                <Barra valor={aberta.atual} max={aberta.meta} cor={cores.destaque} />
                <T tam={13} cor={cores.texto2} centro>{textoValor(aberta, aberta.atual)} de {textoValor(aberta, aberta.meta)}. Recompensa: um brownie.</T>
              </View>
            )}
          </View>
        ) : null}
      </Folha>
    </Tela>
  );
}

const st = estilos(() => StyleSheet.create({
  missao: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: cores.linha2, backgroundColor: `rgba(${cores.tinta},0.045)`, minHeight: 44 },
  feita: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 10, minHeight: 44 },
  selo: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: cores.linha2, backgroundColor: `rgba(${cores.tinta},0.04)` },
  seloAceso: { borderColor: 'transparent', backgroundColor: cores.destaqueForte },
}));
