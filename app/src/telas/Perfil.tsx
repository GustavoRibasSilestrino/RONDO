/* O seu perfil. Desde 2026-11-26 no mesmo layout de "página de jogo" do perfil das outras pessoas (pedido do dono, com referência):
   a CAPA no alto (a sua imagem ou, sem ela, o cinza com "Adicionar capa"), as ações redondas de vidro sobre ela (o plano, o diário
   de recados e as configurações), a foto encostada na borda da capa com o mascote, as etiquetas ao lado (verificado, nível,
   mascote, selo), o nome, o @, os títulos e a bio, os números em chips, os botões Compartilhar e Editar perfil, a GALERIA das
   suas fotos e, embaixo, as abas Publicações e Coleção de mascotes. Trocar ou tirar a capa: Configurações > Editar perfil. */
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CampoFlutuante } from '../componentes/CampoFlutuante';
import { ErroHttp } from '../api/cliente';
import { salvarPerfilNoServidor } from '../api/sincronia';
import { Folha, Tela, useAviso } from '../componentes/Estrutura';
import { Icone, type NomeIcone } from '../componentes/Icone';
import { Selo, tipoDeSelo } from '../componentes/Selos';
import { BalaoMascote, FotoComMascote } from '../componentes/FotoComMascote';
import { Vidro } from '../componentes/Vidro';
import { useLayoutLargo } from '../lib/largura';
import { mascoteDe } from '../lib/mascotes';
import { TelaPlanos } from '../componentes/TelaPlanos';
import { Botao, T } from '../componentes/Ui';
import { useLoja } from '../estado/loja';
import { limitesDe } from '../lib/beneficios';
import { fmt } from '../lib/datas';
import { enviarMidia, escolherFoto, removerMidia } from '../lib/midia';
import { progressoNivel, TITULOS, xpTotal } from '../lib/nivel';
import { CENA, cores, estilos, VERDE } from '../tema';
import type { Midia } from '../tipos';
import { lerPostsDaPessoa, lerSeguidores, lerSeguindo } from '../api/social';
import type { PostSocial } from '../api/social';
import { useLista } from '../estado/lista';
import { Avatar } from './comunidade/Avatar';
import { CartaoPost } from './comunidade/CartaoPost';
import { VisorMidia } from './comunidade/Midia';
import { BotaoRedondo, Chip, Miniatura as MiniaturaGaleria, PerfilPessoa } from './comunidade/PerfilPessoa';
import { CapaPerfil, useCapaPerfil } from './perfil/CapaPerfil';
import { BotaoSeguir } from './comunidade/Seguir';
import { ColecaoMascotes } from './perfil/ColecaoMascotes';
import { Configuracoes, ITENS_CONFIG, type SecaoConfig } from './perfil/Configuracoes';
import { MenuMais } from '../componentes/MenuMais';
import type { Retangulo } from '../lib/botaoMais';
import { EditarTitulos } from './perfil/EditarTitulos';

/* nome de usuário de partida: o nome sem acentos, em minúsculas */
export const arrobaPadrao = (nome: string): string => (nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 20) || 'rondo');

const ALTURA_CAPA = 220;
const FOTO = 92;

