/* Aba Grupos: busca, criar grupo, os seus grupos e os que vale descobrir. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Icone } from '../../componentes/Icone';
import { Botao, Cartao, Chip, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { categoria, GrupoVista, listarGrupos } from '../../lib/grupos';
import { fmt } from '../../lib/datas';
import { cores, FONTE } from '../../tema';
import { Capa } from './Capa';
import { ConfirmarSaida } from './ConfirmarSaida';
import { normalizar } from './util';

export function Grupos({ aoAbrir, aoCriar }: { aoAbrir: (id: string) => void; aoCriar: () => void }) {
  const { estado, commit } = useLoja();
  const [busca, setBusca] = useState('');
  const [saindo, setSaindo] = useState<GrupoVista | null>(null);   // o clube de que a pessoa quer sair, esperando a confirmação

  const q = normalizar(busca);
  const passa = (g: GrupoVista) => !q || normalizar(`${g.nome} ${g.descricao} ${categoria(g.categoria).nome}`).includes(q);
  const todos = listarGrupos(estado);
  const meus = todos.filter((g) => g.meu && passa(g));
  const descobrir = todos.filter((g) => !g.meu && passa(g));

  const alternar = (g: GrupoVista) => {
    if (g.meu) { setSaindo(g); return; }   // sair pede confirmação
    commit((e) => { e.clubes[g.id] = true; });
  };

  return (
    <View style={{ marginTop: 18, gap: 14 }}>
      <View style={st.busca}>
        <Icone nome="busca" tamanho={19} cor={cores.texto3} />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar clubes"
          placeholderTextColor={cores.placeholder}
          selectionColor={cores.destaque}
          accessibilityLabel="Buscar clubes"
          autoCapitalize="none"
          autoCorrect={false}
          style={st.campoBusca}
        />
        {busca ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Limpar a busca" onPress={() => setBusca('')} hitSlop={8} style={{ padding: 6 }}>
            <Icone nome="fechar" tamanho={17} cor={cores.texto2} />
          </Pressable>
        ) : null}
      </View>


      {meus.length ? (
        <>
          <T tam={20} peso="300" style={st.titulo}>Seus clubes</T>
          {meus.map((g) => <GrupoCartao key={g.id} g={g} aoAbrir={() => aoAbrir(g.id)} aoAlternar={() => alternar(g)} />)}
        </>
      ) : null}

      {descobrir.length ? (
        <>
          <T tam={20} peso="300" style={st.titulo}>{meus.length ? 'Descobrir' : 'Clubes para entrar'}</T>
          {descobrir.map((g) => <GrupoCartao key={g.id} g={g} aoAbrir={() => aoAbrir(g.id)} aoAlternar={() => alternar(g)} />)}
        </>
      ) : null}

      {!meus.length && !descobrir.length ? (
        <Cartao>
          <T tam={15} peso="300">Nenhum clube com “{busca.trim()}”.</T>
          <T tam={13} cor={cores.texto2} style={{ marginTop: 6, lineHeight: 19 }}>Tente outra palavra, ou crie o clube que está faltando.</T>
        </Cartao>
      ) : null}
      <ConfirmarSaida
        aberto={saindo !== null}
        nome={saindo?.nome ?? ''}
        aoFechar={() => setSaindo(null)}
        aoConfirmar={() => { if (saindo) commit((e) => { e.clubes[saindo.id] = false; }); setSaindo(null); }}
      />
    </View>
  );
}

function GrupoCartao({ g, aoAbrir, aoAlternar }: { g: GrupoVista; aoAbrir: () => void; aoAlternar: () => void }) {
  return (
    <Cartao style={{ padding: 0 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir o clube ${g.nome}`} onPress={aoAbrir}>
        <View style={{ padding: 8 }}>
          <Capa cor={g.cor} cat={g.categoria} altura={84}>
            {g.privado ? (
              <View style={st.selo}>
                <Icone nome="cadeado" tamanho={13} cor="#ffffff" />
                <T tam={11.5} peso="500" cor="#ffffff">Privado</T>
              </View>
            ) : null}
          </Capa>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 }}>
          <T tam={19} peso="300">{g.nome}</T>
          <T tam={12.5} cor={cores.texto3} style={{ marginTop: 2 }}>{fmt(g.membros)} {g.membros === 1 ? 'membro' : 'membros'} · {categoria(g.categoria).nome}</T>
          {g.descricao ? <T tam={13.5} cor={cores.texto2} linhas={2} style={{ marginTop: 8, lineHeight: 19 }}>{g.descricao}</T> : null}
        </View>
      </Pressable>
      <View style={st.rodape}>
        {g.meu ? <Chip texto={g.proprio ? 'você criou' : 'membro'} tom="bom" /> : <View />}
        {g.proprio ? (
          <Botao pequeno tipo="fantasma" titulo="Abrir" aoPressionar={aoAbrir} />
        ) : (
          <Botao pequeno tipo={g.meu ? 'discreto' : 'fantasma'} titulo={g.meu ? 'Sair do clube' : 'Entrar no clube'} aoPressionar={aoAlternar} />
        )}
      </View>
    </Cartao>
  );
}

const st = StyleSheet.create({
  busca: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingLeft: 16, paddingRight: 8, borderRadius: 25, borderWidth: 1, borderColor: cores.linha2, backgroundColor: 'rgba(255,255,255,0.045)' },
  campoBusca: { flex: 1, height: 50, color: cores.texto, fontSize: 15, fontFamily: FONTE['300'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  titulo: { marginTop: 10, letterSpacing: -0.4 },
  selo: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(5,5,7,0.55)' },
  rodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
});
