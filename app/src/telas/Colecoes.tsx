/* Coleções: as missões em andamento e as medalhas que elas premiam. Cada medalha é a recompensa de uma missão. */
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Medalha3D } from '../componentes/Medalha3D';
import { Folha, Tela } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Barra, Cartao, Segmentos, T } from '../componentes/Ui';
import { useLoja } from '../estado/loja';
import { COLECOES, emAndamento, MedalhaVista, medalhasDe, textoValor } from '../lib/medalhas';
import { cores, estilos } from '../tema';

/* a imagem da medalha; fechada fica apagada, com um cadeado */
function Selo({ m, tamanho }: { m: MedalhaVista; tamanho: number }) {
  return (
    <View style={{ width: tamanho, height: tamanho * 0.95, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={m.img} accessibilityIgnoresInvertColors style={{ width: tamanho, height: tamanho * 0.95, opacity: m.aberta ? 1 : 0.4 }} resizeMode="contain" />
      {!m.aberta ? (
        <View pointerEvents="none" style={st.cadeado}>
          <Icone nome="cadeado" tamanho={Math.round(tamanho * 0.22)} cor="#ffffff" />
        </View>
      ) : null}
    </View>
  );
}

export function Colecoes() {
  const { estado } = useLoja();
  const [aba, setAba] = useState<'missoes' | 'medalhas'>('missoes');
  const [aberta, setAberta] = useState<MedalhaVista | null>(null);
  const todas = medalhasDe(estado, new Date());
  const ganhas = todas.filter((m) => m.aberta);
  const andamento = emAndamento(todas);

  return (
    <Tela>
      <T tam={15} peso="400" centro>Coleções</T>
      <T tam={13} centro cor={cores.texto2} style={{ marginTop: 6 }}>Cumpra missões e ganhe medalhas.</T>

      <Cartao destaque style={{ marginTop: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T tam={34} peso="200">{ganhas.length} de {todas.length}</T>
          <T tam={13} cor={cores.texto2}>medalhas ganhas</T>
        </View>
        <View style={{ marginTop: 12 }}>
          <Barra valor={ganhas.length} max={todas.length} cor={cores.destaque2} />
        </View>
      </Cartao>

      <View style={{ marginTop: 20 }}>
        <Segmentos opcoes={[{ valor: 'missoes', nome: 'Missões' }, { valor: 'medalhas', nome: 'Medalhas' }]} valor={aba} aoMudar={setAba} />
      </View>

      {aba === 'missoes' ? (
        <View style={{ marginTop: 22 }}>
          <T tam={20} peso="300" style={{ letterSpacing: -0.4, marginBottom: 14 }}>Em andamento</T>
          {andamento.length === 0 ? (
            <T tam={14} cor={cores.texto2}>Todas as missões cumpridas. Você abriu todas as medalhas.</T>
          ) : (
            <View style={{ gap: 10 }}>
              {andamento.map((m) => (
                <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`Missão: ${m.desc} ${textoValor(m, m.atual)} de ${textoValor(m, m.meta)}`} onPress={() => setAberta(m)} style={({ pressed }) => [st.missao, pressed && { opacity: 0.85 }]}>
                  <Selo m={m} tamanho={64} />
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

          {ganhas.length ? (
            <>
              <T tam={20} peso="300" style={{ letterSpacing: -0.4, marginTop: 28, marginBottom: 14 }}>Cumpridas</T>
              <View style={{ gap: 8 }}>
                {ganhas.map((m) => (
                  <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`Missão cumprida: ${m.desc}`} onPress={() => setAberta(m)} style={st.feita}>
                    <Selo m={m} tamanho={40} />
                    <T tam={14} cor={cores.texto2} linhas={1} style={{ flex: 1 }}>{m.desc}</T>
                    <Icone nome="ok" tamanho={18} cor={cores.bom} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </View>
      ) : (
        COLECOES.map((c) => {
          const lista = todas.filter((m) => m.colecao === c.id);
          const n = lista.filter((m) => m.aberta).length;
          return (
            <View key={c.id} style={{ marginTop: 26 }}>
              <View style={st.cabeca}>
                <T tam={20} peso="300" style={{ letterSpacing: -0.4 }}>{c.nome}</T>
                <T tam={13} cor={n === lista.length ? cores.bom : cores.texto2}>{n}/{lista.length}</T>
              </View>
              <View style={st.grade}>
                {lista.map((m) => (
                  <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`${m.nome}, ${m.aberta ? 'conquistada' : `${textoValor(m, m.atual)} de ${textoValor(m, m.meta)}`}`} onPress={() => setAberta(m)} style={st.item}>
                    <Selo m={m} tamanho={92} />
                    {!m.aberta ? <T tam={11.5} mono cor={cores.texto3} style={{ marginTop: 2 }}>{textoValor(m, m.atual)}/{textoValor(m, m.meta)}</T> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })
      )}

      <Folha aberta={aberta !== null} aoFechar={() => setAberta(null)} titulo={aberta?.nome}>
        {aberta ? (
          <View style={{ alignItems: 'center', gap: 12, paddingBottom: 6 }}>
            <Medalha3D frente={aberta.img} verso={aberta.verso} tamanho={230} apagada={!aberta.aberta} />
            <T tam={12} cor={cores.placeholder}>Arraste para girar a medalha</T>
            <T tam={11.5} peso="500" cor={cores.destaque2} style={{ letterSpacing: 0.4 }}>MISSÃO</T>
            <T tam={16} centro style={{ lineHeight: 23, marginTop: -6 }}>{aberta.desc}</T>
            {aberta.aberta ? (
              <T tam={14} peso="500" cor={cores.bom}>Missão cumprida. Medalha ganha.</T>
            ) : (
              <View style={{ width: '100%', gap: 8 }}>
                <Barra valor={aberta.atual} max={aberta.meta} cor={cores.destaque} />
                <T tam={13} cor={cores.texto2} centro>{textoValor(aberta, aberta.atual)} de {textoValor(aberta, aberta.meta)}</T>
              </View>
            )}
          </View>
        ) : null}
      </Folha>
    </Tela>
  );
}

const st = estilos(() => StyleSheet.create({
  missao: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 4, borderWidth: 1, borderColor: cores.linha2, backgroundColor: 'rgba(255,255,255,0.045)', minHeight: 44 },
  feita: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 10, minHeight: 44 },
  cabeca: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  item: { width: '33.33%', alignItems: 'center', minHeight: 44 },
  cadeado: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
}));