export function Perfil({ ir }: { ir: (tela: string) => void }) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const nome = estado.usuario?.nome ?? 'Você';
  const insets = useSafeAreaInsets();
  const { largo } = useLayoutLargo();
  const capaConta = useCapaPerfil();
  const [fala, setFala] = useState<string | null>(null);   // a fala do mascote, mostrada numa linha própria

  const [aba, setAba] = useState<'posts' | 'colecao'>('posts');
  const [editando, setEditando] = useState(false);
  const [config, setConfig] = useState(false);
  const [planos, setPlanos] = useState(false);   // a tela de planos, aberta por "Melhorar plano"
  const [postAberto, setPostAberto] = useState<PostSocial | null>(null);
  const [bio, setBio] = useState('');
  const [nomeEd, setNomeEd] = useState('');
  const [arrobaEd, setArrobaEd] = useState('');
  const [fotoEd, setFotoEd] = useState<string | null>(null);   // id da foto escolhida (ainda não salva); null = sem foto
  const [fotoNova, setFotoNova] = useState<string | null>(null);   // foto guardada nesta edição, para apagar se a pessoa desistir
  const [erroEd, setErroEd] = useState<{ nome?: string; arroba?: string }>({});
  const [editandoTitulos, setEditandoTitulos] = useState(false);
  const [lista, setLista] = useState<'seguidores' | 'seguindo' | null>(null);
  const [perfilAberto, setPerfilAberto] = useState<number | null>(null);   // o perfil de alguém da lista de seguidores/seguindo
  const [visor, setVisor] = useState<{ itens: Midia[]; indice: number } | null>(null);

  const xp = xpTotal(estado);
  const nivel = progressoNivel(xp);
  const limites = limitesDe(nivel.nivel);
  /* as contagens, as publicações e as listas de conexões vêm do servidor */
  const meuId = estado.social.id;
  const publicacoes = useLista((cursor) => lerPostsDaPessoa(meuId, cursor), [meuId], meuId > 0);
  const conexoes = useLista((cursor) => (lista === 'seguidores' ? lerSeguidores(meuId, cursor) : lerSeguindo(meuId, cursor)), [meuId, lista], meuId > 0 && lista !== null);
  const exibidos = TITULOS.filter((t) => estado.perfilSocial.titulos.includes(t.id) && t.nivel <= nivel.nivel);
  const arrobaAtual = estado.usuario?.arroba ?? arrobaPadrao(nome);

  /* publicações em grade: as fixadas (destacadas) primeiro */
  const fixadas = new Set(estado.perfilSocial.destaques);
  const grade = [...publicacoes.itens].sort((a, b) => Number(fixadas.has(String(b.id))) - Number(fixadas.has(String(a.id))) || b.quando - a.quando);

  const abrirEdicao = () => {
    setBio(estado.perfilSocial.bio); setNomeEd(nome); setArrobaEd(arrobaAtual); setFotoEd(estado.usuario?.foto ?? null); setFotoNova(null); setErroEd({});
    setEditando(true);
  };
  const fecharEdicao = () => {
    if (fotoNova) removerMidia([fotoNova]);   // desistiu: a foto escolhida nesta edição não fica no aparelho
    setEditando(false);
  };
  const escolherFotoPerfil = async (origem: 'galeria' | 'camera') => {
    try {
      const m = await escolherFoto(origem);
      if (!m) return;
      if (fotoNova) removerMidia([fotoNova]);
      setFotoNova(m.id); setFotoEd(m.id);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível abrir as fotos.');
    }
  };
  const salvar = async () => {
    const n = nomeEd.trim();
    const a = arrobaEd.trim().replace(/^@/, '').toLowerCase();
    const erros: { nome?: string; arroba?: string } = {};
    if (n.length < 2) erros.nome = 'Escreva o seu nome (pelo menos 2 letras).';
    if (!/^[a-z0-9._]{3,20}$/.test(a)) erros.arroba = 'Use de 3 a 20 letras minúsculas, números, ponto ou _.';
    setErroEd(erros);
    if (erros.nome || erros.arroba) return;
    /* o servidor guarda o nome, o @, a bio e a foto; se o @ já for de outra pessoa, avisa aqui e não muda nada.
       Uma foto nova sobe para o Storage primeiro; no perfil fica o endereço dela, para voltar em qualquer aparelho. */
    let fotoFinal: string | null = fotoEd;
    try {
      if (fotoEd && !fotoEd.startsWith('http')) {   // foto nova, ou uma antiga que só existia neste aparelho: sobe agora
        fotoFinal = (await enviarMidia({ id: fotoEd, tipo: 'imagem', largura: 0, altura: 0 })).url ?? null;
        if (!fotoFinal) throw new Error('Não foi possível enviar a foto agora. Tente de novo.');
      }
      await salvarPerfilNoServidor({ nome: n, arroba: a, bio: bio.trim(), foto: fotoFinal });
    } catch (e) {
      if (e instanceof ErroHttp && e.status === 409) { setErroEd(/nome/i.test(e.message) && !e.message.includes('@') ? { nome: e.message } : { arroba: e.message }); return; }
      avisar(e instanceof Error ? e.message : 'Não foi possível salvar o perfil agora.');
      return;
    }
    const antiga = estado.usuario?.foto;
    commit((e) => {
      e.perfilSocial.bio = bio.trim();
      if (e.usuario) { e.usuario.nome = n; e.usuario.arroba = a; e.usuario.foto = fotoFinal ?? undefined; }
    });
    /* o que subiu (ou foi descartado) não precisa mais do arquivo no aparelho; a foto passa a ser o endereço do servidor */
    const locais = [...new Set([fotoNova, fotoEd].filter((x): x is string => !!x && !x.startsWith('http')))];
    if (locais.length) removerMidia(locais);
    if (antiga && antiga !== fotoFinal && !antiga.startsWith('http')) removerMidia([antiga]);   // foto antiga só no aparelho; a do servidor o servidor apaga
    setFotoNova(null);
    setEditando(false);
    avisar('Perfil atualizado.');
  };

  /* a galeria: as fotos e os vídeos das minhas publicações, na ordem delas */
  const galeria = grade.flatMap((p) => p.midia ?? []);
  const mascote = mascoteDe(estado.usuario?.mascote);
  /* as etiquetas ao lado da foto (como "Action" e "Fantasy" da referência) */
  const etiquetas: { icone: NomeIcone; texto: string }[] = [{ icone: 'evolucao', texto: `Nível ${nivel.nivel}` }];
  if (estado.usuario?.verificado || estado.pro) etiquetas.unshift({ icone: 'verificado', texto: 'Verificado' });
  if (mascote) etiquetas.push({ icone: 'estrela', texto: estado.usuario?.mascoteNome || mascote.nome });
  /* o menu dos três pontinhos: abre colado no botão (mede onde ele está na hora do toque) */
  const pontinhos = useRef<React.ElementRef<typeof View>>(null);
  const [menu, setMenu] = useState<Retangulo | null>(null);
  const [secaoConfig, setSecaoConfig] = useState<SecaoConfig | null>(null);
  const abrirMenu = () => {
    const el = pontinhos.current;
    if (!el) { setMenu({ x: 0, y: 0, w: 0, h: 0 }); return; }
    el.measureInWindow((x, y, w, h) => setMenu({ x, y, w, h }));
  };
  const abrirConfig = (secao: SecaoConfig | null) => { setSecaoConfig(secao); setConfig(true); };
  const compartilhar = async () => {
    try {
      await Share.share({ message: `Me acha no RONDO: ${nome} (@${arrobaAtual}). Compita com quem você foi ontem.` });
    } catch {
      avisar('Compartilhar não está disponível neste aparelho.');
    }
  };

  return (
    <Tela semCabecalho>
      {/* a capa, de ponta a ponta e encostada no alto (desde 2026-11-26, no layout de "página de jogo" que o dono mandou):
          a imagem da pessoa ou, sem ela, o cinza com "Adicionar capa"; trocar ou tirar fica em Configurações > Editar perfil */}
      <View style={[st.capaCaixa, { marginTop: -(insets.top + (largo ? 14 : 10)) }]}>
        <CapaPerfil capa={capaConta.capa} altura={ALTURA_CAPA + insets.top} aoAdicionar={capaConta.escolher} enviando={capaConta.enviando} fundo={CENA.degrade[0]} />
        {/* as ações sobre a capa, redondas e de vidro: o plano, o diário de recados e as configurações */}
        <View pointerEvents="box-none" style={[st.topo, { top: insets.top + 10 }]}>
          {estado.pro ? (
            <BotaoRedondo icone="estrela" rotulo="Seu plano: PRO" aoPressionar={() => setPlanos(true)} />
          ) : (
            <Vidro interativo tom={VERDE.botao} style={st.melhorar}>
              <Pressable accessibilityRole="button" accessibilityLabel="Melhorar plano: conhecer o PRO" onPress={() => setPlanos(true)} style={({ pressed }) => [st.melhorarToque, pressed && { opacity: 0.85 }]}>
                <Icone nome="estrela" tamanho={14} cor="#ffffff" espessura={2} />
                <T tam={13} peso="500" cor="#ffffff">Melhorar plano</T>
              </Pressable>
            </Vidro>
          )}
          <BotaoRedondo icone="calendario" rotulo="Diário de recados" aoPressionar={() => ir('diario')} />
          {/* os três pontinhos no lugar da engrenagem (pedido do dono, 2026-11-26): abrem o menu com Compartilhar, Editar perfil
              e as mesmas opções da engrenagem */}
          <View ref={pontinhos} collapsable={false}>
            <BotaoRedondo icone="pontos" rotulo="Mais opções do perfil" aoPressionar={abrirMenu} />
          </View>
        </View>
      </View>

      {/* a foto encostada na borda de baixo da capa (com o mascote ao lado) e, à direita, as etiquetas */}
      <View style={st.linhaFoto}>
        <FotoComMascote chave={estado.usuario?.mascote} tamanhoFoto={FOTO + 8} aoFalar={setFala}>
          <View style={st.anel}><Avatar nome={nome} voce tamanho={FOTO} /></View>
        </FotoComMascote>
        <View style={st.etiquetas}>
          {etiquetas.map((e) => (
            <View key={e.texto} style={st.etiqueta}>
              <Icone nome={e.icone} tamanho={14} cor={cores.texto} />
              <T tam={12.5} peso="400" linhas={1} style={{ flexShrink: 1 }}>{e.texto}</T>
            </View>
          ))}
          {tipoDeSelo(estado.usuario?.selo) ? <Selo tipo={tipoDeSelo(estado.usuario?.selo)!} /> : null}
        </View>
      </View>
      {/* a fala do mascote numa linha própria, de largura inteira (antes o balão cobria as contagens e o mascote caía em cima do texto) */}
      <View style={{ marginTop: fala ? 10 : 0 }}><BalaoMascote fala={fala} aoFechar={() => setFala(null)} /></View>

      <T tam={24} peso="500" linhas={2} style={{ marginTop: 12, letterSpacing: -0.5 }}>{nome}</T>
      <T tam={13.5} cor={cores.texto3} style={{ marginTop: 2 }}>@{arrobaAtual}</T>
      <View style={st.titulos}>
        {exibidos.map((t) => <View key={t.id} style={st.titulo}><T tam={12} peso="500">{t.nome}</T></View>)}
        <Pressable accessibilityRole="button" accessibilityLabel="Editar títulos" onPress={() => setEditandoTitulos(true)} hitSlop={8} style={st.lapis}>
          <Icone nome="lapis" tamanho={15} cor={cores.texto} />
        </Pressable>
      </View>
      <T tam={14} cor={cores.texto2} style={{ marginTop: 10, lineHeight: 21, opacity: estado.perfilSocial.bio ? 1 : 0.7 }}>{estado.perfilSocial.bio || 'Conte em uma frase quem você é.'}</T>

      {/* os números em chips: seguidores e seguindo abrem a lista */}
      <View style={st.chips}>
        <Chip icone="grade" texto={`${fmt(estado.social.posts)} ${estado.social.posts === 1 ? 'publicação' : 'publicações'}`} />
        <Chip icone="social" texto={`${fmt(estado.social.seguidores)} ${estado.social.seguidores === 1 ? 'seguidor' : 'seguidores'}`} rotulo="Ver quem segue você" aoPressionar={() => setLista('seguidores')} />
        <Chip icone="perfil" texto={`${fmt(estado.social.seguindo)} seguindo`} rotulo="Ver quem você segue" aoPressionar={() => setLista('seguindo')} />
      </View>

      {/* o botão principal, invertido: Editar perfil (fica em linha aqui, não preso ao pé, porque o pé já tem a barra de abas) */}
      <View style={st.acoes}>
        <Vidro interativo tom={cores.texto} style={[st.acao, st.acaoPrincipal]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Editar perfil" onPress={abrirEdicao} style={({ pressed }) => [st.acaoToque, pressed && { opacity: 0.85 }]}>
            <Icone nome="lapis" tamanho={17} cor={cores.fundo} />
            <T tam={15.5} peso="500" cor={cores.fundo}>Editar perfil</T>
          </Pressable>
        </Vidro>
      </View>

      {galeria.length ? (
        <>
          <T tam={15} peso="400" cor={cores.texto3} style={st.secao}>Galeria</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.carrossel} contentContainerStyle={st.carrosselMiolo}>
            {galeria.map((m, i) => <MiniaturaGaleria key={`${m.id}-${i}`} midia={m} aoPressionar={() => setVisor({ itens: galeria, indice: i })} />)}
          </ScrollView>
        </>
      ) : null}

      {/* abas */}
      <View style={st.abas}>
        {([['posts', 'grade', 'Publicações'], ['colecao', 'brownie', 'Coleção de mascotes']] as const).map(([id, icone, rotulo]) => {
          const ativa = aba === id;
          return (
            <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: ativa }} accessibilityLabel={rotulo} onPress={() => setAba(id)} style={[st.aba, ativa && st.abaAtiva]}>
              <Icone nome={icone} tamanho={22} cor={cores.texto} />
            </Pressable>
          );
        })}
      </View>

      {aba === 'posts' ? (
        grade.length ? (
          <View style={st.linhaDoTempo}>
            {grade.map((x) => <CartaoPost key={x.id} post={x} timeline aoAbrirMidia={(itens, indice) => setVisor({ itens, indice })} aoApagar={(id) => publicacoes.mudar((l) => l.filter((p) => p.id !== id))} />)}
            {publicacoes.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais" aoPressionar={publicacoes.maisItens} carregando={publicacoes.carregando} style={{ marginTop: 12 }} /> : null}
          </View>
        ) : (
          <View style={st.vazio}>
            <Icone nome="camera" tamanho={30} cor={cores.texto3} />
            <T tam={15} peso="500" style={{ marginTop: 10 }}>Nenhuma publicação ainda</T>
            <T tam={13} centro style={{ marginTop: 4, lineHeight: 19 }}>Toque no + do Feed para compartilhar um treino, uma refeição ou uma conquista.</T>
          </View>
        )
      ) : (
        <ColecaoMascotes aoVerMissoes={() => ir('colecoes')} />
      )}

      {/* a publicação aberta, com cheers e comentários */}
      <Folha aberta={postAberto !== null} aoFechar={() => setPostAberto(null)}>
        {postAberto ? <CartaoPost post={postAberto} aoAbrirMidia={(itens, indice) => { setPostAberto(null); setVisor({ itens, indice }); }} /> : null}
      </Folha>

      {/* editar o perfil: foto, nome, nome de usuário e descrição */}
      <Folha aberta={editando} aoFechar={fecharEdicao} titulo="Editar perfil">
        {/* a capa: trocar ou tirar (salva na hora, sem esperar o Salvar) */}
        <T tam={13} cor={cores.texto2} style={{ marginBottom: 8 }}>Capa</T>
        <CapaPerfil capa={capaConta.capa} altura={110} arredondada />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 18, flexWrap: 'wrap' }}>
          <Botao pequeno tipo="fantasma" icone="imagem" titulo={capaConta.capa ? 'Trocar capa' : 'Escolher capa'} carregando={capaConta.enviando} aoPressionar={capaConta.escolher} />
          {capaConta.capa ? <Botao pequeno tipo="discreto" icone="lixo" titulo="Tirar capa" aoPressionar={capaConta.remover} /> : null}
        </View>
        <T tam={13} cor={cores.texto2} style={{ marginBottom: 8 }}>Foto</T>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Avatar nome={nomeEd || nome} voce foto={fotoEd ?? undefined} tamanho={96} semFoto={fotoEd === null} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Botao pequeno tipo="fantasma" icone="imagem" titulo="Galeria" aoPressionar={() => escolherFotoPerfil('galeria')} />
            {Platform.OS !== 'web' ? <Botao pequeno tipo="fantasma" icone="camera" titulo="Câmera" aoPressionar={() => escolherFotoPerfil('camera')} /> : null}
            {fotoEd ? <Botao pequeno tipo="discreto" icone="lixo" titulo="Remover" aoPressionar={() => setFotoEd(null)} /> : null}
          </View>
        </View>
        <CampoFlutuante rotulo="Nome" icone="perfil" value={nomeEd} onChangeText={setNomeEd} maxLength={40} erro={erroEd.nome} autoCapitalize="words" returnKeyType="next" />
        <View style={{ height: 12 }} />
        <CampoFlutuante rotulo="Nome de usuário" value={arrobaEd} onChangeText={(v) => setArrobaEd(v.replace(/^@/, '').toLowerCase())} maxLength={20} erro={erroEd.arroba} autoCapitalize="none" autoCorrect={false} returnKeyType="next" />
        <View style={{ height: 12 }} />
        <CampoFlutuante rotulo="Descrição" value={bio} onChangeText={setBio} maxLength={limites.bio} multiline />
        <T tam={12} mono style={{ alignSelf: 'flex-end', marginTop: 6 }}>{bio.length}/{limites.bio}</T>
        <T tam={12.5} style={{ marginTop: 8, lineHeight: 18 }}>Idade, peso, altura e objetivo ficam em Configurações, Seus dados.</T>
        <Botao titulo="Salvar" aoPressionar={salvar} style={{ marginTop: 14 }} />
      </Folha>

      {/* seguidores e seguindo */}
      <Folha aberta={lista !== null} aoFechar={() => setLista(null)} titulo={lista === 'seguidores' ? 'Seguidores' : 'Seguindo'}>
        {conexoes.itens.length ? (
          <View style={{ gap: 14 }}>
            {conexoes.itens.map((n) => (
              <View key={n.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {/* tocar na pessoa (foto ou nome) abre o perfil dela */}
                <Pressable
                  accessibilityRole="button" accessibilityLabel={`Abrir o perfil de ${n.nome}`} disabled={n.voce}
                  onPress={() => { setLista(null); setPerfilAberto(n.id); }}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                >
                  <Avatar nome={n.nome} voce={n.voce} foto={n.foto ?? undefined} />
                  <View style={{ flex: 1 }}>
                    <T tam={15} linhas={1}>{n.nome}</T>
                    {n.arroba ? <T tam={12.5} linhas={1} style={{ opacity: 0.75 }}>@{n.arroba}</T> : null}
                  </View>
                </Pressable>
                {n.voce ? null : <BotaoSeguir pessoa={n} />}
              </View>
            ))}
            {conexoes.temMais ? <Botao pequeno tipo="discreto" titulo="Ver mais" aoPressionar={conexoes.maisItens} carregando={conexoes.carregando} /> : null}
          </View>
        ) : (
          <T tam={14} style={{ lineHeight: 20 }}>
            {conexoes.erro || (conexoes.carregando ? 'Carregando...' : lista === 'seguidores' ? 'Ninguém segue você ainda.' : 'Você ainda não segue ninguém. Toque em Seguir nas publicações do Feed ou na busca de pessoas.')}
          </T>
        )}
      </Folha>

      <Configuracoes aberto={config} aoFechar={() => { setConfig(false); setSecaoConfig(null); }} aoEditarPerfil={abrirEdicao} secaoInicial={secaoConfig} />
      <MenuMais
        aberto={menu !== null} aoFechar={() => setMenu(null)} rotulo="Mais opções do perfil" ancora={menu && menu.w ? menu : null}
        itens={[
          { rotulo: 'Compartilhar perfil', aoPressionar: () => { void compartilhar(); } },
          { rotulo: 'Editar perfil', aoPressionar: abrirEdicao },
          ...ITENS_CONFIG.filter((i) => i.id !== 'denuncias' || estado.usuario?.papel === 'dono').map((i) => ({ rotulo: i.titulo, aoPressionar: () => abrirConfig(i.id) })),
        ]}
      />
      <TelaPlanos aberto={planos} aoFechar={() => setPlanos(false)} />
      <EditarTitulos aberta={editandoTitulos} aoFechar={() => setEditandoTitulos(false)} />
      <VisorMidia itens={visor?.itens ?? []} inicio={visor ? visor.indice : null} aoFechar={() => setVisor(null)} />
      <PerfilPessoa id={perfilAberto} aoFechar={() => setPerfilAberto(null)} aoAbrirMidia={(itens, indice) => setVisor({ itens, indice })} />
    </Tela>
  );
}

