/* Aba Ranking: pontos da semana, medindo constância (nunca peso perdido nem aparência). */
import React from 'react';
import { View } from 'react-native';
import { Cartao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { fmt } from '../../lib/datas';
import { pontosSemana } from '../../lib/calc';
import { cores } from '../../tema';
import { Avatar } from './Avatar';

export function Ranking() {
  const { estado } = useLoja();
  const meuRanking = pontosSemana(estado, new Date());
  const ranking = [{ nome: estado.usuario?.nome ?? 'Você', pontos: meuRanking, voce: true }];   // o ranking entre pessoas ainda não existe no servidor

  return (
    <View style={{ marginTop: 18 }}>
      <Cartao>
        <T tam={12} mono cor={cores.texto3}>PONTOS DA SEMANA</T>
        {ranking.map((r, i) => (
          <View key={r.nome} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: i === ranking.length - 1 ? 0 : 1, borderBottomColor: cores.linha, backgroundColor: r.voce ? `rgba(${cores.tom},0.12)` : 'transparent', marginHorizontal: r.voce ? -8 : 0, paddingHorizontal: r.voce ? 8 : 0, borderRadius: r.voce ? 6 : 0 }}>
            <T tam={13} mono cor={cores.texto3} style={{ width: 20 }}>{i + 1}</T>
            <Avatar nome={r.nome} voce={r.voce} />
            <T tam={15} peso={r.voce ? '500' : '300'} style={{ flex: 1 }}>{r.voce ? 'Você' : r.nome}</T>
            <T tam={14} mono>{fmt(r.pontos)}</T>
          </View>
        ))}
      </Cartao>
      <T tam={12} cor={cores.texto3} style={{ marginTop: 14, lineHeight: 18 }}>
        O ranking mede constância: treino +30, refeições +20, check-in +10 e meta de água +5 por dia. Nunca peso perdido ou aparência.
      </T>
    </View>
  );
}
