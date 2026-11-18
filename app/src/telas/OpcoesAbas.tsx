/* As opções de cada aba, abertas pelo botão de opções do cabeçalho (pedido do dono, 2026-11-18, inspirado nas telas de
   configurações de outros apps de treino): "Configurações do treino", "Configurações da dieta" (com as metas atuais) e as opções
   da Comunidade. Tudo numa tela cheia de vidro (componentes/PaginaOpcoes.tsx), que fecha deslizando o dedo para a direita. */
import React, { useState } from 'react';
import { AnaliseExecucao } from '../componentes/AnaliseExecucao';
import { CalendarioMes } from '../componentes/CalendarioMes';
import { EditorTreino, type Rascunho } from '../componentes/EditorTreino';
import { useAviso } from '../componentes/Estrutura';
import { GrupoOpcoes, LinhaOpcao, PaginaOpcoes } from '../componentes/PaginaOpcoes';
import { T } from '../componentes/Ui';
import type { Rotina } from '../dados';
import { useLoja } from '../estado/loja';
import { macrosMeta, metaKcal } from '../lib/calc';
import { litros, metaAgua } from '../lib/agua';
import { fmt } from '../lib/datas';
import { guardarRotina } from '../lib/rotinas';
import { montarTreinoEmCasa } from '../lib/semAparelho';
import { cores } from '../tema';
import { BuscaProfissionais } from './BuscaProfissionais';
import { ComunidadeSeguranca } from './perfil/Comunidade';
import { Privacidade } from './perfil/Privacidade';
import { SeusDados } from './perfil/SeusDados';

type Base = { aberto: boolean; aoFechar: () => void };

export function OpcoesTreino({ aberto, aoFechar }: Base) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const [secao, setSecao] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [busca, setBusca] = useState(false);
  const [editor, setEditor] = useState<{ inicial: Rascunho | null } | null>(null);
  const fechar = () => { setSecao(null); aoFechar(); };
  const salvar = (r: Rotina) => { commit((e) => guardarRotina(e, r)); setEditor(null); avisar('Treino salvo.'); };
  const emCasa = () => { const t = montarTreinoEmCasa(0); setEditor({ inicial: { id: '', nome: t.nome, exercicios: t.exercicios, musculos: t.musculos } }); };
  const n = estado.rotinasProprias.length;

  return (
    <PaginaOpcoes aberto={aberto} aoFechar={fechar} titulo="Configurações do treino" secao={secao} aoSairDaSecao={() => setSecao(null)}>
      {secao === 'Constância' ? <CalendarioMes /> : (
        <>
          <GrupoOpcoes titulo="Seus treinos">
            <LinhaOpcao icone="halter" titulo="Treinos salvos" valor={String(n)} />
            <LinhaOpcao icone="lapis" titulo="Novo treino" sub="Dê um nome e adicione os exercícios" aoPressionar={() => setEditor({ inicial: null })} />
            <LinhaOpcao icone="treino" titulo="Treino para fazer em casa" sub="Sem aparelho, já vem pronto" aoPressionar={emCasa} />
          </GrupoOpcoes>
          <GrupoOpcoes titulo="Acompanhar">
            <LinhaOpcao icone="calendario" titulo="Calendário de constância" sub="Os dias em que você treinou" aoPressionar={() => setSecao('Constância')} />
            <LinhaOpcao icone="camera" titulo="Analisar a execução" sub="A câmera confere o movimento" aoPressionar={() => setCamera(true)} />
          </GrupoOpcoes>
          <GrupoOpcoes titulo="Ajuda profissional">
            <LinhaOpcao icone="busca" titulo="Procurar educador físico" sub="Verificados, com registro no CREF" aoPressionar={() => setBusca(true)} />
          </GrupoOpcoes>
        </>
      )}
      <EditorTreino aberto={!!editor} inicial={editor?.inicial ?? null} aoFechar={() => setEditor(null)} aoSalvar={salvar} />
      <AnaliseExecucao aberta={camera} aoFechar={() => setCamera(false)} />
      <BuscaProfissionais aberto={busca} aoFechar={() => setBusca(false)} tipo="educador" />
    </PaginaOpcoes>
  );
}

