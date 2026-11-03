/* Comunidade: feed, ranking semanal de constância e clubes. */
import React, { useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { Tela, useAviso } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Barra, Botao, Cartao, Chip, Segmentos, T } from '../componentes/Ui';
import { CLUBES, POSTS_BASE, RANKING_BASE } from '../dados';
import { useLoja } from '../estado/loja';
import { comparar, pontosSemana, statsSemana } from '../lib/calc';
import { fmt } from '../lib/datas';
import { cores } from '../tema';

type Aba = 'feed' | 'ranking' | 'clubes';

const quando = (ts: number): string => {
  const min = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`;
};

function Avatar({ nome, voce }: { nome: string; voce?: boolean }) {
  return (
    <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: voce ? cores.violeta : cores.violetaEscuro }}>
      <T tam={14} peso="500" cor="#ffffff">{nome.charAt(0).toUpperCase()}</T>
    </View>
  );
}

export function Social() {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const [aba, setAba] = useState<Aba>('feed');
  const hoje = new Date();

  const posts = [
    ...estado.posts,
    ...POSTS_BASE.map((p) => ({ id: p.id, autor: p.autor, texto: p.texto, destaque: p.destaque, quando: Date.now() - p.horas * 3600000 })),
  ].sort((a, b) => b.quando - a.quando);

  const meuRanking = pontosSemana(estado, hoje);
  const ranking = [...RANKING_BASE.map((r) => ({ ...r, voce: false })), { nome: estado.usuario?.nome ?? 'Você', pontos: meuRanking, voce: true }].sort((a, b) => b.pontos - a.pontos);

  const compartilhar = async () => {
    const cmp = comparar(statsSemana(estado, hoje, 0), statsSemana(estado, hoje, 1));
    const texto = cmp.geral === null ? 'Estou começando a competir com o meu ontem no Yesteryou.' : `Esta semana estou ${cmp.geral >= 0 ? '+' : ''}${cmp.geral}% em relação à semana passada. Compita com quem você foi ontem. Yesteryou.`;
    try {
      await Share.share({ message: texto });
    } catch {
      avisar('Compartilhar não está disponível neste aparelho.');
    }
  };

  return (
    <Tela>
      <T tam={36} peso="200">Comunidade</T>
      <T tam={14} cor={cores.texto2} style={{ marginTop: 6 }}>Gente que também voltou hoje.</T>
      <View style={{ marginTop: 20 }}>
        <Segmentos<Aba> valor={aba} aoMudar={setAba} opcoes={[{ valor: 'feed', nome: 'Feed' }, { valor: 'ranking', nome: 'Ranking' }, { valor: 'clubes', nome: 'Clubes' }]} />
      </View>

      {aba === 'feed' ? (
        <View style={{ gap: 14, marginTop: 18 }}>
          <Botao tipo="fantasma" icone="social" titulo="Compartilhar o meu card Você vs. Yesteryou" aoPressionar={compartilhar} />
          {posts.map((p) => {
            const curtiu = !!estado.curtidas[p.id];
            const base = p.autor === 'Você' ? 0 : 3 + (p.id.length * 7) % 40;   // números dos outros são de demonstração; o seu post começa do zero
            return (
              <Cartao key={p.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar nome={p.autor} voce={p.autor === 'Você'} />
                  <View style={{ flex: 1 }}>
                    <T tam={14} peso="500">{p.autor}</T>
                    <T tam={12} cor={cores.texto3}>{quando(p.quando)}</T>
                  </View>
                </View>
                <T tam={15} style={{ marginTop: 12, lineHeight: 22 }}>{p.texto}</T>
                {p.destaque ? (
                  <View style={{ marginTop: 12, backgroundColor: cores.fundo2, borderRadius: 8, padding: 12 }}>
                    <T tam={18} peso="300" cor={cores.destaque2}>{p.destaque}</T>
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: curtiu }}
                  accessibilityLabel="Curtir"
                  onPress={() => commit((e) => { e.curtidas[p.id] = !e.curtidas[p.id]; })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' }}
                >
                  <Icone nome="coracao" tamanho={18} cor={curtiu ? cores.erro : cores.texto2} />
                  <T tam={13} cor={curtiu ? cores.erro : cores.texto2}>{base + (curtiu ? 1 : 0)}</T>
                </Pressable>
              </Cartao>
            );
          })}
        </View>
      ) : null}

      {aba === 'ranking' ? (
        <View style={{ marginTop: 18 }}>
          <Cartao>
            <T tam={12} mono cor={cores.texto3}>PONTOS DA SEMANA</T>
            {ranking.map((r, i) => (
              <View key={r.nome} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: i === ranking.length - 1 ? 0 : 1, borderBottomColor: cores.linha, backgroundColor: r.voce ? 'rgba(139,92,246,0.12)' : 'transparent', marginHorizontal: r.voce ? -8 : 0, paddingHorizontal: r.voce ? 8 : 0, borderRadius: r.voce ? 6 : 0 }}>
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
      ) : null}

      {aba === 'clubes' ? (
        <View style={{ gap: 14, marginTop: 18 }}>
          {CLUBES.map((c) => {
            const dentro = !!estado.clubes[c.id];
            return (
              <Cartao key={c.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <T tam={19} peso="300" style={{ flex: 1 }}>{c.nome}</T>
                  {dentro ? <Chip texto="membro" tom="bom" /> : null}
                </View>
                <T tam={12} cor={cores.texto3} style={{ marginTop: 2 }}>{fmt(c.membros + (dentro ? 1 : 0))} membros</T>
                <T tam={13} cor={cores.texto2} style={{ marginTop: 10 }}>{c.meta}</T>
                <View style={{ marginTop: 8 }}><Barra valor={c.progresso} max={1} cor={cores.destaque} /></View>
                <Botao
                  pequeno
                  tipo={dentro ? 'discreto' : 'fantasma'}
                  titulo={dentro ? 'Sair do clube' : 'Entrar no clube'}
                  aoPressionar={() => commit((e) => { e.clubes[c.id] = !e.clubes[c.id]; })}
                  style={{ marginTop: 14, alignSelf: 'flex-start' }}
                />
              </Cartao>
            );
          })}
        </View>
      ) : null}
    </Tela>
  );
}
