/* Dieta: meta de calorias e macros, refeições do dia e a água.
   Desde 2026-11-18 (pedidos do dono): o dia se escolhe também num calendário (o ícone ao lado das setas, que abre no meio da tela);
   cada refeição com alimentos ganha uma foto do prato (câmera ou galeria), e a mais recente vira o ícone do dia no calendário;
   a quantidade do alimento se digita (antes era só de 10 em 10 g). */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, TextInput, View } from 'react-native';
import { SeletorData } from '../componentes/SeletorData';
import { escolherMidia, removerMidia, useUriMidia } from '../lib/midia';
import { BotaoMais } from '../componentes/BotaoMais';
import { AguaCartao } from '../componentes/AguaCartao';
import { aguaDoDia, COPO_ML, metaAgua } from '../lib/agua';
import { refeicoesDe } from '../lib/refeicoes';
import { MenuMais } from '../componentes/MenuMais';
import { BuscaProfissionais } from './BuscaProfissionais';
import { GaleriaRefeicoes } from './GaleriaRefeicoes';
import { Folha, Tela, useAviso } from '../componentes/Estrutura';
import { Janela } from '../componentes/Janela';
import { Icone } from '../componentes/Icone';
import { Anel, Barra, Botao, Campo, Cartao, Segmentos, T } from '../componentes/Ui';
import { ALIMENTOS, Alimento } from '../dados';
import { buscarTaco } from '../lib/taco';
import { useLoja } from '../estado/loja';
import { macrosDe, macrosMeta, metaKcal, totaisDia } from '../lib/calc';
import { dataCurta, doIso, fmt, iso, num, somarDias } from '../lib/datas';
import { cores, FONTE } from '../tema';
import type { TipoRefeicao } from '../tipos';

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Dieta() {
  const { estado, commit } = useLoja();
  const hoje = iso();
  const [dia, setDia] = useState(hoje);
  const [adicionando, setAdicionando] = useState<TipoRefeicao | null>(null);
  const [menu, setMenu] = useState(false);     // o + do canto: um menu só com texto (componentes/MenuMais.tsx)
  const [busca, setBusca] = useState(false);   // procurar nutricionista
  const [calendario, setCalendario] = useState(false);
  const [galeria, setGaleria] = useState(false);   // "Ver refeições": o calendário das refeições com as fotos
  const avisar = useAviso();

  const meta = metaKcal(estado.perfil);
  const metas = macrosMeta(estado.perfil, meta);
  const tot = totaisDia(estado, dia);
  const itens = estado.refeicoes[dia] ?? [];
  const agua = aguaDoDia(estado, dia);   // ml
  const refeicoes = refeicoesDe(estado);
  const [editando, setEditando] = useState<{ id: string | null; nome: string } | null>(null);   // a refeição em edição (id null = nova)
  const rotuloDia = dia === hoje ? 'Hoje' : dia === iso(somarDias(new Date(), -1)) ? 'Ontem' : dataCurta(dia);
  const restante = meta - tot.kcal;

  const mudarDia = (n: number) => {
    const novo = iso(somarDias(doIso(dia), n));
    if (novo <= hoje) setDia(novo);
  };

  /* a foto do prato: no celular abre a câmera; no navegador, o seletor de fotos (que no celular também oferece a câmera) */
  const fotografar = async (refeicao: TipoRefeicao) => {
    try {
      const [m] = await escolherMidia(Platform.OS === 'web' ? 'galeria' : 'camera', 1);
      if (!m) return;
      if (m.tipo !== 'imagem') { removerMidia([m.id]); avisar('Escolha uma foto (vídeo não vale aqui).'); return; }
      const antiga = estado.fotosRefeicao[dia]?.[refeicao]?.id;
      commit((e) => { (e.fotosRefeicao[dia] ??= {})[refeicao] = { id: m.id, quando: Date.now() }; });
      if (antiga) removerMidia([antiga]);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível abrir a câmera agora.');
    }
  };
  const tirarFoto = (refeicao: TipoRefeicao) => {
    const antiga = estado.fotosRefeicao[dia]?.[refeicao]?.id;
    commit((e) => { if (e.fotosRefeicao[dia]) delete e.fotosRefeicao[dia][refeicao]; });
    if (antiga) removerMidia([antiga]);
  };

  return (
    <>
    <Tela>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cores.cartao2, borderRadius: 99 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Dia anterior" onPress={() => mudarDia(-1)} style={{ padding: 10 }}>
            <Icone nome="seta" tamanho={16} cor={cores.texto2} />
          </Pressable>
          <T pixel tam={14.5} peso="400" style={{ minWidth: 54, textAlign: 'center' }}>{rotuloDia}</T>
          <Pressable accessibilityRole="button" accessibilityLabel="Próximo dia" disabled={dia === hoje} onPress={() => mudarDia(1)} style={{ padding: 10, opacity: dia === hoje ? 0.3 : 1 }}>
            <View style={{ transform: [{ rotate: '180deg' }] }}><Icone nome="seta" tamanho={16} cor={cores.texto2} /></View>
          </Pressable>
        </View>
        {/* o calendário: escolher o dia direto, sem passar seta por seta */}
        <Pressable accessibilityRole="button" accessibilityLabel="Escolher o dia no calendário" onPress={() => setCalendario(true)} hitSlop={4}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [{ marginLeft: 8, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 }, (pressed || hovered) && { backgroundColor: cores.linha2 }]}>
          <Icone nome="calendario" tamanho={18} cor={cores.texto} />
        </Pressable>
      </View>
      <SeletorData aberto={calendario} valor={dia} aoEscolher={setDia} aoFechar={() => setCalendario(false)} fotoDoDia={(d) => fotoDoDia(estado.fotosRefeicao[d])} />

      <Cartao style={{ marginTop: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <Anel progresso={meta ? tot.kcal / meta : 0} tamanho={124} cor={restante < 0 ? cores.alerta : cores.destaque}>
            <T tam={26} peso="300">{fmt(Math.abs(restante))}</T>
            <T tam={10} cor={cores.texto2}>{restante < 0 ? 'kcal acima' : 'kcal restantes'}</T>
          </Anel>
          <View style={{ flex: 1, gap: 12 }}>
            <T tam={12} cor={cores.texto3} mono>META {fmt(meta)} KCAL</T>
            {[
              { nome: 'Proteína', v: tot.p, m: metas.p, cor: cores.destaque },
              { nome: 'Carboidrato', v: tot.c, m: metas.c, cor: cores.alerta },
              { nome: 'Gordura', v: tot.g, m: metas.g, cor: cores.bom },
            ].map((x) => (
              <View key={x.nome} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <T tam={12} cor={cores.texto2}>{x.nome}</T>
                  <T tam={12} cor={cores.texto2}>{num(Math.round(x.v))} / {x.m} g</T>
                </View>
                <Barra valor={x.v} max={x.m} cor={x.cor} />
              </View>
            ))}
          </View>
        </View>
      </Cartao>

      {refeicoes.map((r) => {
        const lista = itens.filter((x) => x.refeicao === r.id);
        const kcal = lista.reduce((t, x) => t + x.kcal, 0);
        return (
          <Cartao key={r.id} style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              {/* o nome: tocar edita (renomear ou excluir) */}
              <Pressable accessibilityRole="button" accessibilityLabel={`Editar a refeição ${r.nome}`} onPress={() => setEditando({ id: r.id, nome: r.nome })} hitSlop={6} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
                <T tam={18} peso="300" linhas={1} style={{ flexShrink: 1 }}>{r.nome}</T>
                <Icone nome="lapis" tamanho={14} cor={cores.texto3} />
              </Pressable>
              <T tam={13} cor={cores.texto2}>{kcal > 0 ? `${fmt(kcal)} kcal` : ''}</T>
              {/* depois de registrar os alimentos: a foto do prato (tocar troca; o x tira) */}
              {lista.length ? (
                <FotoRefeicao id={estado.fotosRefeicao[dia]?.[r.id]?.id} nome={r.nome} aoFotografar={() => { void fotografar(r.id); }} aoTirar={() => tirarFoto(r.id)} />
              ) : null}
            </View>
            {lista.map((x) => (
              <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: cores.linha }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <T tam={14} linhas={1}>{x.alimento}</T>
                  <T tam={12} cor={cores.texto3}>{x.gramas} g · P {num(x.p)} · C {num(x.c)} · G {num(x.g)}</T>
                </View>
                <T tam={13} cor={cores.texto2} style={{ marginRight: 10 }}>{x.kcal}</T>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${x.alimento}`}
                  onPress={() => commit((e) => { e.refeicoes[dia] = (e.refeicoes[dia] ?? []).filter((y) => y.id !== x.id); })}
                  style={{ padding: 6 }}
                >
                  <Icone nome="lixo" tamanho={16} cor={cores.texto3} />
                </Pressable>
              </View>
            ))}
            <Pressable accessibilityRole="button" onPress={() => setAdicionando(r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' }}>
              <Icone nome="mais" tamanho={14} cor={cores.destaque2} />
              <T tam={13} peso="500" cor={cores.destaque2}>Adicionar alimento</T>
            </Pressable>
          </Cartao>
        );
      })}

      {/* criar uma refeição (uma ceia, um pré-treino...) */}
      <Pressable accessibilityRole="button" onPress={() => setEditando({ id: null, nome: '' })}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, minHeight: 52, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: cores.linha2 }, (pressed || hovered) && { backgroundColor: cores.cartao }]}>
        <Icone nome="mais" tamanho={16} cor={cores.destaque2} />
        <T tam={14} peso="500" cor={cores.destaque2}>Nova refeição</T>
      </Pressable>

      <AguaCartao style={{ marginTop: 14 }} ml={agua} meta={metaAgua(estado.perfil)} aoMudar={(ml) => commit((e) => { e.agua[dia] = ml; })} />

      <EditarRefeicao
        editando={editando}
        aoFechar={() => setEditando(null)}
        podeExcluir={refeicoes.length > 1}
        aoSalvar={(nome) => {
          const alvo = editando;
          commit((e) => {
            const lista = [...refeicoesDe(e)];
            if (alvo?.id) { const i = lista.findIndex((x) => x.id === alvo.id); if (i >= 0) lista[i] = { ...lista[i], nome }; }
            else lista.push({ id: `r${Date.now().toString(36)}`, nome });
            e.refeicoesConfig = lista;
          });
          setEditando(null);
        }}
        aoExcluir={() => {
          const alvo = editando;
          if (!alvo?.id) return;
          commit((e) => { e.refeicoesConfig = refeicoesDe(e).filter((x) => x.id !== alvo.id); });
          setEditando(null);
        }}
      />

      <T tam={11} cor={cores.texto3} style={{ marginTop: 18, lineHeight: 17 }}>
        Valores da Tabela Brasileira de Composição de Alimentos (TACO, NEPA/UNICAMP, 4ª ed., 2011) e das tabelas de composição nutricional do IBGE (POF 2008-2009). Meta calculada por Mifflin-St Jeor. O RONDO organiza e acompanha, mas não substitui avaliação profissional.
      </T>

      <AdicionarAlimento
        refeicaoInicial={adicionando}
        aoFechar={() => setAdicionando(null)}
        aoAdicionar={(refeicao, alimento, gramas) => {
          const m = macrosDe(alimento, gramas);
          commit((e) => {
            (e.refeicoes[dia] ??= []).push({ id: `${Date.now()}-${alimento.id}`, refeicao, alimento: alimento.nome, gramas, ...m });
          });
          setAdicionando(null);
        }}
      />
      <BuscaProfissionais aberto={busca} aoFechar={() => setBusca(false)} tipo="nutricionista" />
      <GaleriaRefeicoes aberto={galeria} aoFechar={() => setGaleria(false)} />
    </Tela>
    <BotaoMais rotulo="Adicionar na dieta" aoPressionar={() => setMenu(true)} />
    <MenuMais
      aberto={menu} aoFechar={() => setMenu(false)} rotulo="Adicionar na dieta"
      itens={[
        { rotulo: 'Ver refeições', aoPressionar: () => setGaleria(true) },
        ...refeicoes.map((r) => ({ rotulo: `Adicionar em ${r.nome}`, aoPressionar: () => setAdicionando(r.id) })),
        { rotulo: `Beber um copo de água (${COPO_ML} ml)`, aoPressionar: () => commit((e) => { e.agua[dia] = aguaDoDia(e, dia) + COPO_ML; }) },
        { rotulo: 'Procurar nutricionista', aoPressionar: () => setBusca(true) },
      ]}
    />
    </>
  );
}

/* ---------- painel: buscar e escolher o alimento ---------- */
/* Adicionar alimento: buscar na lista (a da tabela e os criados pela pessoa) e escolher o PESO, digitado ou num atalho (50, 100, 150,
   200 g). Se o alimento não estiver na lista, a pessoa CRIA um (nome, calorias e macros por 100 g; pedido do dono, 2026-11-18): ele
   fica guardado na conta e aparece na busca dali em diante. */
type Modo = 'buscar' | 'peso' | 'criar';
const ATALHOS = [50, 100, 150, 200];
const numero = (t: string): number => Number(t.replace(',', '.').replace(/[^0-9.]/g, '')) || 0;

function AdicionarAlimento({ refeicaoInicial, aoFechar, aoAdicionar }: { refeicaoInicial: TipoRefeicao | null; aoFechar: () => void; aoAdicionar: (r: TipoRefeicao, a: Alimento, gramas: number) => void }) {
  const { estado, commit } = useLoja();
  const [busca, setBusca] = useState('');
  const [modo, setModo] = useState<Modo>('buscar');
  const [escolhido, setEscolhido] = useState<Alimento | null>(null);
  const [gramas, setGramas] = useState(100);
  const [refeicao, setRefeicao] = useState<TipoRefeicao>('almoco');
  const [novo, setNovo] = useState({ nome: '', kcal: '', p: '', c: '', g: '' });
  const [erroNovo, setErroNovo] = useState('');
  const sugestoesTaco = useMemo(() => (novo.nome.trim().length >= 3 ? buscarTaco(novo.nome, 5) : []), [novo.nome]);

  const proprios = estado.alimentosProprios ?? [];
  const resultados = useMemo(() => {
    const q = semAcento(busca.trim());
    /* sem nada digitado: os seus e os mais comuns; digitando: os seus e a tabela TACO inteira (597 alimentos, lib/taco.ts) */
    if (!q) return [...proprios, ...ALIMENTOS];
    return [...proprios.filter((a) => semAcento(a.nome).includes(q)), ...buscarTaco(busca, 40)];
  }, [busca, proprios]);
  const ehProprio = (id: string) => proprios.some((x) => x.id === id);

  // ao abrir, a refeição escolhida na lista vira o padrão e o painel recomeça do zero
  React.useEffect(() => {
    if (refeicaoInicial) { setRefeicao(refeicaoInicial); setEscolhido(null); setModo('buscar'); setBusca(''); setGramas(100); }
  }, [refeicaoInicial]);

  const escolher = (a: Alimento) => { setEscolhido(a); setGramas(100); setModo('peso'); };
  const abrirCriar = () => { setNovo({ nome: busca.trim(), kcal: '', p: '', c: '', g: '' }); setErroNovo(''); setModo('criar'); };
  const salvarNovo = () => {
    const nome = novo.nome.trim();
    const kcal = numero(novo.kcal);
    if (nome.length < 2) { setErroNovo('Dê um nome ao alimento.'); return; }
    if (kcal <= 0 || kcal > 900) { setErroNovo('Informe as calorias em 100 g (entre 1 e 900).'); return; }
    const a: Alimento = { id: `p${Date.now().toString(36)}`, nome, kcal: Math.round(kcal), p: numero(novo.p), c: numero(novo.c), g: numero(novo.g) };
    commit((e) => { (e.alimentosProprios ??= []).unshift(a); });
    escolher(a);
  };
  const apagarProprio = (id: string) => commit((e) => { e.alimentosProprios = (e.alimentosProprios ?? []).filter((x) => x.id !== id); });

  const prev = escolhido ? macrosDe(escolhido, gramas) : null;
  const titulo = modo === 'peso' && escolhido ? escolhido.nome : modo === 'criar' ? 'Criar alimento' : 'Adicionar alimento';

  return (
    <>
    <Folha aberta={!!refeicaoInicial && modo !== 'criar'} aoFechar={aoFechar} titulo={titulo}>
      {modo === 'buscar' ? (
        <View style={{ gap: 12 }}>
          <Campo rotulo="Buscar" value={busca} onChangeText={setBusca} placeholder="Arroz, frango, banana..." autoCorrect={false} />
          <T tam={12.5} cor={cores.texto3}>Toque no alimento para escolher o peso. Valores das tabelas oficiais TACO e IBGE.</T>
          {/* não achou? criar um alimento novo (já com o nome buscado) */}
          <Pressable accessibilityRole="button" onPress={abrirCriar} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: cores.linha2 }, (pressed || hovered) && { backgroundColor: cores.cartao }]}>
            <Icone nome="mais" tamanho={16} cor={cores.destaque2} />
            <T tam={14} peso="500" cor={cores.destaque2} linhas={1} style={{ flex: 1 }}>{busca.trim() ? `Criar “${busca.trim()}”` : 'Criar um alimento'}</T>
          </Pressable>
          {resultados.length === 0 ? <T tam={14} cor={cores.texto2}>Nenhum alimento encontrado. Crie o seu no botão acima.</T> : null}
          {resultados.map((a) => (
            <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: cores.linha }}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${a.nome}, escolher o peso`} onPress={() => escolher(a)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T tam={15} linhas={1}>{a.nome}</T>
                  {ehProprio(a.id) ? <T tam={11.5} cor={cores.destaque2}>Criado por você</T> : null}
                </View>
                <T tam={12} cor={cores.texto3} mono>{a.kcal} kcal/100 g</T>
              </Pressable>
              {ehProprio(a.id) ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Apagar ${a.nome} dos seus alimentos`} onPress={() => apagarProprio(a.id)} hitSlop={8} style={{ paddingLeft: 12, paddingVertical: 12 }}>
                  <Icone nome="lixo" tamanho={16} cor={cores.texto3} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : escolhido ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <T tam={13} cor={cores.texto2}>Peso</T>
            <Passo10 valor={gramas} aoMudar={setGramas} />
          </View>
          {/* atalhos de peso comuns */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {ATALHOS.map((g) => (
              <Pressable key={g} accessibilityRole="button" accessibilityState={{ selected: gramas === g }} onPress={() => setGramas(g)}
                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: gramas === g ? cores.acao : cores.linha2, backgroundColor: gramas === g ? cores.acao : 'transparent' }}>
                <T tam={13} peso="500" cor={gramas === g ? '#ffffff' : cores.texto2}>{g} g</T>
              </Pressable>
            ))}
          </View>
          {prev ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { nome: 'KCAL', v: String(prev.kcal) },
                { nome: 'PROT', v: `${num(prev.p)} g` },
                { nome: 'CARBO', v: `${num(prev.c)} g` },
                { nome: 'GORD', v: `${num(prev.g)} g` },
              ].map((m) => (
                <View key={m.nome} style={{ flex: 1, backgroundColor: cores.fundo2, borderRadius: 8, padding: 10 }}>
                  <T tam={10} mono cor={cores.texto3}>{m.nome}</T>
                  <T tam={17} peso="300">{m.v}</T>
                </View>
              ))}
            </View>
          ) : null}
          <Segmentos opcoes={refeicoesDe(estado).map((r) => ({ valor: r.id, nome: r.nome.split(' ')[0] }))} valor={refeicao} aoMudar={setRefeicao} />
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Botao titulo="Adicionar" icone="mais" aoPressionar={() => aoAdicionar(refeicao, escolhido, gramas)} />
            <Botao tipo="discreto" titulo="Trocar alimento" aoPressionar={() => { setEscolhido(null); setModo('buscar'); }} />
          </View>
        </View>
      ) : null}
    </Folha>
    {/* criar um alimento: numa janela no centro da tela (pedido do dono, 2026-11-18) */}
    <Janela aberta={!!refeicaoInicial && modo === 'criar'} aoFechar={() => setModo('buscar')} titulo="Criar alimento">
        <View style={{ gap: 12 }}>
          <Campo rotulo="Nome do alimento" value={novo.nome} onChangeText={(t) => setNovo((n) => ({ ...n, nome: t }))} placeholder="Ex.: Tapioca com queijo" maxLength={60} />
          {/* enquanto digita: os parecidos da tabela oficial (TACO); tocar preenche os valores, que ainda dá para ajustar */}
          {sugestoesTaco.length ? (
            <View style={{ gap: 6 }}>
              <T tam={12} peso="500" cor={cores.texto2}>Das tabelas oficiais, toque para preencher:</T>
              {sugestoesTaco.map((a) => (
                <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`Usar os valores de ${a.nome}`} onPress={() => setNovo((n) => ({ ...n, kcal: String(a.kcal), p: String(a.p).replace('.', ','), c: String(a.c).replace('.', ','), g: String(a.g).replace('.', ',') }))}
                  style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: cores.linha2 }, (pressed || hovered) && { backgroundColor: cores.cartao }]}>
                  <T tam={13.5} linhas={1} style={{ flex: 1 }}>{a.nome}</T>
                  <T tam={12} cor={cores.texto3}>{a.kcal} kcal · {a.fonte.startsWith('TACO') ? 'TACO' : 'IBGE'}</T>
                </Pressable>
              ))}
            </View>
          ) : novo.nome.trim().length >= 3 ? <T tam={12.5} cor={cores.texto3}>Não está nas tabelas oficiais: preencha com os valores do rótulo.</T> : null}
          <T tam={12.5} cor={cores.texto3}>Valores em 100 g. Só as calorias são obrigatórias.</T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}><Campo rotulo="Calorias (kcal)" value={novo.kcal} onChangeText={(t) => setNovo((n) => ({ ...n, kcal: t }))} keyboardType="decimal-pad" inputMode="decimal" placeholder="0" /></View>
            <View style={{ flex: 1, minWidth: 0 }}><Campo rotulo="Proteína (g)" value={novo.p} onChangeText={(t) => setNovo((n) => ({ ...n, p: t }))} keyboardType="decimal-pad" inputMode="decimal" placeholder="0" /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}><Campo rotulo="Carboidratos (g)" value={novo.c} onChangeText={(t) => setNovo((n) => ({ ...n, c: t }))} keyboardType="decimal-pad" inputMode="decimal" placeholder="0" /></View>
            <View style={{ flex: 1, minWidth: 0 }}><Campo rotulo="Gorduras (g)" value={novo.g} onChangeText={(t) => setNovo((n) => ({ ...n, g: t }))} keyboardType="decimal-pad" inputMode="decimal" placeholder="0" /></View>
          </View>
          {erroNovo ? <View accessibilityRole="alert" accessibilityLiveRegion="polite"><T tam={13} cor={cores.erro}>{erroNovo}</T></View> : null}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <Botao titulo="Salvar e escolher o peso" icone="ok" aoPressionar={salvarNovo} />
            <Botao tipo="discreto" titulo="Voltar" aoPressionar={() => setModo('buscar')} />
          </View>
        </View>
    </Janela>
    </>
  );
}

/* a quantidade: digitada (1 a 2000 g) ou ajustada de 10 em 10 nos botões */
function Passo10({ valor, aoMudar }: { valor: number; aoMudar: (v: number) => void }) {
  const [texto, setTexto] = useState(String(valor));
  useEffect(() => { setTexto(String(valor)); }, [valor]);
  const aplicar = (t: string) => {
    const so = t.replace(/[^0-9]/g, '').slice(0, 4);
    setTexto(so);
    const n = Number(so);
    if (n >= 1) aoMudar(Math.min(2000, n));
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo2, borderRadius: 12, borderWidth: 1, borderColor: cores.linha }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Menos 10 gramas" onPress={() => aoMudar(Math.max(1, valor - 10))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icone nome="menos" tamanho={16} cor={cores.texto2} />
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', minWidth: 76, justifyContent: 'center' }}>
        <TextInput
          value={texto}
          onChangeText={aplicar}
          onBlur={() => { if (!Number(texto)) setTexto(String(valor)); }}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={4}
          selectTextOnFocus
          accessibilityLabel="Quantidade em gramas"
          selectionColor={cores.destaque}
          style={{ width: 52, textAlign: 'right', color: cores.texto, fontSize: 18, fontFamily: FONTE['400'], paddingVertical: 6, outlineWidth: 0, ...({ outlineStyle: 'none' } as object), outlineColor: 'transparent' }}
        />
        <T tam={18} peso="400"> g</T>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Mais 10 gramas" onPress={() => aoMudar(Math.min(2000, valor + 10))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icone nome="mais" tamanho={16} cor={cores.texto2} />
      </Pressable>
    </View>
  );
}

/* o ícone do dia: a foto de refeição tirada por último */
function fotoDoDia(fotos: Partial<Record<TipoRefeicao, { id: string; quando: number }>> | undefined): string | undefined {
  const lista = Object.values(fotos ?? {}).filter(Boolean) as { id: string; quando: number }[];
  return lista.sort((x, y) => y.quando - x.quando)[0]?.id;
}

/* a foto do prato no cartão da refeição: sem foto, o botão da câmera; com foto, a miniatura (tocar troca) e um x para tirar */
function FotoRefeicao({ id, nome, aoFotografar, aoTirar }: { id?: string; nome: string; aoFotografar: () => void; aoTirar: () => void }) {
  const uri = useUriMidia(id ?? '');
  if (!id) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Tirar uma foto do ${nome.toLowerCase()}`} onPress={aoFotografar} hitSlop={4}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 }, (pressed || hovered) && { backgroundColor: cores.linha2 }]}>
        <Icone nome="camera" tamanho={18} cor={cores.texto} />
      </Pressable>
    );
  }
  return (
    <View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Trocar a foto do ${nome.toLowerCase()}`} onPress={aoFotografar} style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao2 }}>
        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Tirar a foto do ${nome.toLowerCase()}`} onPress={aoTirar} hitSlop={8}
        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.painel, borderWidth: 1, borderColor: cores.linha2 }}>
        <Icone nome="fechar" tamanho={10} cor={cores.texto} />
      </Pressable>
    </View>
  );
}

