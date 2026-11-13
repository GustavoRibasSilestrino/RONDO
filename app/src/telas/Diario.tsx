/* O diário de recados: o calendário com todos os dias em que a pessoa conversou com o RONDIN e, embaixo, todos os áudios,
   do mais novo para o mais antigo (ou só os do dia que ela tocar no calendário). Cada conversa mostra as perguntas, a onda e o
   botão de ouvir, e pode ser apagada. Também mora aqui o "Seu ano em áudio" e o botão de apagar tudo.
   Os áudios ficam só neste aparelho (lib/audioGuardado.ts). */
import React, { useMemo, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { CalendarioRecados } from '../componentes/CalendarioRecados';
import { Folha, Tela, useAviso } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { OndaRecado } from '../componentes/OndaRecado';
import { OuvirRecado } from '../componentes/OuvirRecado';
import { Botao, Cartao, T, Titulo } from '../componentes/Ui';
import { useLoja } from '../estado/loja';
import { apagarAudio } from '../lib/audioGuardado';
import { dataLonga, diaExtenso, doIso, iso, mmss } from '../lib/datas';
import { agrupar, diasComRecado, porDia, type Conversa } from '../lib/diarioRecados';
import { cores } from '../tema';
import type { Recado as TRecado } from '../tipos';

const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/* ---------- uma conversa: as respostas do dia ---------- */
function CartaoConversa({ c, hoje, aoApagar }: { c: Conversa; hoje: string; aoApagar: () => void }) {
  return (
    <Cartao>
      <View style={{ gap: 14 }}>
        {c.itens.map((r) => {
          const liberado = r.entrega <= hoje;   // recados do formato antigo podiam ficar trancados até uma data
          const faltam = Math.max(0, Math.ceil((doIso(r.entrega).getTime() - doIso(hoje).getTime()) / 86400000));
          return (
            <View key={r.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {liberado ? (
                  <OuvirRecado recado={r} rotulo={r.pergunta} />
                ) : (
                  <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.cartao2 }}>
                    <Icone nome="cadeado" tamanho={18} cor={cores.texto3} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <T tam={14} linhas={3} style={{ lineHeight: 19 }}>{r.pergunta}</T>
                  <T tam={12} cor={cores.texto3} style={{ marginTop: 2 }}>{hora(r.criado)} · {mmss(r.segundos)}{liberado ? '' : ` · chega em ${faltam} ${faltam === 1 ? 'dia' : 'dias'}`}</T>
                </View>
              </View>
              {r.onda?.length ? <View style={{ marginTop: 10 }}><OndaRecado niveis={r.onda} altura={24} cor={liberado ? cores.destaque2 : cores.texto3} /></View> : null}
            </View>
          );
        })}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Apagar esta conversa" onPress={aoApagar} hitSlop={8} style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginTop: 6 }}>
        <Icone nome="lixo" tamanho={16} cor={cores.texto3} />
        <T tam={12.5} cor={cores.texto3}>Apagar</T>
      </Pressable>
    </Cartao>
  );
}

/* ---------- seu ano em áudio ---------- */
function SeuAno({ recados }: { recados: TRecado[] }) {
  const ano = new Date().getFullYear();
  const doAno = recados.filter((r) => new Date(r.criado).getFullYear() === ano);
  if (!doAno.length) return null;
  const segundos = doAno.reduce((a, r) => a + r.segundos, 0);
  const dias = new Set(doAno.map((r) => iso(new Date(r.criado)))).size;
  const meses = new Set(doAno.map((r) => new Date(r.criado).getMonth())).size;
  const contagem = new Map<string, number>();
  doAno.forEach((r) => contagem.set(r.pergunta, (contagem.get(r.pergunta) ?? 0) + 1));
  const [maisRespondida] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0];

  const compartilhar = () => Share.share({
    message: `Meu ${ano} em áudio no RONDO: ${dias} ${dias === 1 ? 'dia' : 'dias'} pensando em voz alta com o RONDIN, ${Math.max(1, Math.round(segundos / 60))} min de voz em ${meses} ${meses === 1 ? 'mês' : 'meses'}. Compita com quem você foi ontem.`,
  }).catch(() => {});

  return (
    <>
      <Titulo>Seu ano em áudio</Titulo>
      <Cartao destaque>
        <T tam={11} mono cor={cores.texto3}>{ano}</T>
        <View style={{ flexDirection: 'row', marginTop: 10, gap: 12 }}>
          {[[String(dias), dias === 1 ? 'dia' : 'dias'], [String(doAno.length), doAno.length === 1 ? 'resposta' : 'respostas'], [mmss(segundos), 'de voz']].map(([n, rotulo]) => (
            <View key={rotulo} style={{ flex: 1 }}>
              <T tam={28} peso="200">{n}</T>
              <T tam={12} cor={cores.texto2}>{rotulo}</T>
            </View>
          ))}
        </View>
        <T tam={12} cor={cores.texto3} style={{ marginTop: 14 }}>A pergunta que você mais respondeu</T>
        <T tam={15} style={{ marginTop: 2, lineHeight: 21 }}>{maisRespondida}</T>
        <Botao pequeno tipo="fantasma" icone="compartilhar" titulo="Compartilhar o card" aoPressionar={compartilhar} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
        <T tam={11} cor={cores.texto3} style={{ marginTop: 8 }}>O card leva só os números, nunca o conteúdo dos áudios.</T>
      </Cartao>
    </>
  );
}

export function Diario({ ir }: { ir: (tela: string) => void }) {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const hoje = iso();
  const conversas = useMemo(() => agrupar(estado.recados), [estado.recados]);
  const dias = useMemo(() => diasComRecado(estado.recados), [estado.recados]);
  const [dia, setDia] = useState<string | null>(null);
  const [apagando, setApagando] = useState<Conversa | 'tudo' | null>(null);

  const doDia = dia ? conversas.filter((c) => c.dia === dia) : [];
  const gravouHoje = dias.has(hoje);

  const apagar = () => {
    if (!apagando) return;
    const alvo = apagando === 'tudo' ? estado.recados : apagando.itens;
    alvo.forEach((r) => { void apagarAudio(r); });
    const ids = new Set(alvo.map((r) => r.id));
    commit((e) => { e.recados = e.recados.filter((r) => !ids.has(r.id)); });
    avisar(apagando === 'tudo' ? 'Todos os recados foram apagados.' : 'Conversa apagada.');
    setApagando(null);
  };

  return (
    <Tela>
      <T tam={15} peso="400" centro>Diário de recados</T>
      <T tam={13} centro cor={cores.texto2} style={{ marginTop: 6, lineHeight: 21 }}>Cada dia em que você respondeu ao RONDIN fica marcado aqui, com os áudios para ouvir quando quiser.</T>

      <Botao
        orbita={!gravouHoje} tipo={gravouHoje ? 'fantasma' : 'primario'} icone="recado"
        titulo={gravouHoje ? (estado.pro ? 'Conversar mais um pouco' : 'Falar com o RONDIN') : 'Responder à pergunta de hoje'}
        aoPressionar={() => ir('recado')} style={{ marginTop: 20 }}
      />

      <Cartao style={{ marginTop: 18 }}>
        <CalendarioRecados dias={dias} selecionado={dia} aoEscolher={setDia} />
      </Cartao>

      {dia ? (
        <>
          <Titulo direita={<Pressable accessibilityRole="button" onPress={() => setDia(null)} hitSlop={8}><T tam={13} cor={cores.destaque2} style={{ textDecorationLine: 'underline' }}>Ver todos</T></Pressable>}>
            {diaExtenso(doIso(dia)).replace(/^./, (c) => c.toUpperCase())}
          </Titulo>
          <View style={{ gap: 12 }}>
            {doDia.map((c) => <CartaoConversa key={c.id} c={c} hoje={hoje} aoApagar={() => setApagando(c)} />)}
          </View>
        </>
      ) : (
        <>
          <Titulo>Todos os áudios{estado.recados.length ? ` (${estado.recados.length})` : ''}</Titulo>
          {conversas.length === 0 ? (
            <T tam={14} cor={cores.texto2} style={{ lineHeight: 21 }}>Nenhum ainda. A pergunta de hoje espera por você: responda ao RONDIN e guarde aqui.</T>
          ) : (
            <View style={{ gap: 18 }}>
              {porDia(conversas).map((g) => (
                <View key={g.dia} style={{ gap: 10 }}>
                  <T tam={13} peso="500" cor={cores.texto2}>{dataLonga(g.dia)}{g.dia === hoje ? ' · hoje' : ''}</T>
                  {g.conversas.map((c) => <CartaoConversa key={c.id} c={c} hoje={hoje} aoApagar={() => setApagando(c)} />)}
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <SeuAno recados={estado.recados} />

      <Titulo>Privacidade</Titulo>
      <T tam={13} cor={cores.texto2} style={{ lineHeight: 20 }}>
        Seu áudio é só seu: os recados ficam neste aparelho, nada é público e você pode apagar tudo quando quiser. O diário não é um serviço de terapia.
      </T>
      {estado.recados.length ? (
        <Botao pequeno tipo="perigo" icone="lixo" titulo="Apagar todos os recados" aoPressionar={() => setApagando('tudo')} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
      ) : null}

      <Folha aberta={apagando !== null} aoFechar={() => setApagando(null)} titulo={apagando === 'tudo' ? 'Apagar todos os recados?' : 'Apagar esta conversa?'}>
        <T tam={14} style={{ lineHeight: 21 }}>
          {apagando === 'tudo'
            ? `${estado.recados.length} ${estado.recados.length === 1 ? 'áudio será apagado' : 'áudios serão apagados'} deste aparelho. Não dá para desfazer.`
            : apagando ? `${apagando.itens.length === 1 ? 'O áudio será apagado' : 'Os áudios serão apagados'} deste aparelho. Não dá para desfazer.` : ''}
        </T>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Botao tipo="perigo" titulo="Apagar" aoPressionar={apagar} style={{ flex: 1 }} />
          <Botao tipo="discreto" titulo="Cancelar" aoPressionar={() => setApagando(null)} />
        </View>
      </Folha>
    </Tela>
  );
}
