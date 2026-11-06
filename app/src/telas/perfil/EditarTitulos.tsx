/* Editar títulos: a folha que o lápis do perfil abre. Escolha até o limite do seu nível; os bloqueados mostram o nível que libera. */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Folha } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { limitesDe } from '../../lib/beneficios';
import { progressoNivel, TITULOS, xpTotal } from '../../lib/nivel';
import { cores, estilos } from '../../tema';

export function EditarTitulos({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const { estado, commit } = useLoja();
  const nivel = progressoNivel(xpTotal(estado)).nivel;
  const limites = limitesDe(nivel);

  const alternar = (id: string, liberado: boolean) => {
    if (!liberado) return;
    commit((e) => {
      const l = e.perfilSocial.titulos;
      const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1);
      else if (l.length < limites.titulos) l.push(id);
    });
  };

  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Editar títulos">
      <T tam={13} style={{ marginBottom: 12, lineHeight: 19 }}>Escolha até {limites.titulos} para mostrar no seu perfil.</T>
      <View style={st.colecao}>
        {TITULOS.map((t) => {
          const liberado = t.nivel <= nivel;
          const ativo = estado.perfilSocial.titulos.includes(t.id) && liberado;
          return (
            <Pressable key={t.id} disabled={!liberado} accessibilityRole="button" accessibilityState={{ selected: ativo, disabled: !liberado }} accessibilityLabel={liberado ? `${t.nome}${ativo ? ', exibido' : ''}` : `${t.nome}, bloqueado: nível ${t.nivel}`} onPress={() => alternar(t.id, liberado)} style={[st.chip, ativo && st.chipAtivo, !liberado && { opacity: 0.55 }]}>
              {!liberado ? <Icone nome="cadeado" tamanho={13} cor="#ffffff" /> : ativo ? <Icone nome="ok" tamanho={14} cor="#ffffff" /> : null}
              <T tam={13} peso={ativo ? '500' : '300'}>{t.nome}</T>
              {!liberado ? <T tam={11.5}>nível {t.nivel}</T> : null}
            </Pressable>
          );
        })}
      </View>
    </Folha>
  );
}

const st = estilos(() => StyleSheet.create({
  colecao: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  chipAtivo: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
}));
