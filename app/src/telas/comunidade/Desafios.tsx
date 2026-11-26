/* Aba Desafios da Comunidade (desde 2026-11-26; referência de funcionalidade do dono, visual do RONDO). Nenhum desafio vem pronto:
   quem cria são as pessoas (pedido do dono). No topo, "Criar desafio"; depois os que estão ROLANDO AGORA (com o dia em que estão)
   e os que vêm EM BREVE (com a contagem regressiva para começar). Tocar num desafio abre os detalhes (DesafioDetalhe).
   No fim fica o ranking semanal de constância, que antes era uma aba própria. */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { entrarNoDesafio, listarDesafios } from '../../api/social';
import type { Desafio } from '../../api/social';
import { useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Barra, Botao, Cartao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { diaAtual, duracao, frase, periodo, pessoas } from '../../lib/desafios';
import { cores, estilos } from '../../tema';
import { LinhaCriar, TituloSecao, Vazio } from './Blocos';
import { Capa } from './Capa';
import { Contagem } from './Contagem';
import { CriarDesafio } from './CriarDesafio';
import { DesafioDetalhe } from './DesafioDetalhe';
import { Ranking } from './Ranking';

/* `criando`/`aoCriando`: a folha de criar fica com a tela de fora, para o + do pé da tela também abrir ela */
export function Desafios({ criando, aoCriando }: { criando: boolean; aoCriando: (v: boolean) => void }) {
  const { versaoSocial } = useLoja();
  const avisar = useAviso();
  const [itens, setItens] = useState<Desafio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState<Desafio | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await listarDesafios('ativos');
      setItens(r.itens);
      setErro('');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar os desafios.');
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => { void carregar(); }, [carregar, versaoSocial]);

  /* troca um desafio na lista (depois de entrar, sair ou da contagem zerar), sem recarregar tudo */
  const trocar = (d: Desafio) => {
    setItens((l) => l.map((x) => (x.id === d.id ? d : x)));
    setAberto((a) => (a && a.id === d.id ? d : a));
  };
  const entrar = async (d: Desafio) => {
    try {
      trocar(await entrarNoDesafio(d.id));
      avisar('Você está no desafio. Bora!');
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível entrar agora.');
    }
  };

  const rolando = itens.filter((d) => d.situacao === 'em_andamento');
  const emBreve = itens.filter((d) => d.situacao === 'em_breve');

  return (
    <View style={{ marginTop: 18 }}>
      <LinhaCriar titulo="Criar desafio" frase="Escolha a meta, o dia de começar e chame a galera." aoPressionar={() => aoCriando(true)} />

      {rolando.length ? (
        <>
          <TituloSecao direita={<T tam={12.5} cor={cores.texto3}>{rolando.length}</T>}>Rolando agora</TituloSecao>
          <View style={{ gap: 14 }}>
            {rolando.map((d) => <CartaoDesafio key={d.id} d={d} aoAbrir={() => setAberto(d)} aoEntrar={() => entrar(d)} />)}
          </View>
        </>
      ) : null}

      {emBreve.length ? (
        <>
          <TituloSecao direita={<T tam={12.5} cor={cores.texto3}>{emBreve.length}</T>}>Em breve</TituloSecao>
          <View style={{ gap: 14 }}>
            {emBreve.map((d) => <CartaoDesafio key={d.id} d={d} aoAbrir={() => setAberto(d)} aoEntrar={() => entrar(d)} aoComecar={carregar} />)}
          </View>
        </>
      ) : null}

      {!itens.length ? (
        <View style={{ marginTop: 18 }}>
          {erro ? (
            <Cartao>
              <T tam={15}>{erro}</T>
              <Botao pequeno tipo="fantasma" titulo="Tentar de novo" aoPressionar={carregar} style={{ marginTop: 12 }} />
            </Cartao>
          ) : carregando ? (
            <T tam={14} cor={cores.texto2}>Carregando os desafios...</T>
          ) : (
            <Vazio
              icone="trofeu" titulo="Nenhum desafio por aqui ainda"
              frase="Os desafios são criados pela comunidade. Crie o primeiro, marque o dia de começar e chame quem treina com você."
              acao="Criar desafio" aoAcao={() => aoCriando(true)}
            />
          )}
        </View>
      ) : null}

      <TituloSecao>Sua semana</TituloSecao>
      <Ranking />

      <CriarDesafio aberto={criando} aoFechar={() => aoCriando(false)} aoCriar={(d) => { aoCriando(false); setItens((l) => [d, ...l.filter((x) => x.id !== d.id)]); setAberto(d); }} />
      <DesafioDetalhe
        desafio={aberto} aoFechar={() => setAberto(null)} aoMudar={trocar}
        aoApagar={(id) => { setAberto(null); setItens((l) => l.filter((x) => x.id !== id)); }}
      />
    </View>
  );
}

