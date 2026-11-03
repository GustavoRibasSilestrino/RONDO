/* Oito copos de água: um toque por copo. */
import React from 'react';
import { Pressable, View } from 'react-native';
import { cores, raio } from '../tema';
import { Icone } from './Icone';

export function Copos({ cheios, aoMudar, meta = 8 }: { cheios: number; aoMudar: (n: number) => void; meta?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {Array.from({ length: meta }, (_, i) => {
        const cheio = i < cheios;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Copo ${i + 1}`}
            accessibilityState={{ selected: cheio }}
            // tocar no último copo cheio o esvazia; tocar em outro enche até ele
            onPress={() => aoMudar(cheio && i === cheios - 1 ? i : i + 1)}
            style={{ flex: 1, aspectRatio: 0.8, borderRadius: raio.m, alignItems: 'center', justifyContent: 'center', backgroundColor: cheio ? 'rgba(139,92,246,0.35)' : cores.fundo2, borderWidth: 1, borderColor: cheio ? 'rgba(196,168,255,0.55)' : cores.linha }}
          >
            <Icone nome="gota" tamanho={16} cor={cheio ? cores.destaque2 : cores.texto3} />
          </Pressable>
        );
      })}
    </View>
  );
}
