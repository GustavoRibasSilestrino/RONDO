/* Aba Clubes da Comunidade (refeita em 2026-11-26, com referência de funcionalidade do dono e o visual do RONDO):
   criar clube no topo, a busca, os SEUS clubes num carrossel de capas (com o selo "Dono" ou "Membro"), o clube EM ALTA (o
   público com mais gente) e os POPULARES. No fim, entrar com o código de convite. Nada vem pronto: sem clubes, a aba mostra
   o convite para criar o primeiro. Tudo vem do servidor (GET /clubes, com `meus` e `populares`). */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { entrarNoClube, entrarPorCodigo, listarClubes, sairDoClube } from '../../api/social';
import type { Clube } from '../../api/social';
import { useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, Cartao, T } from '../../componentes/Ui';
import { useLista } from '../../estado/lista';
import { useLoja } from '../../estado/loja';
import { categoria } from '../../lib/grupos';
import { fmt } from '../../lib/datas';
import { cores, FONTE, estilos } from '../../tema';
import { LinhaCriar, TituloSecao, Vazio } from './Blocos';
import { Capa } from './Capa';
import { ConfirmarSaida } from './ConfirmarSaida';

const membros = (n: number) => `${fmt(n)} ${n === 1 ? 'membro' : 'membros'}`;

