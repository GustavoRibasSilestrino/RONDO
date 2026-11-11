/* O menu de segurança de um conteúdo de outra pessoa (publicação, comentário, story ou o perfil): denunciar, com o motivo, e
   bloquear a pessoa. Depois de denunciar ou bloquear, quem chamou esconde o conteúdo (`aoEsconder`). */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { bloquear, denunciar, MOTIVOS, type MotivoDenuncia, type TipoDenuncia } from '../api/moderacao';
import { useLoja } from '../estado/loja';
import { cores, estilos, FONTE } from '../tema';
import { Folha, useAviso } from './Estrutura';
import { Icone } from './Icone';
import { Botao, T } from './Ui';

export type AlvoDenuncia = { tipo: TipoDenuncia; id: number; pessoa: { id: number; nome: string } };

const ROTULO: Record<TipoDenuncia, string> = { post: 'publicação', comentario: 'comentário', story: 'story', pessoa: 'perfil' };

type Etapa = 'menu' | 'motivo' | 'feito' | 'bloquear';
type Props = {
  alvo: AlvoDenuncia | null;
  aoFechar: () => void;
  aoEsconder?: (o: { bloqueou: boolean }) => void;   // o conteúdo some para quem denunciou ou bloqueou
};

export function MenuDenunciar({ alvo, aoFechar, aoEsconder }: Props) {
  const { atualizarSocial } = useLoja();
  const avisar = useAviso();
  const [etapa, setEtapa] = useState<Etapa>('menu');
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null);
  const [detalhe, setDetalhe] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [denunciou, setDenunciou] = useState(false);

  useEffect(() => { if (alvo) { setEtapa('menu'); setMotivo(null); setDetalhe(''); setDenunciou(false); } }, [alvo]);

  if (!alvo) return null;
  const primeiro = alvo.pessoa.nome.split(' ')[0];
  const rotulo = ROTULO[alvo.tipo];

  const fechar = () => {
    if (enviando) return;
    if (denunciou) aoEsconder?.({ bloqueou: false });
    aoFechar();
  };

  const enviar = async () => {
    if (!motivo) return;
    setEnviando(true);
    try {
      await denunciar({ tipo: alvo.tipo, alvoId: alvo.id, motivo, detalhe: detalhe.trim() || undefined });
      setDenunciou(true);
      setEtapa('feito');
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível enviar a denúncia agora.');
    } finally {
      setEnviando(false);
    }
  };

  const confirmarBloqueio = async () => {
    setEnviando(true);
    try {
      await bloquear(alvo.pessoa.id);
    } catch (e) {
      setEnviando(false);
      avisar(e instanceof Error ? e.message : 'Não foi possível bloquear agora.');
      return;
    }
    setEnviando(false);
    aoEsconder?.({ bloqueou: true });
    aoFechar();
    void atualizarSocial(true);
    avisar(`${primeiro} foi bloqueado(a). Dá para desbloquear em Configurações > Comunidade e segurança.`);
  };

  const titulo = etapa === 'motivo' ? `Denunciar ${rotulo}` : etapa === 'feito' ? 'Denúncia enviada' : etapa === 'bloquear' ? `Bloquear ${primeiro}?` : 'Opções';

  return (
    <Folha aberta aoFechar={fechar} titulo={titulo}>
      {etapa === 'menu' ? (
        <View style={{ gap: 10 }}>
          <Linha icone="alerta" titulo={`Denunciar ${rotulo}`} sub="A equipe do RONDO analisa em até 24 horas" aoPressionar={() => setEtapa('motivo')} />
          <Linha icone="cadeado" titulo={`Bloquear ${primeiro}`} sub="Vocês deixam de ver um ao outro" perigo aoPressionar={() => setEtapa('bloquear')} />
        </View>
      ) : null}

      {etapa === 'motivo' ? (
        <View>
          <T tam={14} cor={cores.texto2} style={{ lineHeight: 20, marginBottom: 12 }}>Por que você está denunciando? {alvo.tipo === 'pessoa' ? primeiro : 'Quem publicou'} não fica sabendo quem denunciou.</T>
          <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
            {MOTIVOS.map((m) => {
              const ativo = motivo === m.id;
              return (
                <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: ativo }} onPress={() => setMotivo(m.id)} style={[st.motivo, ativo && st.motivoAtivo]}>
                  <View style={[st.bolinha, ativo && st.bolinhaAtiva]}>{ativo ? <View style={st.miolo} /> : null}</View>
                  <T tam={14.5} style={{ flex: 1 }}>{m.titulo}</T>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={detalhe} onChangeText={setDetalhe} placeholder="Quer contar mais? (opcional)" placeholderTextColor={cores.placeholder}
            selectionColor={cores.destaque} multiline maxLength={300} accessibilityLabel="Detalhes da denúncia (opcional)" style={st.detalhe}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Botao tipo="discreto" titulo="Voltar" aoPressionar={() => setEtapa('menu')} style={{ flex: 1 }} />
            <Botao titulo="Enviar denúncia" desabilitado={!motivo} carregando={enviando} aoPressionar={enviar} style={{ flex: 1.4 }} />
          </View>
        </View>
      ) : null}

      {etapa === 'feito' ? (
        <View>
          <T tam={14.5} style={{ lineHeight: 21 }}>
            Obrigado por avisar. A equipe do RONDO analisa toda denúncia em até 24 horas e tira do ar o que viola as regras da
            comunidade. Este conteúdo já sumiu para você.
          </T>
          <Linha icone="cadeado" titulo={`Bloquear ${primeiro} também`} sub="Vocês deixam de ver um ao outro" perigo aoPressionar={() => setEtapa('bloquear')} style={{ marginTop: 16 }} />
          <Botao titulo="Pronto" aoPressionar={fechar} style={{ marginTop: 16 }} />
        </View>
      ) : null}

      {etapa === 'bloquear' ? (
        <View>
          <T tam={14.5} style={{ lineHeight: 21 }}>
            Vocês deixam de se seguir, e nenhum dos dois vê mais as publicações, os comentários, os stories e o perfil do outro.
            {` ${primeiro}`} não recebe aviso. Dá para desbloquear quando quiser, em Configurações.
          </T>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Botao tipo="discreto" titulo="Cancelar" desabilitado={enviando} aoPressionar={() => setEtapa(denunciou ? 'feito' : 'menu')} style={{ flex: 1 }} />
            <Botao tipo="perigo" icone="cadeado" titulo="Bloquear" carregando={enviando} aoPressionar={confirmarBloqueio} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    </Folha>
  );
}

function Linha({ icone, titulo, sub, perigo, aoPressionar, style }: { icone: 'alerta' | 'cadeado'; titulo: string; sub: string; perigo?: boolean; aoPressionar: () => void; style?: object }) {
  const cor = perigo ? cores.erro : cores.texto;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={titulo} onPress={aoPressionar} style={({ pressed }) => [st.linha, pressed && { opacity: 0.85 }, style]}>
      <Icone nome={icone} tamanho={20} cor={cor} />
      <View style={{ flex: 1 }}>
        <T tam={15} peso="500" cor={cor}>{titulo}</T>
        <T tam={12.5} cor={cores.texto3} style={{ marginTop: 1 }}>{sub}</T>
      </View>
      <Icone nome="setaDireita" tamanho={16} cor={cores.texto3} />
    </Pressable>
  );
}

const st = estilos(() => StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  motivo: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: cores.linha },
  motivoAtivo: { borderColor: cores.destaque, backgroundColor: cores.cartao2 },
  bolinha: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: cores.texto3, alignItems: 'center', justifyContent: 'center' },
  bolinhaAtiva: { borderColor: cores.destaque },
  miolo: { width: 10, height: 10, borderRadius: 5, backgroundColor: cores.destaque },
  detalhe: { marginTop: 12, minHeight: 72, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: cores.linha2, color: cores.texto, fontSize: 15, fontFamily: FONTE['300'], textAlignVertical: 'top', outlineWidth: 0, ...({ outlineStyle: 'none' } as object) },
}));
