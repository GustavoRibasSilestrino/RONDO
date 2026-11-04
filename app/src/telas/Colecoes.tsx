/* Coleções: as medalhas de conquista, agrupadas por tema. Aberta ganha cor e brilho; fechada mostra quanto falta. */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Folha, Tela } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Barra, Cartao, T } from '../componentes/Ui';
import { useLoja } from '../estado/loja';
import { CORES_GRUPO } from '../lib/grupos';
import { COLECOES, MedalhaVista, medalhasDe } from '../lib/medalhas';
import { cores } from '../tema';

function Selo({ m, cor, tamanho = 64 }: { m: MedalhaVista; cor: number; tamanho?: number }) {
  const par = CORES_GRUPO[cor % CORES_GRUPO.length];
  return (
    <View style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: m.aberta ? 'rgba(220,205,255,0.7)' : cores.linha }}>
      {m.aberta ? (
        <LinearGradient colors={[par[0], par[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
      )}
      <View pointerEvents="none" style={{ zIndex: 1 }}>
        <Icone nome={m.aberta ? m.icone : 'cadeado'} tamanho={Math.round(tamanho * 0.42)} cor={m.aberta ? '#ffffff' : cores.texto3} />
      </View>
    </View>
  );
}

export function Colecoes() {
  const { estado } = useLoja();
  const [aberta, setAberta] = useState<{ m: MedalhaVista; cor: number } | null>(null);
  const todas = medalhasDe(estado, new Date());
  const ganhas = todas.filter((m) => m.aberta).length;

  return (
    <Tela>
      <T tam={36} peso="200">Coleções</T>
      <T tam={14} cor={cores.texto2} style={{ marginTop: 6 }}>Cada conquista vira uma medalha.</T>

      <Cartao destaque style={{ marginTop: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T tam={34} peso="200">{ganhas} de {todas.length}</T>
          <T tam={13} cor={cores.texto2}>medalhas abertas</T>
        </View>
        <View style={{ marginTop: 12 }}>
          <Barra valor={ganhas} max={todas.length} cor={cores.destaque2} />
        </View>
      </Cartao>

      {COLECOES.map((c) => {
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
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.nome}, ${m.aberta ? 'conquistada' : `${m.atual} de ${m.meta}`}`}
                  onPress={() => setAberta({ m, cor: c.cor })}
                  style={st.item}
                >
                  <Selo m={m} cor={c.cor} />
                  <T tam={12.5} peso={m.aberta ? '500' : '300'} cor={m.aberta ? cores.texto : cores.texto2} centro linhas={2} style={{ marginTop: 8, lineHeight: 16 }}>{m.nome}</T>
                  {!m.aberta ? <T tam={11.5} mono cor={cores.texto3} style={{ marginTop: 2 }}>{m.atual}/{m.meta}</T> : null}
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}

      <Folha aberta={aberta !== null} aoFechar={() => setAberta(null)} titulo={aberta?.m.nome}>
        {aberta ? (
          <View style={{ alignItems: 'center', gap: 12, paddingBottom: 6 }}>
            <Selo m={aberta.m} cor={aberta.cor} tamanho={96} />
            <T tam={15} cor={cores.texto2} centro style={{ lineHeight: 22 }}>{aberta.m.desc}</T>
            {aberta.m.aberta ? (
              <T tam={14} peso="500" cor={cores.bom}>Conquistada</T>
            ) : (
              <View style={{ width: '100%', gap: 8 }}>
                <Barra valor={aberta.m.atual} max={aberta.m.meta} cor={cores.destaque} />
                <T tam={13} cor={cores.texto2} centro>{aberta.m.atual} de {aberta.m.meta}</T>
              </View>
            )}
          </View>
        ) : null}
      </Folha>
    </Tela>
  );
}

const st = StyleSheet.create({
  cabeca: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  item: { width: '33.33%', alignItems: 'center', paddingHorizontal: 4, minHeight: 44 },
});
