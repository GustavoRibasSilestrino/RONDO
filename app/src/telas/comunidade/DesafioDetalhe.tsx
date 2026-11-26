/* Os detalhes de um desafio, num pop-up no meio da tela (pedido do dono, 2026-11-26: nada de baixo para cima): a capa, quem criou, o período, a meta, a descrição, a contagem (ou o dia
   em que está), quem participa e as ações: entrar, sair, chamar alguém (compartilhar) e, para quem criou, apagar. */
import React, { useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { apagarDesafio, entrarNoDesafio, lerParticipantes, sairDoDesafio } from '../../api/social';
import type { Desafio, Pessoa } from '../../api/social';
import { useAviso } from '../../componentes/Estrutura';
import { Janela } from '../../componentes/Janela';
import { Icone } from '../../componentes/Icone';
import { Barra, Botao, T } from '../../componentes/Ui';
import { diaAtual, duracao, frase, periodo, pessoas } from '../../lib/desafios';
import { cores, estilos } from '../../tema';
import { Avatar } from './Avatar';
import { Capa } from './Capa';
import { Contagem } from './Contagem';

type Props = { desafio: Desafio | null; aoFechar: () => void; aoMudar: (d: Desafio) => void; aoApagar: (id: number) => void };

export function DesafioDetalhe({ desafio: d, aoFechar, aoMudar, aoApagar }: Props) {
  const avisar = useAviso();
  const [gente, setGente] = useState<Pessoa[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);

  const id = d?.id;
  const n = d?.participantes;
  useEffect(() => {
    setConfirmarApagar(false);
    if (!id) { setGente([]); return; }
    let vivo = true;
    lerParticipantes(id).then((p) => { if (vivo) setGente(p.itens); }).catch(() => {});
    return () => { vivo = false; };
  }, [id, n]);

  const agir = async (f: () => Promise<Desafio>, msg: string) => {
    if (ocupado) return;
    setOcupado(true);
    try {
      aoMudar(await f());
      avisar(msg);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível agora.');
    } finally {
      setOcupado(false);
    }
  };

  const apagar = async () => {
    if (!d || ocupado) return;
    setOcupado(true);
    try {
      await apagarDesafio(d.id);
      aoApagar(d.id);
      avisar('Desafio apagado.');
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível apagar agora.');
    } finally {
      setOcupado(false);
    }
  };

  const chamar = async () => {
    if (!d) return;
    try {
      await Share.share({ message: `Entra comigo no desafio "${d.titulo}" no RONDO: ${periodo(d.inicio, d.fim)}.${d.meta ? ` Meta: ${d.meta}.` : ''} Está na aba Comunidade > Desafios.` });
    } catch {
      avisar('Compartilhar não está disponível neste aparelho.');
    }
  };

  return (
    <Janela aberta={!!d} aoFechar={aoFechar} titulo="Desafio">
      {d ? (
        <>
          <Capa cor={d.cor} icone="trofeu" altura={140}>
            <View style={st.selo}><T tam={12} peso="500" cor="#ffffff">{frase(d)}</T></View>
            <View style={st.capaTexto}>
              <T tam={24} peso="300" cor="#ffffff" linhas={3} style={{ letterSpacing: -0.5 }}>{d.titulo}</T>
            </View>
          </Capa>

          <View style={st.linhaInfo}>
            <Icone nome="calendario" tamanho={16} cor={cores.texto3} />
            <T tam={13.5} cor={cores.texto2}>{periodo(d.inicio, d.fim)} · {duracao(d.inicio, d.fim)} dias</T>
          </View>
          {d.dono ? (
            <View style={st.linhaInfo}>
              <Icone nome="perfil" tamanho={16} cor={cores.texto3} />
              <T tam={13.5} cor={cores.texto2}>Criado por {d.proprio ? 'você' : d.dono.arroba ? `@${d.dono.arroba}` : d.dono.nome}</T>
            </View>
          ) : null}

          {d.meta ? (
            <View style={st.meta}>
              <Icone nome="medalha" tamanho={18} cor={cores.destaque2} />
              <View style={{ flex: 1 }}>
                <T tam={11} peso="400" cor={cores.texto3} style={{ letterSpacing: 1.2 }}>META</T>
                <T tam={14.5} style={{ marginTop: 2 }}>{d.meta}</T>
              </View>
            </View>
          ) : null}
          {d.descricao ? <T tam={14} cor={cores.texto2} style={{ marginTop: 14, lineHeight: 21 }}>{d.descricao}</T> : null}

          <View style={{ marginTop: 18 }}>
            {d.situacao === 'em_breve' ? (
              <>
                <T tam={11} peso="400" cor={cores.texto3} style={{ letterSpacing: 1.4, marginBottom: 8 }}>COMEÇA EM</T>
                <Contagem inicio={d.inicio} />
              </>
            ) : d.situacao === 'em_andamento' ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <T tam={14} peso="400">Dia {diaAtual(d)} de {duracao(d.inicio, d.fim)}</T>
                  <T tam={12.5} cor={cores.texto3}>{frase(d)}</T>
                </View>
                <Barra valor={diaAtual(d)} max={duracao(d.inicio, d.fim)} />
              </>
            ) : null}
          </View>

          <T tam={15} peso="400" style={{ marginTop: 22 }}>{pessoas(d.participantes)}</T>
          <View style={st.gente}>
            {gente.slice(0, 8).map((p) => (
              <View key={p.id} style={st.pessoa}>
                <Avatar nome={p.voce ? 'Você' : p.nome} voce={p.voce} foto={p.foto ?? undefined} tamanho={42} />
                <T tam={11.5} cor={cores.texto2} linhas={1} style={{ marginTop: 4, maxWidth: 56 }} centro>{p.voce ? 'Você' : p.nome.split(' ')[0]}</T>
              </View>
            ))}
            {d.participantes > 8 ? (
              <View style={st.pessoa}>
                <View style={st.maisGente}><T tam={13} peso="500" cor={cores.destaque2}>+{d.participantes - 8}</T></View>
              </View>
            ) : null}
          </View>

          <View style={st.acoes}>
            {d.meu ? (
              <Botao icone="compartilhar" titulo="Chamar alguém" aoPressionar={chamar} style={{ flex: 1 }} />
            ) : (
              <Botao icone="mais" titulo="Entrar no desafio" carregando={ocupado} aoPressionar={() => agir(() => entrarNoDesafio(d.id), 'Você está no desafio. Bora!')} style={{ flex: 1 }} />
            )}
            {d.meu && !d.proprio ? (
              <Botao tipo="discreto" titulo="Sair" aoPressionar={() => agir(() => sairDoDesafio(d.id), 'Você saiu do desafio.')} />
            ) : null}
          </View>

          {d.proprio ? (
            confirmarApagar ? (
              <View style={st.apagar}>
                <T tam={13.5} style={{ lineHeight: 20 }}>Apagar o desafio tira ele da Comunidade para todo mundo. Não dá para desfazer.</T>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <Botao tipo="discreto" titulo="Manter" aoPressionar={() => setConfirmarApagar(false)} />
                  <Botao tipo="perigo" icone="lixo" titulo="Apagar" carregando={ocupado} aoPressionar={apagar} />
                </View>
              </View>
            ) : (
              <Botao tipo="perigo" icone="lixo" titulo="Apagar desafio" aoPressionar={() => setConfirmarApagar(true)} style={{ marginTop: 12 }} />
            )
          ) : null}
        </>
      ) : null}
    </Janela>
  );
}

const st = estilos(() => StyleSheet.create({
  selo: { position: 'absolute', left: 12, top: 12, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(5,5,7,0.45)' },
  capaTexto: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  linhaInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 12, borderRadius: 14, backgroundColor: `rgba(${cores.tom},0.1)`, borderWidth: 1, borderColor: `rgba(${cores.tom},0.22)` },
  gente: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  pessoa: { alignItems: 'center', width: 56 },
  maisGente: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: `rgba(${cores.tom},0.14)` },
  acoes: { flexDirection: 'row', gap: 10, marginTop: 22 },
  apagar: { marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,107,129,0.35)', backgroundColor: 'rgba(255,107,129,0.08)' },
}));
