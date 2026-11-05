/* Aba Clubes: busca, entrar com código de convite, os seus clubes e os que vale descobrir. Tudo vem do servidor. */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { entrarNoClube, entrarPorCodigo, listarClubes, sairDoClube } from '../../api/social';
import type { Clube } from '../../api/social';
import { useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, Cartao, Chip, T } from '../../componentes/Ui';
import { useLista } from '../../estado/lista';
import { useLoja } from '../../estado/loja';
import { categoria } from '../../lib/grupos';
import { fmt } from '../../lib/datas';
import { cores, FONTE, estilos } from '../../tema';
import { Capa } from './Capa';
import { ConfirmarSaida } from './ConfirmarSaida';

export function Grupos({ aoAbrir, aoCriar }: { aoAbrir: (id: number) => void; aoCriar: () => void }) {
  const { atualizarSocial } = useLoja();
  const avisar = useAviso();
  const [busca, setBusca] = useState('');
  const [q, setQ] = useState('');
  const [codigo, setCodigo] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [saindo, setSaindo] = useState<Clube | null>(null);   // o clube de que a pessoa quer sair, esperando a confirmação

  useEffect(() => { const t = setTimeout(() => setQ(busca.trim()), 300); return () => clearTimeout(t); }, [busca]);
  const lista = useLista((cursor) => listarClubes({ q, antes: cursor }), [q]);
  const meus = lista.itens.filter((g) => g.meu);
  const descobrir = lista.itens.filter((g) => !g.meu);

  const entrar = async (g: Clube) => {
    try {
      await entrarNoClube(g.id);
      void atualizarSocial(true);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível entrar agora.');
    }
  };

  const sair = async (g: Clube) => {
    try {
      await sairDoClube(g.id);
      void atualizarSocial(true);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível sair agora.');
    }
  };

  const usarCodigo = async () => {
    const c = codigo.trim().toUpperCase();
    if (c.length !== 6 || entrando) { if (c) avisar('O código de convite tem 6 letras e números.'); return; }
    setEntrando(true);
    try {
      const g = await entrarPorCodigo(c);
      setCodigo('');
      void atualizarSocial(true);
      avisar(`Você entrou em ${g.nome}.`);
      aoAbrir(g.id);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível entrar agora.');
    } finally {
      setEntrando(false);
    }
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

      <View style={st.busca}>
        <Icone nome="cadeado" tamanho={18} cor={cores.texto3} />
        <TextInput
          value={codigo}
          onChangeText={(v) => setCodigo(v.toUpperCase())}
          placeholder="Código de convite"
          placeholderTextColor={cores.placeholder}
          selectionColor={cores.destaque}
          accessibilityLabel="Código de convite de um clube"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          returnKeyType="go"
          onSubmitEditing={usarCodigo}
          style={st.campoBusca}
        />
        <Botao pequeno tipo="fantasma" titulo="Entrar" aoPressionar={usarCodigo} carregando={entrando} desabilitado={codigo.trim().length !== 6} />
      </View>

      {meus.length ? (
        <>
          <T tam={20} peso="300" style={st.titulo}>Seus clubes</T>
          {meus.map((g) => <GrupoCartao key={g.id} g={g} aoAbrir={() => aoAbrir(g.id)} aoAlternar={() => setSaindo(g)} />)}
        </>
      ) : null}

      {descobrir.length ? (
        <>
          <T tam={20} peso="300" style={st.titulo}>{meus.length ? 'Descobrir' : 'Clubes para entrar'}</T>
          {descobrir.map((g) => <GrupoCartao key={g.id} g={g} aoAbrir={() => aoAbrir(g.id)} aoAlternar={() => entrar(g)} />)}
        </>
      ) : null}

      {lista.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais clubes" aoPressionar={lista.maisItens} carregando={lista.carregando} /> : null}

      {!lista.itens.length ? (
        <Cartao>
          {lista.erro ? (
            <T tam={15} peso="300">{lista.erro}</T>
          ) : lista.carregando ? (
            <T tam={15} peso="300">Carregando os clubes...</T>
          ) : q ? (
            <>
              <T tam={15} peso="300">Nenhum clube com “{q}”.</T>
              <T tam={13} cor={cores.texto2} style={{ marginTop: 6, lineHeight: 19 }}>Tente outra palavra, ou crie o clube que está faltando.</T>
            </>
          ) : (
            <>
              <T tam={15} peso="300">Ainda não há clubes.</T>
              <T tam={13} cor={cores.texto2} style={{ marginTop: 6, lineHeight: 19 }}>Crie o primeiro, ou entre em um clube privado com o código de convite.</T>
              <Botao pequeno tipo="fantasma" titulo="Criar clube" aoPressionar={aoCriar} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
            </>
          )}
        </Cartao>
      ) : null}
      <ConfirmarSaida
        aberto={saindo !== null}
        nome={saindo?.nome ?? ''}
        aoFechar={() => setSaindo(null)}
        aoConfirmar={() => { if (saindo) void sair(saindo); setSaindo(null); }}
      />
    </View>
  );
}

function GrupoCartao({ g, aoAbrir, aoAlternar }: { g: Clube; aoAbrir: () => void; aoAlternar: () => void }) {
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

const st = estilos(() => StyleSheet.create({
  busca: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingLeft: 16, paddingRight: 8, borderRadius: 25, borderWidth: 1, borderColor: cores.linha2, backgroundColor: 'rgba(255,255,255,0.045)' },
  campoBusca: { flex: 1, height: 50, color: cores.texto, fontSize: 15, fontFamily: FONTE['300'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  titulo: { marginTop: 10, letterSpacing: -0.4 },
  selo: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(5,5,7,0.55)' },
  rodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
}));
