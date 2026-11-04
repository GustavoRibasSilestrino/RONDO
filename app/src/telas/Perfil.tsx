/* Perfil: quem você é na comunidade (descrição, títulos, nível, destaques, seguidores e seguindo, suas publicações)
   e, mais abaixo, os dados que calculam a sua meta e a conta. */
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CampoFlutuante } from '../componentes/CampoFlutuante';
import { Folha, Tela, useAviso } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Anel, Barra, Botao, Cartao, Passo, Segmentos, T, Titulo } from '../componentes/Ui';
import { modoDemonstracao } from '../api/conta';
import { NIVEIS_ATIVIDADE, OBJETIVOS } from '../dados';
import { useLoja } from '../estado/loja';
import { macrosMeta, metaKcal } from '../lib/calc';
import { fmt } from '../lib/datas';
import { MAX_TITULOS, progressoNivel, TITULOS, xpTotal } from '../lib/nivel';
import { semearSocial } from '../semear';
import { cores } from '../tema';
import type { Midia, Post, Sexo } from '../tipos';
import { Avatar } from './comunidade/Avatar';
import { CartaoPost } from './comunidade/CartaoPost';
import { Miniatura, VisorMidia } from './comunidade/Midia';
import { BotaoSeguir } from './comunidade/Seguir';
import { quando } from './comunidade/util';
import { SITE } from './Login';

