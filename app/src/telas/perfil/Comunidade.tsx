/* Configurações > Comunidade e segurança: as regras da comunidade, as pessoas bloqueadas (com desbloquear) e o contato da equipe.
   E, só para o dono do RONDO, a fila de denúncias: ver o que foi denunciado e decidir (tirar do ar ou manter).
   As lojas exigem as duas coisas de apps com conteúdo publicado pelas pessoas. */
import React, { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { CONTATO_COMUNIDADE, decidirDenuncia, desbloquear, LIMITE_AVISOS, lerBloqueados, lerDenuncias, lerSituacao, nomeDoMotivo, SUSPENSOES_ATE_BANIR, type Denuncia, type Situacao } from '../../api/moderacao';
import type { Pessoa } from '../../api/social';
import { useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { cores, estilos } from '../../tema';
import { Avatar } from '../comunidade/Avatar';

const REGRAS = [
  'Respeito: nada de ofensa, assédio, ameaça ou discurso de ódio.',
  'Sem nudez, conteúdo sexual ou violência explícita.',
  'Sem golpe, spam, propaganda enganosa ou conta falsa.',
  'Nada que incentive se machucar, distúrbio alimentar ou uso de substâncias proibidas.',
  'Palavras ofensivas são bloqueadas antes de publicar, e cada tentativa vira um aviso. Conteúdo tirado do ar depois de denúncia também.',
  `Depois de ${LIMITE_AVISOS} avisos, a próxima violação suspende a conta por 7 dias (sem publicar nada). Quem já teve ${SUSPENSOES_ATE_BANIR} suspensões é banido na próxima violação, sem novos avisos.`,
];

export function ComunidadeSeguranca() {
  const avisar = useAviso();
  const { atualizarSocial } = useLoja();
  const [bloqueados, setBloqueados] = useState<Pessoa[] | null>(null);
  const [erro, setErro] = useState('');
  const [situacao, setSituacao] = useState<Situacao | null>(null);
  useEffect(() => { lerSituacao().then(setSituacao).catch(() => {}); }, []);
  const suspensaAte = situacao?.suspenso_ate && new Date(situacao.suspenso_ate).getTime() > Date.now() ? new Date(situacao.suspenso_ate) : null;

  useEffect(() => {
    let vivo = true;
    lerBloqueados().then((p) => vivo && setBloqueados(p.itens)).catch((e) => vivo && setErro(e instanceof Error ? e.message : 'Não foi possível carregar.'));
    return () => { vivo = false; };
  }, []);

  const tirar = async (p: Pessoa) => {
    try {
      await desbloquear(p.id);
      setBloqueados((l) => (l ?? []).filter((x) => x.id !== p.id));
      void atualizarSocial(true);
      avisar(`${p.nome.split(' ')[0]} foi desbloqueado(a).`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível desbloquear agora.');
    }
  };

  return (
    <View style={{ gap: 22 }}>
      {situacao ? (
        <View>
          <T tam={12} cor={cores.texto3} style={st.rotulo}>SUA CONTA</T>
          <View style={[st.pessoa, suspensaAte && { borderColor: 'rgba(255,107,129,0.5)' }]}>
            <View style={{ flex: 1, gap: 4 }}>
              {suspensaAte ? (
                <T tam={14.5} peso="500" cor={cores.erro}>Suspensa até {suspensaAte.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}: você não pode publicar até lá.</T>
              ) : (
                <T tam={14.5} peso="500">{situacao.avisos === 0 && situacao.suspensoes === 0 ? 'Tudo certo: nenhum aviso.' : 'Em dia com as regras, com atenção aos avisos.'}</T>
              )}
              <T tam={13} cor={cores.texto2}>Avisos: {situacao.avisos} de {LIMITE_AVISOS} · Suspensões: {situacao.suspensoes} de {SUSPENSOES_ATE_BANIR}</T>
            </View>
          </View>
        </View>
      ) : null}

      <View>
        <T tam={12} cor={cores.texto3} style={st.rotulo}>REGRAS DA COMUNIDADE</T>
        <View style={{ gap: 8 }}>
          {REGRAS.map((r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={st.ponto} />
              <T tam={14} style={{ flex: 1, lineHeight: 20 }}>{r}</T>
            </View>
          ))}
        </View>
        <T tam={13} cor={cores.texto2} style={{ marginTop: 10, lineHeight: 19 }}>
          Viu algo assim? Toque nos três pontos da publicação, do comentário, do story ou do perfil e escolha Denunciar. A equipe
          analisa toda denúncia em até 24 horas.
        </T>
      </View>

      <View>
        <T tam={12} cor={cores.texto3} style={st.rotulo}>PESSOAS BLOQUEADAS</T>
        {bloqueados === null ? (
          <T tam={14} cor={cores.texto2}>{erro || 'Carregando...'}</T>
        ) : bloqueados.length === 0 ? (
          <T tam={14} cor={cores.texto2} style={{ lineHeight: 20 }}>Você não bloqueou ninguém. Quem você bloqueia não vê você, e você não vê essa pessoa.</T>
        ) : (
          <View style={{ gap: 8 }}>
            {bloqueados.map((p) => (
              <View key={p.id} style={st.pessoa}>
                <Avatar nome={p.nome} tamanho={38} foto={p.foto ?? undefined} />
                <View style={{ flex: 1 }}>
                  <T tam={14.5} peso="500" linhas={1}>{p.nome}</T>
                  {p.arroba ? <T tam={12.5} cor={cores.texto3} linhas={1}>@{p.arroba}</T> : null}
                </View>
                <Botao pequeno tipo="fantasma" titulo="Desbloquear" aoPressionar={() => tirar(p)} />
              </View>
            ))}
          </View>
        )}
      </View>

      <View>
        <T tam={12} cor={cores.texto3} style={st.rotulo}>FALE COM A EQUIPE</T>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${CONTATO_COMUNIDADE}?subject=RONDO%20-%20Comunidade`)} style={st.pessoa}>
          <Icone nome="email" tamanho={20} cor={cores.texto} />
          <View style={{ flex: 1 }}>
            <T tam={14.5} peso="500">{CONTATO_COMUNIDADE}</T>
            <T tam={12.5} cor={cores.texto3}>Denúncias urgentes, dúvidas ou pedidos</T>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const ROTULO_TIPO: Record<Denuncia['tipo'], string> = { post: 'Publicação', comentario: 'Comentário', story: 'Story', pessoa: 'Perfil' };

/* a fila de denúncias, só para o dono */
export function FilaDenuncias() {
  const avisar = useAviso();
  const [aba, setAba] = useState<'pendente' | 'removido' | 'mantido'>('pendente');
  const [itens, setItens] = useState<Denuncia[] | null>(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState<number | null>(null);

  const carregar = useCallback(() => {
    setItens(null); setErro('');
    lerDenuncias(aba).then((r) => setItens(r.itens)).catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar.'));
  }, [aba]);
  useEffect(carregar, [carregar]);

  const decidir = async (d: Denuncia, acao: 'remover' | 'manter') => {
    setOcupado(d.id);
    try {
      await decidirDenuncia(d.id, acao);
      // a decisão vale para todas as denúncias do mesmo conteúdo
      setItens((l) => (l ?? []).filter((x) => !(x.tipo === d.tipo && x.alvo_id === d.alvo_id)));
      avisar(acao === 'remover' ? (d.tipo === 'pessoa' ? 'Conta removida.' : 'Conteúdo tirado do ar.') : 'Denúncia arquivada: o conteúdo continua.');
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível decidir agora.');
    } finally {
      setOcupado(null);
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8 }}>
        {(['pendente', 'removido', 'mantido'] as const).map((a) => (
          <Pressable key={a} accessibilityRole="tab" accessibilityState={{ selected: aba === a }} onPress={() => setAba(a)} style={[st.aba, aba === a && st.abaAtiva]}>
            <T tam={13.5} peso={aba === a ? '500' : '300'}>{a === 'pendente' ? 'Pendentes' : a === 'removido' ? 'Removidas' : 'Mantidas'}</T>
          </Pressable>
        ))}
      </View>
      {itens === null ? (
        <T tam={14} cor={cores.texto2}>{erro || 'Carregando...'}</T>
      ) : itens.length === 0 ? (
        <T tam={14} cor={cores.texto2}>{aba === 'pendente' ? 'Nenhuma denúncia esperando. Tudo em dia.' : 'Nada por aqui.'}</T>
      ) : (
        itens.map((d) => (
          <View key={d.id} style={st.denuncia}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <View style={st.selo}><T tam={12} peso="500">{ROTULO_TIPO[d.tipo]}</T></View>
              <T tam={13.5} peso="500" cor={cores.erro} style={{ flexShrink: 1 }}>{nomeDoMotivo(d.motivo)}</T>
              {d.vezes > 1 ? <T tam={12.5} cor={cores.texto3}>· {d.vezes} denúncias</T> : null}
            </View>
            <T tam={13} cor={cores.texto2} style={{ marginTop: 6 }}>
              De {d.autor ? d.autor.nome : 'conta apagada'}{d.autor?.arroba ? ` (@${d.autor.arroba})` : ''} · denunciado por {d.denunciante?.nome ?? 'alguém'} · {new Date(d.quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </T>
            {d.trecho ? <View style={st.trecho}><T tam={14.5} style={{ lineHeight: 21 }}>{d.trecho}</T></View> : null}
            {d.midia ? <Image source={{ uri: d.midia }} style={st.midia} resizeMode="cover" accessibilityLabel="A foto denunciada" /> : null}
            {d.detalhe ? <T tam={13.5} style={{ marginTop: 8, lineHeight: 19 }}>“{d.detalhe}”</T> : null}
            {d.situacao === 'pendente' ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Botao pequeno tipo="discreto" titulo="Manter" desabilitado={ocupado === d.id} aoPressionar={() => decidir(d, 'manter')} style={{ flex: 1 }} />
                <Botao pequeno tipo="perigo" icone="lixo" titulo={d.tipo === 'pessoa' ? 'Remover a conta' : 'Tirar do ar'} carregando={ocupado === d.id} aoPressionar={() => decidir(d, 'remover')} style={{ flex: 1.3 }} />
              </View>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  rotulo: { letterSpacing: 1.2, marginBottom: 10 },
  ponto: { width: 6, height: 6, borderRadius: 3, backgroundColor: cores.destaque, marginTop: 7 },
  pessoa: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 60 },
  aba: { flex: 1, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: cores.linha2 },
  abaAtiva: { backgroundColor: cores.destaqueForte, borderColor: cores.destaque },
  denuncia: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  selo: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: cores.cartao2 },
  trecho: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderLeftWidth: 3, borderLeftColor: cores.erro },
  midia: { marginTop: 10, width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#000000' },
}));
