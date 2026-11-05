/* A faixa de stories no alto do Feed: o seu (com o + para criar) e os de quem você acompanha. */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLoja } from '../../estado/loja';
import { removerMidia } from '../../lib/midia';
import { meusStories, StoryVista } from '../../lib/stories';
import { cores, estilos } from '../../tema';
import { Avatar } from '../../telas/comunidade/Avatar';
import { useAviso } from '../Estrutura';
import { T } from '../Ui';
import { AnelStory } from './AnelStory';
import { CriarStory } from './CriarStory';
import { ListaStory, VisorStory } from './VisorStory';

export function BarraStories() {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const [criando, setCriando] = useState(false);
  const [visor, setVisor] = useState<{ listas: ListaStory[]; inicio: number } | null>(null);

  const meus = meusStories(estado);

  const abrirMeus = () => {
    if (meus.length === 0) { setCriando(true); return; }
    setVisor({ listas: [{ autor: 'Você', itens: meus }], inicio: 0 });
  };

  const excluir = (s: StoryVista) => {
    const original = estado.stories.find((x) => x.id === s.id);
    commit((e) => { e.stories = e.stories.filter((x) => x.id !== s.id); });
    if (original?.midia) removerMidia([original.midia.id]);
    avisar('Story excluído.');
    // a lista do visor é recalculada a cada toque; sem stories, ele fecha
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
      </ScrollView>

      <CriarStory aberto={criando} aoFechar={() => setCriando(false)} />
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