/* o cartão de um desafio: a capa com a frase do momento ("Começa em 2 dias", "Faltam 5 dias"), o título, o período e quantos
   participam; embaixo, a contagem (em breve) ou o dia em que está (rolando), e o botão de entrar */
export function CartaoDesafio({ d, aoAbrir, aoEntrar, aoComecar }: { d: Desafio; aoAbrir: () => void; aoEntrar: () => void; aoComecar?: () => void }) {
  const total = duracao(d.inicio, d.fim);
  return (
    <Cartao style={{ padding: 0 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir o desafio ${d.titulo}`} onPress={aoAbrir}>
        <Capa cor={d.cor} icone="trofeu" altura={108} raio={0}>
          {/* os selos da capa: a frase do momento à esquerda e, se a pessoa participa, o "Você está" à direita.
              Os números ficam na Poppins: na fonte de pixel o 5 parece um S */}
          {/* os dois numa linha só (um empurra o outro; o texto encolhe com reticências): nunca um em cima do outro */}
          <View style={st.selos}>
            <View style={st.selo}>
              <Icone nome={d.situacao === 'em_breve' ? 'relogio' : 'chama'} tamanho={13} cor="#ffffff" />
              <T tam={12} peso="500" cor="#ffffff" linhas={1} style={st.seloTexto}>{frase(d)}</T>
            </View>
            {d.meu ? (
              <View style={st.selo}>
                <Icone nome="ok" tamanho={13} cor="#ffffff" />
                <T tam={12} peso="500" cor="#ffffff" linhas={1} style={st.seloTexto}>{d.proprio ? 'Seu desafio' : 'Você está'}</T>
              </View>
            ) : null}
          </View>
        </Capa>
        <View style={st.corpo}>
          <T tam={20} peso="400" linhas={2} style={{ letterSpacing: -0.4 }}>{d.titulo}</T>
          <T tam={13} cor={cores.texto2} style={{ marginTop: 4 }}>{periodo(d.inicio, d.fim)} · {pessoas(d.participantes)}</T>
          {d.meta ? (
            <View style={st.meta}>
              <Icone nome="medalha" tamanho={15} cor={cores.destaque2} />
              <T tam={13} cor={cores.texto} linhas={2} style={{ flex: 1 }}>{d.meta}</T>
            </View>
          ) : null}
        </View>
      </Pressable>
      <View style={st.baixo}>
        {d.situacao === 'em_breve' ? (
          <>
            <T tam={11} peso="400" cor={cores.texto3} style={st.rotulo}>COMEÇA EM</T>
            <Contagem inicio={d.inicio} pequena aoZerar={aoComecar} />
          </>
        ) : (
          <>
            <View style={st.diaLinha}>
              <T tam={13} peso="400">Dia {diaAtual(d)} de {total}</T>
              <T tam={12} cor={cores.texto3}>{Math.round((diaAtual(d) / total) * 100)}%</T>
            </View>
            <Barra valor={diaAtual(d)} max={total} />
          </>
        )}
        {d.meu ? null : <Botao titulo="Entrar no desafio" icone="mais" aoPressionar={aoEntrar} style={{ marginTop: 14, alignSelf: 'stretch' }} />}
      </View>
    </Cartao>
  );
}

const st = estilos(() => StyleSheet.create({
  selos: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  selo: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(5,5,7,0.45)' },
  seloTexto: { flexShrink: 1 },
  corpo: { paddingHorizontal: 18, paddingTop: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: `rgba(${cores.tom},0.1)` },
  baixo: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },
  rotulo: { letterSpacing: 1.4, marginBottom: 8 },
  diaLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
}));