const st = estilos(() => StyleSheet.create({
  capaCaixa: { marginHorizontal: -20 },
  topo: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  melhorar: { height: 46, borderRadius: 23, overflow: 'hidden', backgroundColor: VERDE.botao },
  melhorarToque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16 },
  linhaFoto: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: -FOTO / 2 },
  anel: { borderRadius: (FOTO + 8) / 2, padding: 4, backgroundColor: CENA.degrade[0] },   // o anel da cor do fundo de trás
  etiquetas: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: 6, paddingBottom: 6 },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: cores.cartao2 },
  titulos: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
  lapis: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: cores.linha2 },
  titulo: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: `rgba(${cores.tom},0.16)` },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 16 },
  acao: { flex: 1, height: 50, borderRadius: 25, overflow: 'hidden' },
  acaoSecundaria: { backgroundColor: cores.cartao2, borderWidth: 1, borderColor: cores.linha2 },
  acaoPrincipal: { backgroundColor: cores.texto },
  acaoToque: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secao: { marginTop: 24, marginBottom: 12 },
  carrossel: { marginHorizontal: -20 },
  carrosselMiolo: { paddingHorizontal: 20, gap: 12 },
  abas: { flexDirection: 'row', marginTop: 22, borderTopWidth: 1, borderTopColor: cores.linha },
  aba: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderTopWidth: 2, borderTopColor: 'transparent', marginTop: -1, opacity: 0.55 },
  abaAtiva: { borderTopColor: cores.texto, opacity: 1 },
  linhaDoTempo: { marginTop: 4 },
  vazio: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
}));