export function OpcoesDieta({ aberto, aoFechar }: Base) {
  const { estado } = useLoja();
  const [secao, setSecao] = useState<string | null>(null);
  const [busca, setBusca] = useState(false);
  const fechar = () => { setSecao(null); aoFechar(); };
  const kcal = metaKcal(estado.perfil);
  const m = macrosMeta(estado.perfil, kcal);
  const objetivo = estado.perfil.objetivo < 1 ? 'Perder gordura' : estado.perfil.objetivo > 1 ? 'Ganhar massa' : 'Manter o peso';

  return (
    <PaginaOpcoes aberto={aberto} aoFechar={fechar} titulo="Configurações da dieta" secao={secao} aoSairDaSecao={() => setSecao(null)}>
      {secao === 'Seus dados' ? <SeusDados /> : (
        <>
          <GrupoOpcoes titulo="Metas atuais">
            <LinhaOpcao icone="chama" titulo="Calorias" valor={`${fmt(kcal)} kcal`} />
            <LinhaOpcao icone="refeicao" titulo="Proteína" valor={`${m.p} g`} />
            <LinhaOpcao icone="refeicao" titulo="Carboidratos" valor={`${m.c} g`} />
            <LinhaOpcao icone="refeicao" titulo="Gorduras" valor={`${m.g} g`} />
            <LinhaOpcao icone="gota" titulo="Água" sub="35 ml por kg do seu peso" valor={litros(metaAgua(estado.perfil))} />
          </GrupoOpcoes>
          <GrupoOpcoes titulo="Objetivo">
            <LinhaOpcao icone="evolucao" titulo={objetivo} sub="As metas mudam com as suas medidas" aoPressionar={() => setSecao('Seus dados')} />
          </GrupoOpcoes>
          <GrupoOpcoes titulo="Ajuda profissional">
            <LinhaOpcao icone="busca" titulo="Procurar nutricionista" sub="Verificados, com registro no CRN" aoPressionar={() => setBusca(true)} />
          </GrupoOpcoes>
          <T tam={11.5} cor={cores.texto3} style={{ lineHeight: 17, paddingHorizontal: 4 }}>
            Meta calculada por Mifflin-St Jeor, com o seu peso, altura, idade, atividade e objetivo. Não substitui avaliação profissional.
          </T>
        </>
      )}
      <BuscaProfissionais aberto={busca} aoFechar={() => setBusca(false)} tipo="nutricionista" />
    </PaginaOpcoes>
  );
}

export function OpcoesComunidade({ aberto, aoFechar, aoNotificacoes }: Base & { aoNotificacoes: () => void }) {
  const [secao, setSecao] = useState<string | null>(null);
  const fechar = () => { setSecao(null); aoFechar(); };
  return (
    <PaginaOpcoes aberto={aberto} aoFechar={fechar} titulo="Opções da comunidade" secao={secao} aoSairDaSecao={() => setSecao(null)}>
      {secao === 'Comunidade e segurança' ? <ComunidadeSeguranca /> : secao === 'Privacidade e dados' ? <Privacidade /> : (
        <>
          <GrupoOpcoes titulo="Você">
            <LinhaOpcao icone="sino" titulo="Notificações" sub="Curtidas, comentários e clubes" aoPressionar={() => { fechar(); aoNotificacoes(); }} />
          </GrupoOpcoes>
          <GrupoOpcoes titulo="Segurança">
            <LinhaOpcao icone="alerta" titulo="Comunidade e segurança" sub="Regras, pessoas bloqueadas e contato" aoPressionar={() => setSecao('Comunidade e segurança')} />
            <LinhaOpcao icone="olho" titulo="Privacidade e dados" sub="O que fica visível e os seus dados" aoPressionar={() => setSecao('Privacidade e dados')} />
          </GrupoOpcoes>
        </>
      )}
    </PaginaOpcoes>
  );
}