/* renomear, criar ou excluir uma refeição. Excluir só tira a refeição da lista: os alimentos já registrados nela deixam de aparecer. */
function EditarRefeicao({ editando, aoFechar, aoSalvar, aoExcluir, podeExcluir }: { editando: { id: string | null; nome: string } | null; aoFechar: () => void; aoSalvar: (nome: string) => void; aoExcluir: () => void; podeExcluir: boolean }) {
  const [nome, setNome] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  useEffect(() => { if (editando) { setNome(editando.nome); setConfirmar(false); } }, [editando]);
  const ok = nome.trim().length >= 2;
  const novo = !editando?.id;
  return (
    <Folha aberta={!!editando} aoFechar={aoFechar} titulo={novo ? 'Nova refeição' : 'Editar refeição'}>
      <View style={{ gap: 14 }}>
        <Campo rotulo="Nome" value={nome} onChangeText={setNome} placeholder="Ex.: Ceia, Pré-treino" maxLength={24} autoFocus onSubmitEditing={() => { if (ok) aoSalvar(nome.trim()); }} />
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Botao titulo={novo ? 'Criar refeição' : 'Salvar'} icone="ok" desabilitado={!ok} aoPressionar={() => aoSalvar(nome.trim())} />
          {!novo && podeExcluir ? (
            confirmar
              ? <Botao tipo="perigo" icone="lixo" titulo="Excluir mesmo" aoPressionar={aoExcluir} />
              : <Botao tipo="discreto" icone="lixo" titulo="Excluir refeição" aoPressionar={() => setConfirmar(true)} />
          ) : null}
        </View>
        {confirmar ? <T tam={12.5} cor={cores.texto3} style={{ lineHeight: 18 }}>Os alimentos já registrados nesta refeição deixam de aparecer na Dieta.</T> : null}
      </View>
    </Folha>
  );
}
