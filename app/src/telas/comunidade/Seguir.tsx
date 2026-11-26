/* Seguir é a conexão: quem você segue aparece no filtro "Seguindo" do feed. Botão pequeno em forma de pílula.
   O toque muda na hora e o servidor confirma; se falhar, volta ao que era. */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { deixarDeSeguir, seguirPessoa } from '../../api/social';
import type { Pessoa } from '../../api/social';
import { useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { cores, estilos } from '../../tema';

/* seguir ou deixar de seguir: muda na hora e o servidor confirma; se falhar, volta ao que era (o perfil usa no botão grande) */
export function useSeguir(pessoa: Pick<Pessoa, 'id' | 'nome' | 'seguindo'>) {
  const { atualizarSocial } = useLoja();
  const avisar = useAviso();
  const [seguindo, setSeguindo] = useState(pessoa.seguindo);
  const ocupado = useRef(false);
  useEffect(() => setSeguindo(pessoa.seguindo), [pessoa.seguindo]);

  const alternar = async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    const novo = !seguindo;
    setSeguindo(novo);
    try {
      await (novo ? seguirPessoa(pessoa.id) : deixarDeSeguir(pessoa.id));
      void atualizarSocial();
    } catch (e) {
      setSeguindo(!novo);
      avisar(e instanceof Error ? e.message : 'Não foi possível concluir agora.');
    } finally {
      ocupado.current = false;
    }
  };
  return { seguindo, alternar };
}

export function BotaoSeguir({ pessoa }: { pessoa: Pick<Pessoa, 'id' | 'nome' | 'seguindo'> }) {
  const { seguindo, alternar } = useSeguir(pessoa);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: seguindo }}
      accessibilityLabel={seguindo ? `Deixar de seguir ${pessoa.nome}` : `Seguir ${pessoa.nome}`}
      onPress={alternar}
      hitSlop={6}
      style={[st.pilula, seguindo && st.seguindo]}
    >
      {seguindo ? <Icone nome="ok" tamanho={13} cor="#ffffff" /> : null}
      <T tam={12.5} peso="500" cor="#ffffff">{seguindo ? 'Seguindo' : 'Seguir'}</T>
    </Pressable>
  );
}

const st = estilos(() => StyleSheet.create({
  pilula: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, backgroundColor: cores.acao, borderWidth: 1, borderColor: cores.acao },
  seguindo: { opacity: 0.88 },   // seguindo: o mesmo roxo da aba ativa, com o ✓ (pedido do dono, 2026-11-18)
}));