export function Grupos({ aoAbrir, aoCriar }: { aoAbrir: (id: number) => void; aoCriar: () => void }) {
  const { atualizarSocial } = useLoja();
  const avisar = useAviso();
  const [busca, setBusca] = useState('');
  const [q, setQ] = useState('');
  const [codigo, setCodigo] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [saindo, setSaindo] = useState<Clube | null>(null);   // o clube de que a pessoa quer sair, esperando a confirmação

  useEffect(() => { const t = setTimeout(() => setQ(busca.trim()), 300); return () => clearTimeout(t); }, [busca]);
  const meus = useLista((cursor) => listarClubes({ meus: true, antes: cursor }), []);
  const populares = useLista(() => listarClubes({ populares: true }), []);
  const achados = useLista((cursor) => listarClubes({ q, antes: cursor }), [q], !!q);

  const emAlta = populares.itens[0];
  const outros = populares.itens.slice(1);
  const carregando = (meus.carregando || populares.carregando) && !meus.itens.length && !populares.itens.length;
  const erro = !meus.itens.length && !populares.itens.length ? meus.erro || populares.erro : '';
  const nada = !carregando && !erro && !meus.itens.length && !populares.itens.length;

  const entrar = async (g: Clube) => {
    try {
      await entrarNoClube(g.id);
      void atualizarSocial(true);
      avisar(`Você entrou em ${g.nome}.`);
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

  const alternar = (g: Clube) => (g.meu ? setSaindo(g) : void entrar(g));

  return (
    <View style={{ marginTop: 18 }}>
      <LinhaCriar titulo="Criar clube" frase="Junte quem treina com você num lugar só." aoPressionar={aoCriar} />

      <View style={[st.caixa, { marginTop: 14 }]}>
        <Icone nome="busca" tamanho={19} cor={cores.texto3} />
        <TextInput
          value={busca} onChangeText={setBusca} placeholder="Buscar clubes" placeholderTextColor={cores.placeholder} selectionColor={cores.destaque}
          accessibilityLabel="Buscar clubes" autoCapitalize="none" autoCorrect={false} style={st.campo}
        />
        {busca ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Limpar a busca" onPress={() => setBusca('')} hitSlop={8} style={{ padding: 6 }}>
            <Icone nome="fechar" tamanho={17} cor={cores.texto2} />
          </Pressable>
        ) : null}
      </View>

      {q ? (
        /* buscando: só os resultados */
        <View style={{ marginTop: 6 }}>
          <TituloSecao>Resultados</TituloSecao>
          {achados.itens.length ? (
            <View style={{ gap: 10 }}>
              {achados.itens.map((g) => <LinhaClube key={g.id} g={g} aoAbrir={() => aoAbrir(g.id)} aoAlternar={() => alternar(g)} />)}
              {achados.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais clubes" aoPressionar={achados.maisItens} carregando={achados.carregando} /> : null}
            </View>
          ) : achados.carregando ? (
            <T tam={14} cor={cores.texto2}>Buscando...</T>
          ) : (
            <Vazio icone="busca" titulo={`Nenhum clube com “${q}”`} frase="Tente outra palavra, ou crie o clube que está faltando." acao="Criar clube" aoAcao={aoCriar} />
          )}
        </View>
      ) : (
        <>
          {meus.itens.length ? (
            <>
              <TituloSecao direita={<T tam={12.5} cor={cores.texto3}>{meus.itens.length}</T>}>Meus clubes</TituloSecao>
              {/* o carrossel de capas: a pessoa vê de relance onde está e onde manda */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.carrossel} contentContainerStyle={st.carrosselMiolo}>
                {meus.itens.map((g) => (
                  <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`Abrir ${g.nome}, ${g.proprio ? 'você é dono' : 'você é membro'}`} onPress={() => aoAbrir(g.id)} style={({ pressed }) => [st.ficha, pressed && { opacity: 0.85 }]}>
                    <Capa cor={g.cor} cat={g.categoria} altura={112} raio={18}>
                      <View style={st.fichaNome}><T tam={13.5} peso="500" cor="#ffffff" linhas={2}>{g.nome}</T></View>
                    </Capa>
                    <View style={[st.papel, g.proprio && st.papelDono]}>
                      <Icone nome={g.proprio ? 'estrela' : 'perfil'} tamanho={12} cor={g.proprio ? cores.branco : cores.destaque2} />
                      <T tam={11.5} peso="500" pixel cor={g.proprio ? cores.branco : cores.destaque2}>{g.proprio ? 'Dono' : 'Membro'}</T>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              {meus.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais dos meus" aoPressionar={meus.maisItens} carregando={meus.carregando} style={{ marginTop: 10 }} /> : null}
            </>
          ) : null}

          {emAlta ? (
            <>
              <TituloSecao>Em alta</TituloSecao>
              <Cartao style={{ padding: 0 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${emAlta.nome}`} onPress={() => aoAbrir(emAlta.id)}>
                  <Capa cor={emAlta.cor} cat={emAlta.categoria} altura={150} raio={0}>
                    <View style={st.altaTexto}>
                      <T tam={24} peso="300" cor="#ffffff" linhas={2} style={{ letterSpacing: -0.5 }}>{emAlta.nome}</T>
                      {emAlta.descricao ? <T tam={13.5} cor="rgba(255,255,255,0.86)" linhas={2} style={{ marginTop: 4, lineHeight: 19 }}>{emAlta.descricao}</T> : null}
                    </View>
                  </Capa>
                </Pressable>
                <View style={st.rodape}>
                  <T tam={13} cor={cores.texto2}>{membros(emAlta.membros)} · {categoria(emAlta.categoria).nome}</T>
                  {emAlta.proprio ? null : <Botao pequeno tipo={emAlta.meu ? 'discreto' : 'primario'} titulo={emAlta.meu ? 'Sair' : 'Entrar'} aoPressionar={() => alternar(emAlta)} />}
                </View>
              </Cartao>
            </>
          ) : null}

          {outros.length ? (
            <>
              <TituloSecao>Populares</TituloSecao>
              <View style={{ gap: 10 }}>
                {outros.map((g) => <LinhaClube key={g.id} g={g} aoAbrir={() => aoAbrir(g.id)} aoAlternar={() => alternar(g)} />)}
              </View>
            </>
          ) : null}

          {nada ? (
            <View style={{ marginTop: 18 }}>
              <Vazio icone="grupo" titulo="Ainda não há clubes" frase="Os clubes são criados pela comunidade. Crie o primeiro e chame quem treina com você." acao="Criar clube" aoAcao={aoCriar} />
            </View>
          ) : carregando ? (
            <T tam={14} cor={cores.texto2} style={{ marginTop: 22 }}>Carregando os clubes...</T>
          ) : erro ? (
            <Cartao style={{ marginTop: 18 }}>
              <T tam={15}>{erro}</T>
              <Botao pequeno tipo="fantasma" titulo="Tentar de novo" aoPressionar={() => { meus.recarregar(); populares.recarregar(); }} style={{ marginTop: 12 }} />
            </Cartao>
          ) : null}
        </>
      )}

      {/* clube privado: só com o código que o dono compartilha */}
      <TituloSecao>Tem um código de convite?</TituloSecao>
      <View style={st.caixa}>
        <Icone nome="cadeado" tamanho={18} cor={cores.texto3} />
        <TextInput
          value={codigo} onChangeText={(v) => setCodigo(v.toUpperCase())} placeholder="Código de 6 letras" placeholderTextColor={cores.placeholder} selectionColor={cores.destaque}
          accessibilityLabel="Código de convite de um clube" autoCapitalize="characters" autoCorrect={false} maxLength={6} returnKeyType="go" onSubmitEditing={usarCodigo} style={st.campo}
        />
        <Pressable
          accessibilityRole="button" accessibilityLabel="Entrar no clube com o código"
          accessibilityState={{ disabled: codigo.trim().length !== 6 || entrando, busy: entrando }}
          disabled={codigo.trim().length !== 6 || entrando} onPress={usarCodigo} hitSlop={6}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [st.entrar, (pressed || hovered) && st.entrarSobre, codigo.trim().length !== 6 && { opacity: 0.5 }]}
        >
          {entrando ? <ActivityIndicator size="small" color={cores.texto} /> : <T tam={13} peso="500">Entrar</T>}
        </Pressable>
      </View>

      <ConfirmarSaida
        aberto={saindo !== null} nome={saindo?.nome ?? ''} aoFechar={() => setSaindo(null)}
        aoConfirmar={() => { if (saindo) void sair(saindo); setSaindo(null); }}
      />
    </View>
  );
}

/* um clube em linha: a miniatura da capa, o nome, a descrição, os membros e o botão de entrar */
function LinhaClube({ g, aoAbrir, aoAlternar }: { g: Clube; aoAbrir: () => void; aoAlternar: () => void }) {
  return (
    <Cartao style={st.linha}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir o clube ${g.nome}`} onPress={aoAbrir} style={st.linhaToque}>
        <View style={{ width: 64 }}>
          <Capa cor={g.cor} cat={g.categoria} altura={64} raio={14}>
            {g.privado ? <View style={st.cadeado}><Icone nome="cadeado" tamanho={11} cor="#ffffff" /></View> : null}
          </Capa>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T tam={15.5} peso="400" linhas={1}>{g.nome}</T>
          {g.descricao ? <T tam={12.5} cor={cores.texto2} linhas={1} style={{ marginTop: 2 }}>{g.descricao}</T> : null}
          <View style={st.linhaMembros}>
            <Icone nome="grupo" tamanho={14} cor={cores.texto3} />
            <T tam={12} cor={cores.texto3}>{membros(g.membros)}</T>
          </View>
        </View>
      </Pressable>
      {g.proprio ? (
        <View style={st.donoSelo}><T tam={11.5} peso="500" pixel cor={cores.destaque2}>Dono</T></View>
      ) : (
        <Botao pequeno tipo={g.meu ? 'discreto' : 'fantasma'} titulo={g.meu ? 'Sair' : 'Entrar'} aoPressionar={aoAlternar} />
      )}
    </Cartao>
  );
}

const st = estilos(() => StyleSheet.create({
  caixa: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingLeft: 16, paddingRight: 8, borderRadius: 25, borderWidth: 1, borderColor: cores.linha2, backgroundColor: `rgba(${cores.tinta},0.045)` },
  campo: { flex: 1, minWidth: 0, height: 50,   /* minWidth 0: no Safari do iPhone o campo encolhe e o botão Entrar cabe dentro da caixa */ color: cores.texto, fontSize: 15, fontFamily: FONTE['300'], outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' },
  entrar: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: `rgba(${cores.tinta},0.09)`, borderWidth: 1, borderColor: `rgba(${cores.tinta},0.18)` },
  entrarSobre: { backgroundColor: `rgba(${cores.tinta},0.16)` },
  carrossel: { marginHorizontal: -20 },
  carrosselMiolo: { paddingHorizontal: 20, gap: 12 },
  ficha: { width: 124 },
  fichaNome: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  papel: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: 8, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: `rgba(${cores.tom},0.14)` },
  papelDono: { backgroundColor: cores.acao },
  altaTexto: { position: 'absolute', left: 18, right: 18, bottom: 16 },
  rodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 18, paddingVertical: 14 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14, borderRadius: 20 },
  linhaToque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  linhaMembros: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  cadeado: { position: 'absolute', right: 6, bottom: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,5,7,0.5)' },
  donoSelo: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: `rgba(${cores.tom},0.14)` },
}));
