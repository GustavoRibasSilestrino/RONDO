/* O + da Dieta e do Treino. Dieta: criar com a RONDO AI (ainda indisponível, falta ligar a API) ou procurar um nutricionista verificado.
   Treino: criar o próprio treino no app, enviar um arquivo (CSV, TXT ou JSON), usar a RONDO AI (indisponível) ou procurar um educador físico verificado. */
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BotaoMais } from '../componentes/BotaoMais';
import { EditorTreino, type Rascunho } from '../componentes/EditorTreino';
import { Folha, useAviso } from '../componentes/Estrutura';
import { Icone, NomeIcone } from '../componentes/Icone';
import { AvisoPro, SeloPro } from '../componentes/Pro';
import { T } from '../componentes/Ui';
import type { Rotina } from '../dados';
import { useLoja } from '../estado/loja';
import { escolherArquivoDeTreino } from '../lib/arquivoTreino';
import { inferirMusculos } from '../lib/musculos';
import { guardarRotina } from '../lib/rotinas';
import { SITE } from './Login';
import { cores, estilos } from '../tema';
import { BuscaProfissionais } from './BuscaProfissionais';

type Props = { tipo: 'dieta' | 'treino' };

const TEXTO = {
  dieta: { titulo: 'Criar dieta', ia: 'Criar com a RONDO AI', iaSub: 'Uma dieta montada para o seu objetivo.', extra: 'Ajuste automático de macros' as string | undefined, extraSub: 'A IA reajusta a sua dieta conforme a sua evolução.' as string | undefined,profissional: 'Procurar nutricionista', profSub: 'Profissionais verificados, com registro no CRN.', quem: 'nutricionista' as const },
  treino: { titulo: 'Criar treino', ia: 'Criar com a RONDO AI', iaSub: 'Um treino montado para o seu objetivo.', extra: undefined as string | undefined, extraSub: undefined as string | undefined,profissional: 'Procurar educador físico', profSub: 'Profissionais verificados, com registro no CREF.', quem: 'educador' as const },
};

type OpcaoProps = { icone: NomeIcone; titulo: string; sub: string; pro?: boolean; indisponivel?: boolean; aoPressionar: () => void };

function Opcao({ icone, titulo, sub, pro, indisponivel, aoPressionar }: OpcaoProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={titulo} onPress={aoPressionar} style={({ pressed }) => [st.opcao, pressed && { opacity: 0.85 }]}>
      <View style={st.icone}><Icone nome={icone} tamanho={22} cor="#ffffff" /></View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <T tam={15.5} peso="500">{titulo}</T>
          {pro ? <SeloPro /> : null}
          {indisponivel ? <View style={st.selo}><T tam={10.5} peso="500">INDISPONÍVEL</T></View> : null}
        </View>
        <T tam={13} style={{ marginTop: 3, lineHeight: 18 }}>{sub}</T>
      </View>
      <Icone nome="setaDireita" tamanho={18} cor="#ffffff" />
    </Pressable>
  );
}

export function CriarPlano({ tipo }: Props) {
  const t = TEXTO[tipo];
  const [aberta, setAberta] = useState(false);
  const [indisponivel, setIndisponivel] = useState(false);
  const [busca, setBusca] = useState(false);
  const [pro, setPro] = useState(false);   // aviso do plano PRO
  const { commit } = useLoja();
  const avisar = useAviso();
  const [editor, setEditor] = useState<{ inicial: Rascunho | null } | null>(null);   // o editor de treino (só no Treino)
  const [erro, setErro] = useState('');
  const [lendo, setLendo] = useState(false);

  const criarNoApp = () => { setAberta(false); setErro(''); setEditor({ inicial: null }); };
  const enviarArquivo = async () => {
    setErro('');
    setLendo(true);
    const r = await escolherArquivoDeTreino();
    setLendo(false);
    if (!r) return;
    if (!r.ok) { setErro(r.erro); return; }
    setAberta(false);
    setEditor({ inicial: { id: '', nome: r.treino.nome ?? r.nomeDoArquivo, exercicios: r.treino.exercicios, musculos: inferirMusculos(r.treino.exercicios.map((x) => x.nome)) } });
  };
  const salvarTreino = (r: Rotina) => { commit((e) => guardarRotina(e, r)); setEditor(null); avisar('Treino salvo.'); };

  return (
    <>
      <BotaoMais rotulo={t.titulo} aoPressionar={() => setAberta(true)} />

      <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo={t.titulo}>
        <View style={{ gap: 10, paddingBottom: 4 }}>
          {tipo === 'treino' ? (
            <>
              <Opcao icone="lapis" titulo="Criar no app" sub="Dê um nome e adicione os exercícios, com séries, repetições e carga." aoPressionar={criarNoApp} />
              <Opcao icone="upload" titulo={lendo ? 'Lendo o arquivo…' : 'Enviar um arquivo'} sub="CSV, TXT ou JSON com o seu treino. Você confere tudo antes de salvar." aoPressionar={enviarArquivo} />
              {erro ? <View accessibilityLiveRegion="polite" accessibilityRole="alert"><T tam={13} cor={cores.erro} style={{ lineHeight: 19 }}>{erro}</T></View> : null}
            </>
          ) : null}
          <Opcao icone="ia" titulo={t.ia} sub={t.iaSub} pro indisponivel aoPressionar={() => { setAberta(false); setIndisponivel(true); }} />
          {t.extra ? <Opcao icone="estrela" titulo={t.extra} sub={t.extraSub ?? ''} pro aoPressionar={() => { setAberta(false); setPro(true); }} /> : null}
          <Opcao icone="busca" titulo={t.profissional} sub={t.profSub} aoPressionar={() => { setAberta(false); setBusca(true); }} />
        </View>
      </Folha>

      <Folha aberta={indisponivel} aoFechar={() => setIndisponivel(false)} titulo="RONDO AI indisponível">
        <View style={{ alignItems: 'center', gap: 12, paddingBottom: 6 }}>
          <View style={[st.icone, { width: 64, height: 64, borderRadius: 32 }]}><Icone nome="ia" tamanho={30} cor="#ffffff" /></View>
          <T tam={15} centro style={{ lineHeight: 22 }}>A RONDO AI ainda está indisponível. Ainda não adicionamos a API dela ao app. Quando chegar, ela será um recurso do plano PRO.</T>
          <T tam={13} centro style={{ lineHeight: 19 }}>Enquanto isso, você pode procurar um profissional verificado aqui mesmo.</T>
          <Pressable accessibilityRole="button" onPress={() => { setIndisponivel(false); setBusca(true); }} style={st.botaoProf}>
            <T tam={14.5} peso="500">{t.profissional}</T>
          </Pressable>
        </View>
      </Folha>

      <AvisoPro aberto={pro} aoFechar={() => setPro(false)} recurso={t.extra ?? ''} site={SITE} />
      {tipo === 'treino' ? <EditorTreino aberto={!!editor} inicial={editor?.inicial ?? null} aoFechar={() => setEditor(null)} aoSalvar={salvarTreino} /> : null}
      <BuscaProfissionais aberto={busca} aoFechar={() => setBusca(false)} tipo={t.quem} />
    </>
  );
}

const st = estilos(() => StyleSheet.create({
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 64 },
  icone: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  selo: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  botaoProf: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', minHeight: 50, borderRadius: 14, backgroundColor: cores.destaqueForte, marginTop: 6 },
}));
