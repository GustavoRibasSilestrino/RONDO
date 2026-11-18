/* O + do Treino: um menu de vidro só com texto (componentes/MenuMais.tsx): criar o treino no app, um treino para fazer em casa,
   enviar um arquivo (CSV, TXT ou JSON) ou procurar um educador físico verificado. A RONDO AI saiu (pedido do dono, 2026-11-18).
   O + da Dieta mora na própria tela (telas/Dieta.tsx). */
import React, { useState } from 'react';
import { BotaoMais } from '../componentes/BotaoMais';
import { EditorTreino, type Rascunho } from '../componentes/EditorTreino';
import { useAviso } from '../componentes/Estrutura';
import { MenuMais } from '../componentes/MenuMais';
import type { Rotina } from '../dados';
import { useLoja } from '../estado/loja';
import { escolherArquivoDeTreino } from '../lib/arquivoTreino';
import { inferirMusculos } from '../lib/musculos';
import { montarTreinoEmCasa } from '../lib/semAparelho';
import { guardarRotina } from '../lib/rotinas';
import { BuscaProfissionais } from './BuscaProfissionais';

export function CriarPlano() {
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState(false);
  const { commit } = useLoja();
  const avisar = useAviso();
  const [editor, setEditor] = useState<{ inicial: Rascunho | null } | null>(null);

  const criarEmCasa = () => { const t = montarTreinoEmCasa(0); setEditor({ inicial: { id: '', nome: t.nome, exercicios: t.exercicios, musculos: t.musculos } }); };
  const enviarArquivo = async () => {
    const r = await escolherArquivoDeTreino();
    if (!r) return;
    if (!r.ok) { avisar(r.erro); return; }
    setEditor({ inicial: { id: '', nome: r.treino.nome ?? r.nomeDoArquivo, exercicios: r.treino.exercicios, musculos: inferirMusculos(r.treino.exercicios.map((x) => x.nome)) } });
  };
  const salvarTreino = (r: Rotina) => { commit((e) => guardarRotina(e, r)); setEditor(null); avisar('Treino salvo.'); };

  return (
    <>
      <BotaoMais rotulo="Criar treino" aoPressionar={() => setAberta(true)} />
      <MenuMais
        aberto={aberta} aoFechar={() => setAberta(false)} rotulo="Criar treino"
        itens={[
          { rotulo: 'Novo treino', aoPressionar: () => setEditor({ inicial: null }) },
          { rotulo: 'Treino para fazer em casa', aoPressionar: criarEmCasa },
          { rotulo: 'Enviar um arquivo', aoPressionar: () => { void enviarArquivo(); } },
          { rotulo: 'Procurar educador físico', aoPressionar: () => setBusca(true) },
        ]}
      />
      <EditorTreino aberto={!!editor} inicial={editor?.inicial ?? null} aoFechar={() => setEditor(null)} aoSalvar={salvarTreino} />
      <BuscaProfissionais aberto={busca} aoFechar={() => setBusca(false)} tipo="educador" />
    </>
  );
}
