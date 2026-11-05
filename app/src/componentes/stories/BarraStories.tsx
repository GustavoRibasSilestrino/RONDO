/* A faixa de stories no alto do Feed: o seu (com o + para criar) e os de quem você segue, que vêm do servidor. */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { apagarStory } from '../../api/social';
import { useLoja } from '../../estado/loja';
import { haStoryNovo, StoryVista, useStories } from '../../lib/stories';
import { estilos } from '../../tema';
import { Avatar } from '../../telas/comunidade/Avatar';
import { useAviso } from '../Estrutura';
import { T } from '../Ui';
import { AnelStory } from './AnelStory';
import { CriarStory } from './CriarStory';
import { ListaStory, VisorStory } from './VisorStory';

export function BarraStories() {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const { meus, outros, recarregar } = useStories();
  const [criando, setCriando] = useState(false);
  const [visor, setVisor] = useState<{ listas: ListaStory[]; inicio: number } | null>(null);

  /* quem ainda tem story não visto vem antes; dentro de cada grupo, a ordem do servidor (mais recente primeiro) */
  const pessoas = [...outros].sort((a, b) => Number(haStoryNovo(b.itens, estado.storiesVistos)) - Number(haStoryNovo(a.itens, estado.storiesVistos)));
  const listasDosOutros: ListaStory[] = pessoas.map((p) => ({ autor: p.autor, itens: p.itens }));

  const abrirMeus = () => {
    if (meus.length === 0) { setCriando(true); return; }
    setVisor({ listas: [{ autor: 'Você', itens: meus }], inicio: 0 });
  };

  const excluir = async (s: StoryVista) => {
    try {
      await apagarStory(Number(s.id));
      avisar('Story excluído.');
      await recarregar();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível excluir agora.');
      return;
    }
    const restantes = meus.filter((x) => x.id !== s.id);
    setVisor(restantes.length ? { listas: [{ autor: 'Você', itens: restantes }], inicio: 0 } : null);
  };

  return (
    <View style={{ marginHorizontal: -20 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.faixa}>
        <View style={st.item}>
          <AnelStory tamanho={58} estado={meus.length ? 'novo' : 'nenhum'} mais aoMais={() => setCriando(true)} aoPressionar={abrirMeus} rotulo={meus.length ? 'Ver o seu story' : 'Criar um story'}>
            <Avatar nome="Você" voce tamanho={58} />
          </AnelStory>
          <T tam={12} linhas={1} centro style={st.nome}>Seu story</T>
        </View>
        {pessoas.map((p, k) => {
          const novo = haStoryNovo(p.itens, estado.storiesVistos);
          return (
            <View key={p.pessoa.id} style={st.item}>
              <AnelStory tamanho={58} estado={novo ? 'novo' : 'visto'} aoPressionar={() => setVisor({ listas: listasDosOutros, inicio: k })} rotulo={`Ver o story de ${p.autor}`}>
                <Avatar nome={p.autor} tamanho={58} />
              </AnelStory>
              <T tam={12} linhas={1} centro style={st.nome}>{p.autor.split(' ')[0]}</T>
            </View>
          );
        })}
      </ScrollView>

      <CriarStory aberto={criando} aoFechar={() => setCriando(false)} aoPublicar={() => { recarregar().catch(() => {}); }} />
      <VisorStory
        aberto={visor !== null}
        listas={visor?.listas ?? []}
        inicio={visor?.inicio ?? 0}
        aoFechar={() => setVisor(null)}
        aoVer={(s) => { if (!estado.storiesVistos[s.id]) commit((e) => { e.storiesVistos[s.id] = true; }); }}
        aoExcluir={excluir}
      />
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  faixa: { paddingHorizontal: 16, gap: 12, paddingVertical: 4 },
  item: { width: 74, alignItems: 'center' },
  nome: { marginTop: 6, width: 74 },
}));
