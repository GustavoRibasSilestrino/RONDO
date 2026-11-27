/* A chegada: o que a pessoa vê toda vez que entra no app, logo depois da abertura preta com o nome RONDO. O RONDIN aparece.
   - Na primeira vez que a pessoa entra no dia (e na primeira vez de todas, logo depois de criar a conta) ele já aparece
     fazendo a pergunta do dia, na tela do recado (telas/Recado.tsx). "Agora não" leva direto ao app, e o dia fica marcado:
     aberturas seguintes no mesmo dia não perguntam de novo.
   - Nas outras vezes (já respondeu, ou já disse "agora não" hoje) ele só cumprimenta e deixa a pessoa entrar, sozinho
     depois da fala ou ao toque.
   (O convite para chamá-lo pela voz, "Olá Rondin", saiu junto com a escuta em 2026-11-27, a pedido do dono.) */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLoja } from '../estado/loja';
import { atrasoDaAbertura } from '../lib/abertura';
import { iso } from '../lib/datas';
import { CONVERSA, saudacao } from '../lib/rondinConversa';
import { achaSotaque, sotaquePadrao } from '../lib/rondinVoz';
import { useFalaRondin } from '../lib/useFalaRondin';
import { Recado } from '../telas/Recado';
import { BotaoCanto, CenaRondin } from './CenaRondin';
import { Botao } from './Ui';

const CHAVE_DIA = 'yy.chegada.v1';           // {email, dia}: o último dia em que a pessoa passou pela pergunta

type Props = { aoEntrar: () => void; aoDiario: () => void };
/* `depoisDoApp`: o RONDIN chega com o app já aberto (App.tsx, 5 s depois). Aí ele só aparece se tiver a pergunta do dia para
   fazer: se a pessoa já passou pela pergunta hoje, ele não interrompe só para cumprimentar. */
type PropsChegada = Props & { depoisDoApp?: boolean };

function Cumprimento({ aoEntrar, aoDiario }: Props) {
  const { estado } = useLoja();
  const sotaque = useMemo(() => (estado.perfilFit ? achaSotaque(estado.perfilFit.sotaque) : sotaquePadrao()), [estado.perfilFit]);
  const idioma = sotaque.idioma;
  const ui = CONVERSA[idioma].ui;
  const fala = useFalaRondin(sotaque);
  const entrou = useRef(false);
  const nome = (estado.usuario?.nome ?? '').trim().split(/\s+/)[0] ?? '';

  const entrar = () => { if (entrou.current) return; entrou.current = true; fala.calar(); aoEntrar(); };

  useEffect(() => {
    const id = setTimeout(() => {
      const frase = saudacao(idioma, nome, new Date().getHours());
      /* o nome aparece na legenda, mas a voz não o fala (só as frases gravadas, com a voz do RONDIN) */
      fala.dizer([frase], () => setTimeout(entrar, 1100), undefined, [nome]);   // cumprimentou: segue sozinho
    }, atrasoDaAbertura());
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CenaRondin
      sotaque={sotaque} fala={fala} estadoOrbe={fala.falando && !fala.completa ? 'falando' : 'ouvindo'}
      rotuloOrbe={fala.falando && !fala.completa ? ui.pularFala : ui.repetirFala}
      rotuloVoltar={ui.entrar} aoVoltar={entrar} iconeVoltar="fechar"
      direita={<BotaoCanto icone="calendario" rotulo={ui.diario} aoPressionar={() => { fala.calar(); aoDiario(); }} />}
    >
      <View style={st.acoes}>
        <Botao orbita titulo={ui.entrar} aoPressionar={entrar} />
      </View>
    </CenaRondin>
  );
}

export function Chegada({ aoEntrar, aoDiario, depoisDoApp }: PropsChegada) {
  const { estado } = useLoja();
  const email = estado.usuario?.email ?? '';
  const hoje = iso();
  const [modo, setModo] = useState<'lendo' | 'pergunta' | 'cumprimento'>('lendo');

  useEffect(() => {
    let vivo = true;
    (async () => {
      let passou = false;
      try {
        const bruto = await AsyncStorage.getItem(CHAVE_DIA);
        if (bruto) { const p = JSON.parse(bruto) as { email?: string; dia?: string }; passou = p.email === email && p.dia === hoje; }
      } catch { /* sem registro: é a primeira vez do dia */ }
      if (!vivo) return;
      const respondeu = estado.recados.some((r) => iso(new Date(r.criado)) === hoje);
      if (depoisDoApp && (respondeu || passou)) { aoEntrar(); return; }   // nada a perguntar: não interrompe
      setModo(respondeu || passou ? 'cumprimento' : 'pergunta');
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* a pessoa passou pela pergunta de hoje (respondeu ou disse "agora não"): as próximas aberturas só cumprimentam */
  const passar = (depois: () => void) => () => {
    AsyncStorage.setItem(CHAVE_DIA, JSON.stringify({ email, dia: hoje })).catch(() => {});
    depois();
  };

  return (
    <View style={st.camada}>
      {modo === 'pergunta' ? <Recado chegada atraso={atrasoDaAbertura()} aoSair={passar(aoEntrar)} aoDiario={passar(aoDiario)} /> : null}
      {modo === 'cumprimento' ? <Cumprimento aoEntrar={aoEntrar} aoDiario={aoDiario} /> : null}
    </View>
  );
}

const st = StyleSheet.create({
  camada: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 80, backgroundColor: '#000000' },
  acoes: { marginTop: 14, width: '100%', gap: 10 },
});