export function Perfil() {
  const { estado, commit, limpar } = useLoja();
  const avisar = useAviso();
  const p = estado.perfil;
  const meta = metaKcal(p);
  const m = macrosMeta(p, meta);
  const nome = estado.usuario?.nome ?? 'Você';

  const [editando, setEditando] = useState(false);
  const [bio, setBio] = useState('');
  const [lista, setLista] = useState<'seguidores' | 'seguindo' | null>(null);
  const [visor, setVisor] = useState<{ itens: Midia[]; indice: number } | null>(null);

  /* conta antiga, de antes dos seguidores: cria os de demonstração uma vez */
  useEffect(() => { if (modoDemonstracao && !estado.semeadoSocial) commit((e) => semearSocial(e)); }, [estado.semeadoSocial, commit]);

  const xp = xpTotal(estado);
  const nivel = progressoNivel(xp);
  const seguindo = Object.keys(estado.seguindo).filter((k) => estado.seguindo[k]);
  const seguidores = estado.seguidores;
  const destacadas = estado.perfilSocial.destaques.map((id) => estado.posts.find((x) => x.id === id)).filter((x): x is Post => !!x);
  const exibidos = TITULOS.filter((t) => estado.perfilSocial.titulos.includes(t.id) && t.nivel <= nivel.nivel);

  const mudar = (campo: 'idade' | 'peso' | 'altura', v: number) => commit((e) => { e.perfil[campo] = v; });

  const abrirEdicao = () => { setBio(estado.perfilSocial.bio); setEditando(true); };
  const salvar = () => { commit((e) => { e.perfilSocial.bio = bio.trim(); }); setEditando(false); avisar('Perfil atualizado.'); };

  const alternarTitulo = (id: string, liberado: boolean) => {
    if (!liberado) return;
    commit((e) => {
      const l = e.perfilSocial.titulos;
      const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1);
      else if (l.length < MAX_TITULOS) l.push(id);
    });
  };

  return (
    <Tela>
      {/* cabeçalho: avatar com anel de nível, títulos, descrição e contagens */}
      <View style={st.topo}>
        <Anel progresso={nivel.p} tamanho={104} espessura={5} cor={cores.destaque2}>
          <Avatar nome={nome} voce tamanho={86} />
        </Anel>
        <View style={st.selo}>
          <T tam={12.5} peso="500" cor="#ffffff">Nível {nivel.nivel}</T>
        </View>
        <T tam={30} peso="200" linhas={1} centro style={{ marginTop: 14 }}>{nome}</T>
        {exibidos.length ? (
          <View style={st.titulos}>
            {exibidos.map((t) => (
              <View key={t.id} style={st.titulo}>
                <T tam={12.5} peso="500" cor={cores.destaque2}>{t.nome}</T>
              </View>
            ))}
          </View>
        ) : null}
        {estado.perfilSocial.bio ? (
          <T tam={14.5} cor={cores.texto2} centro style={{ marginTop: 12, lineHeight: 21, maxWidth: 340 }}>{estado.perfilSocial.bio}</T>
        ) : (
          <T tam={14} cor={cores.texto3} centro style={{ marginTop: 12 }}>Conte em uma frase quem você é.</T>
        )}
      </View>

      <View style={st.contagens}>
        <Contagem n={estado.posts.length} rotulo="Publicações" />
        <View style={st.fio} />
        <Contagem n={seguidores.length} rotulo="Seguidores" aoTocar={() => setLista('seguidores')} />
        <View style={st.fio} />
        <Contagem n={seguindo.length} rotulo="Seguindo" aoTocar={() => setLista('seguindo')} />
      </View>

      <Botao tipo="fantasma" icone="perfil" titulo="Editar perfil" aoPressionar={abrirEdicao} style={{ marginTop: 18 }} />

      {/* nível e títulos */}
      <Cartao destaque style={{ marginTop: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <T tam={34} peso="200">Nível {nivel.nivel}</T>
          <T tam={13} cor={cores.texto2}>{fmt(xp)} XP</T>
        </View>
        <View style={{ marginTop: 12 }}>
          <Barra valor={nivel.noNivel} max={nivel.tamanho} cor={cores.destaque2} />
        </View>
        <T tam={13} cor={cores.texto2} style={{ marginTop: 8 }}>Faltam {fmt(nivel.faltam)} XP para o nível {nivel.nivel + 1}.</T>
        <T tam={12.5} cor={cores.texto3} style={{ marginTop: 10, lineHeight: 18 }}>
          Você ganha XP registrando treinos, refeições, check-ins e água, publicando e comentando. Cada nível libera novos títulos.
        </T>
      </Cartao>

      <Titulo>Títulos</Titulo>
      <T tam={13} cor={cores.texto2} style={{ marginTop: -4, marginBottom: 12, lineHeight: 19 }}>Escolha até {MAX_TITULOS} para mostrar no seu perfil.</T>
      <View style={st.colecao}>
        {TITULOS.map((t) => {
          const liberado = t.nivel <= nivel.nivel;
          const ativo = estado.perfilSocial.titulos.includes(t.id) && liberado;
          return (
            <Pressable
              key={t.id}
              disabled={!liberado}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo, disabled: !liberado }}
              accessibilityLabel={liberado ? `${t.nome}${ativo ? ', exibido' : ''}` : `${t.nome}, bloqueado: nível ${t.nivel}`}
              onPress={() => alternarTitulo(t.id, liberado)}
              style={[st.chipTitulo, ativo && st.chipTituloAtivo, !liberado && { opacity: 0.55 }]}
            >
              {!liberado ? <Icone nome="cadeado" tamanho={13} cor={cores.texto3} /> : ativo ? <Icone nome="ok" tamanho={14} cor="#ffffff" /> : null}
              <T tam={13} peso={ativo ? '500' : '300'} cor={ativo ? '#ffffff' : liberado ? cores.texto : cores.texto3}>{t.nome}</T>
              {!liberado ? <T tam={11.5} cor={cores.texto3}>nível {t.nivel}</T> : null}
            </Pressable>
          );
        })}
      </View>

      {/* destaques */}
      <Titulo>Destaques</Titulo>
      {destacadas.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }} style={{ marginHorizontal: -20 }}>
          <View style={{ width: 8 }} />
          {destacadas.map((x) => (
            <Cartao key={x.id} style={st.destaque}>
              {x.midia?.length ? <Miniatura m={x.midia[0]} aoAbrir={() => setVisor({ itens: x.midia ?? [], indice: 0 })} style={{ width: '100%', height: 120, borderRadius: 12, marginBottom: 10 }} /> : null}
              {x.destaque ? <T tam={20} peso="300" cor={cores.destaque2}>{x.destaque}</T> : null}
              <T tam={13.5} linhas={x.midia?.length ? 2 : 4} style={{ lineHeight: 19, marginTop: x.destaque ? 4 : 0 }}>{x.texto}</T>
              <T tam={11.5} cor={cores.texto3} style={{ marginTop: 8 }}>{quando(x.quando)}</T>
            </Cartao>
          ))}
          <View style={{ width: 8 }} />
        </ScrollView>
      ) : (
        <Cartao>
          <T tam={14} cor={cores.texto2} style={{ lineHeight: 20 }}>Destaque até 3 publicações suas. Toque nos três pontos de uma publicação e escolha “Destacar no perfil”.</T>
        </Cartao>
      )}

      {/* publicações */}
      <Titulo>Publicações</Titulo>
      {estado.posts.length ? (
        <View style={{ gap: 14 }}>
          {estado.posts.map((x) => <CartaoPost key={x.id} post={x} aoAbrirMidia={(itens, indice) => setVisor({ itens, indice })} />)}
        </View>
      ) : (
        <Cartao>
          <T tam={14} cor={cores.texto2} style={{ lineHeight: 20 }}>Você ainda não publicou. Compartilhe um treino na Comunidade e ele aparece aqui.</T>
        </Cartao>
      )}

      {/* meta e dados */}
      <Cartao destaque style={{ marginTop: 28 }}>
        <T tam={11} mono cor={cores.destaque2}>SUA META DIÁRIA</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <T tam={44} peso="200">{fmt(meta)}</T>
          <T tam={14} cor={cores.texto2}>kcal por dia</T>
        </View>
        <T tam={13} cor={cores.texto2} style={{ marginTop: 4 }}>Proteína {m.p} g · Carboidrato {m.c} g · Gordura {m.g} g</T>
      </Cartao>

      <Titulo>Seus dados</Titulo>
      <Cartao style={{ gap: 18 }}>
        <View style={{ gap: 8 }}>
          <T tam={11} mono cor={cores.texto3}>SEXO</T>
          <Segmentos<Sexo> valor={p.sexo} aoMudar={(v) => commit((e) => { e.perfil.sexo = v; })} opcoes={[{ valor: 'm', nome: 'Masculino' }, { valor: 'f', nome: 'Feminino' }]} />
        </View>
        {[
          { campo: 'idade' as const, nome: 'IDADE', valor: p.idade, passo: 1, min: 14, max: 90, unidade: 'anos' },
          { campo: 'peso' as const, nome: 'PESO', valor: p.peso, passo: 0.5, min: 30, max: 250, unidade: 'kg' },
          { campo: 'altura' as const, nome: 'ALTURA', valor: p.altura, passo: 1, min: 120, max: 230, unidade: 'cm' },
        ].map((c) => (
          <View key={c.campo} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T tam={11} mono cor={cores.texto3}>{c.nome}</T>
            <Passo rotulo={c.nome.toLowerCase()} valor={c.valor} passo={c.passo} min={c.min} max={c.max} formato={(v) => fmt(v, c.campo === 'peso' ? 1 : 0)} unidade={c.unidade} aoMudar={(v) => mudar(c.campo, v)} />
          </View>
        ))}
        <View style={{ gap: 8 }}>
          <T tam={11} mono cor={cores.texto3}>ATIVIDADE</T>
          <Segmentos<number> valor={p.atividade} aoMudar={(v) => commit((e) => { e.perfil.atividade = v; })} opcoes={NIVEIS_ATIVIDADE.map((n) => ({ valor: n.valor, nome: n.nome }))} />
        </View>
        <View style={{ gap: 8 }}>
          <T tam={11} mono cor={cores.texto3}>OBJETIVO</T>
          <Segmentos<number> valor={p.objetivo} aoMudar={(v) => commit((e) => { e.perfil.objetivo = v; })} opcoes={OBJETIVOS.map((o) => ({ valor: o.valor, nome: o.nome }))} />
        </View>
      </Cartao>
      <T tam={11} cor={cores.texto3} style={{ marginTop: 10, lineHeight: 17 }}>
        Meta pelo cálculo de Mifflin-St Jeor, com piso de segurança. É uma estimativa para organização, não uma prescrição.
      </T>

      <Titulo>Conta</Titulo>
      <View style={{ gap: 12 }}>
        <Botao tipo="fantasma" icone="sair" titulo="Sair da conta" aoPressionar={() => commit((e) => { e.usuario = null; })} />
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(SITE)} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
          <T tam={13} cor={cores.destaque2}>Assinatura, termos e privacidade no site →</T>
        </Pressable>
        <Botao
          tipo="perigo"
          icone="lixo"
          titulo="Apagar os meus dados deste aparelho"
          aoPressionar={async () => { await limpar(); avisar('Dados apagados.'); }}
        />
      </View>
      <T tam={11} cor={cores.texto3} style={{ marginTop: 22 }}>Yesteryou · versão 0.1.0</T>

      {/* editar a descrição */}
      <Folha aberta={editando} aoFechar={() => setEditando(false)} titulo="Editar perfil">
        <CampoFlutuante rotulo="Descrição" value={bio} onChangeText={setBio} maxLength={160} multiline />
        <T tam={12} mono cor={cores.texto3} style={{ alignSelf: 'flex-end', marginTop: 6 }}>{bio.length}/160</T>
        <Botao titulo="Salvar" aoPressionar={salvar} style={{ marginTop: 14 }} />
      </Folha>

      {/* seguidores e seguindo */}
      <Folha aberta={lista !== null} aoFechar={() => setLista(null)} titulo={lista === 'seguidores' ? 'Seguidores' : 'Seguindo'}>
        {(lista === 'seguidores' ? seguidores : seguindo).length ? (
          <View style={{ gap: 14 }}>
            {(lista === 'seguidores' ? seguidores : seguindo).map((n) => (
              <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar nome={n} />
                <T tam={15} style={{ flex: 1 }} linhas={1}>{n}</T>
                <BotaoSeguir nome={n} />
              </View>
            ))}
          </View>
        ) : (
          <T tam={14} cor={cores.texto2} style={{ lineHeight: 20 }}>
            {lista === 'seguidores' ? 'Ninguém segue você ainda.' : 'Você ainda não segue ninguém. Toque em Seguir nas publicações e no ranking da Comunidade.'}
          </T>
        )}
      </Folha>

      <VisorMidia itens={visor?.itens ?? []} inicio={visor ? visor.indice : null} aoFechar={() => setVisor(null)} />
    </Tela>
  );
}

function Contagem({ n, rotulo, aoTocar }: { n: number; rotulo: string; aoTocar?: () => void }) {
  return (
    <Pressable accessibilityRole={aoTocar ? 'button' : 'text'} accessibilityLabel={`${rotulo}: ${n}`} disabled={!aoTocar} onPress={aoTocar} style={st.contagem}>
      <T tam={24} peso="200">{fmt(n)}</T>
      <T tam={12.5} cor={cores.texto2}>{rotulo}</T>
    </Pressable>
  );
}

const st = StyleSheet.create({
  topo: { alignItems: 'center' },
  selo: { marginTop: -12, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: cores.destaqueForte, borderWidth: 2, borderColor: cores.fundo },
  titulos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  titulo: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(139,92,246,0.14)' },
  contagens: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  contagem: { flex: 1, alignItems: 'center', gap: 2, minHeight: 56, justifyContent: 'center' },
  fio: { width: 1, height: 32, backgroundColor: cores.linha },
  colecao: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipTitulo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  chipTituloAtivo: { backgroundColor: cores.destaqueForte, borderColor: cores.destaqueForte },
  destaque: { width: 240 },
});
