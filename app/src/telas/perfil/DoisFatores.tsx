/* Verificação em duas etapas, em Configurações > Conta e segurança. Com ela ligada, entrar com e-mail e senha pede também o
   código de 6 números de um aplicativo autenticador (Google Authenticator, Authy, Microsoft Authenticator, o do iPhone...).
   Entrar com o Google ou a Apple não pede (a conta Google ou Apple protege essa entrada).

   Ligar: a senha → o QR code (ou a chave para digitar; no celular, um botão abre o aplicativo direto) → o primeiro código →
   os 8 códigos de reserva, mostrados uma vez só. Ligada: trocar os códigos de reserva ou desligar, com a senha e um código. */
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { ativar2f, desativar2f, iniciar2f, novasReservas2f, situacao2f, type Situacao2f } from '../../api/seguranca';
import { CampoFlutuante } from '../../componentes/CampoFlutuante';
import { CodigoQR } from '../../componentes/CodigoQR';
import { Folha, useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, T } from '../../componentes/Ui';
import { cores, estilos } from '../../tema';

type Etapa = 'senha' | 'qr' | 'reservas' | 'ligada' | 'desligar' | 'trocar';

const msg = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

export function DoisFatores({ Linha }: { Linha: React.ComponentType<{ icone: 'verificado'; titulo: string; sub: string; direita?: React.ReactNode; aoPressionar?: () => void }> }) {
  const avisar = useAviso();
  const [sit, setSit] = useState<Situacao2f | null>(null);
  const [aberta, setAberta] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>('senha');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [chave, setChave] = useState<{ segredo: string; endereco: string } | null>(null);
  const [reservas, setReservas] = useState<string[]>([]);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(() => { situacao2f().then(setSit).catch(() => undefined); }, []);
  useEffect(carregar, [carregar]);

  const abrir = () => {
    setSenha(''); setCodigo(''); setErro(''); setChave(null); setReservas([]);
    setEtapa(sit?.ativo ? 'ligada' : 'senha');
    setAberta(true);
  };
  const fechar = () => {
    if (etapa === 'reservas') carregar();
    setAberta(false);
  };
  const tentar = async (f: () => Promise<void>, padrao: string) => {
    setErro(''); setEnviando(true);
    try { await f(); } catch (e) { setErro(msg(e, padrao)); } finally { setEnviando(false); }
  };

  const comecar = () => tentar(async () => {
    if (!senha) { setErro('Digite a sua senha.'); return; }
    setChave(await iniciar2f(senha));
    setSenha(''); setCodigo(''); setEtapa('qr');
  }, 'Não foi possível começar agora. Tente de novo.');

  const ligar = () => tentar(async () => {
    if (codigo.replace(/\D/g, '').length !== 6) { setErro('Digite os 6 números que aparecem no aplicativo.'); return; }
    const r = await ativar2f(codigo);
    setReservas(r.codigos_reserva); setChave(null); setCodigo(''); setEtapa('reservas');
    setSit({ ativo: true, reservas_restantes: r.codigos_reserva.length });
  }, 'Não foi possível ligar agora. Tente de novo.');

  const desligar = () => tentar(async () => {
    if (!senha || codigo.trim().length < 6) { setErro('Digite a senha e um código do aplicativo (ou de reserva).'); return; }
    setSit(await desativar2f(senha, codigo.trim()));
    setAberta(false);
    avisar('Verificação em duas etapas desligada.');
  }, 'Não foi possível desligar agora. Tente de novo.');

  const trocar = () => tentar(async () => {
    if (!senha || codigo.trim().length < 6) { setErro('Digite a senha e um código do aplicativo (ou de reserva).'); return; }
    const r = await novasReservas2f(senha, codigo.trim());
    setReservas(r.codigos_reserva); setSenha(''); setCodigo(''); setEtapa('reservas');
  }, 'Não foi possível gerar os códigos agora. Tente de novo.');

  const guardarReservas = async () => {
    const texto = `Códigos de reserva do RONDO (cada um vale uma vez):\n${reservas.join('\n')}`;
    try {
      const nav = (globalThis as { navigator?: { clipboard?: { writeText?: (t: string) => Promise<void> } } }).navigator;
      if (Platform.OS === 'web' && nav?.clipboard?.writeText) { await nav.clipboard.writeText(texto); avisar('Códigos copiados.'); return; }
      await Share.share({ message: texto });
    } catch { /* a pessoa fechou ou o aparelho não deixou: os códigos continuam na tela */ }
  };

  const campoSenha = (
    <CampoFlutuante rotulo="Sua senha" icone="cadeado" value={senha} onChangeText={(v) => { setSenha(v); setErro(''); }} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" returnKeyType="next" />
  );
  const campoCodigo = (aoEnviar: () => void, rotulo = 'Código do aplicativo ou de reserva') => (
    <CampoFlutuante rotulo={rotulo} icone="verificado" value={codigo} onChangeText={(v) => { setCodigo(v.slice(0, 12)); setErro(''); }} autoCapitalize="none" autoCorrect={false} autoComplete="one-time-code" textContentType="oneTimeCode" returnKeyType="done" onSubmitEditing={aoEnviar} />
  );
  const aviso = erro ? (
    <View style={st.aviso} accessibilityLiveRegion="polite" accessibilityRole="alert"><Icone nome="alerta" tamanho={16} cor={cores.erro} /><T tam={13} cor={cores.erro} style={{ flex: 1, lineHeight: 18 }}>{erro}</T></View>
  ) : null;

  const ligada = !!sit?.ativo;
  const titulo = etapa === 'reservas' ? 'Códigos de reserva' : etapa === 'desligar' ? 'Desligar a verificação' : etapa === 'trocar' ? 'Novos códigos de reserva' : 'Verificação em duas etapas';

  return (
    <>
      <Linha
        icone="verificado"
        titulo="Verificação em duas etapas"
        sub={ligada ? `Ligada · ${sit?.reservas_restantes ?? 0} códigos de reserva` : 'Um código extra para entrar com a senha'}
        direita={ligada ? <View style={st.selo}><T tam={10.5} peso="500" style={{ letterSpacing: 0.6 }}>LIGADA</T></View> : undefined}
        aoPressionar={abrir}
      />
      <Folha aberta={aberta} aoFechar={fechar} titulo={titulo}>
        {etapa === 'senha' ? (
          <View style={st.bloco}>
            <T tam={14} cor={cores.texto2} style={st.texto}>
              Com ela ligada, entrar com e-mail e senha pede também um código de 6 números que muda a cada 30 segundos, mostrado por
              um aplicativo autenticador no seu celular. Assim, mesmo quem descobrir a sua senha não entra.
            </T>
            <T tam={13} cor={cores.texto3} style={st.texto}>
              Você vai precisar de um aplicativo autenticador, como Google Authenticator, Microsoft Authenticator ou Authy (ou as senhas
              do iPhone). Entrar com o Google ou a Apple não pede o código.
            </T>
            {campoSenha}
            {aviso}
            <Botao titulo="Continuar" carregando={enviando} aoPressionar={comecar} />
          </View>
        ) : null}

        {etapa === 'qr' && chave ? (
          <View style={st.bloco}>
            <T tam={14} cor={cores.texto2} style={st.texto}>1. No aplicativo autenticador, adicione uma conta e leia o QR code.</T>
            <View style={{ alignItems: 'center' }}><CodigoQR texto={chave.endereco} tamanho={196} rotulo="QR code para o aplicativo autenticador" /></View>
            {Platform.OS !== 'web' ? (
              <Botao tipo="fantasma" pequeno titulo="Abrir no aplicativo autenticador" aoPressionar={() => { Linking.openURL(chave.endereco).catch(() => setErro('Nenhum aplicativo autenticador abriu. Leia o QR code ou digite a chave.')); }} />
            ) : null}
            <T tam={13} cor={cores.texto3} style={st.texto}>Não dá para ler? Digite esta chave no aplicativo (tipo: baseada em tempo):</T>
            <View style={st.chave}><T tam={15} peso="500" selecionavel style={{ letterSpacing: 1.5, textAlign: 'center' }}>{chave.segredo.replace(/(.{4})/g, '$1 ').trim()}</T></View>
            <T tam={14} cor={cores.texto2} style={st.texto}>2. Digite o código de 6 números que o aplicativo mostra:</T>
            {campoCodigo(ligar, 'Código de 6 números')}
            {aviso}
            <Botao titulo="Ligar a verificação" carregando={enviando} aoPressionar={ligar} />
          </View>
        ) : null}

        {etapa === 'reservas' ? (
          <View style={st.bloco}>
            <T tam={14} cor={cores.texto2} style={st.texto}>
              Guarde estes códigos num lugar seguro (no gerenciador de senhas ou anotados). Se você perder o celular, cada um deles
              entra uma vez no lugar do código do aplicativo. Eles não aparecem de novo.
            </T>
            <View style={st.grade}>
              {reservas.map((c) => (
                <View key={c} style={st.reserva}><T tam={15} peso="500" selecionavel style={{ letterSpacing: 1 }}>{c}</T></View>
              ))}
            </View>
            <Botao tipo="fantasma" pequeno icone="compartilhar" titulo={Platform.OS === 'web' ? 'Copiar os códigos' : 'Salvar ou compartilhar'} aoPressionar={() => void guardarReservas()} />
            <Botao titulo="Já guardei" aoPressionar={fechar} />
          </View>
        ) : null}

        {etapa === 'ligada' ? (
          <View style={st.bloco}>
            <View style={st.status}>
              <Icone nome="verificado" tamanho={22} cor={cores.bom} />
              <T tam={14} style={{ flex: 1, lineHeight: 20 }}>Ligada. Para entrar com e-mail e senha, a conta pede o código do aplicativo autenticador.</T>
            </View>
            <T tam={13} cor={cores.texto3} style={st.texto}>Restam {sit?.reservas_restantes ?? 0} códigos de reserva.</T>
            <Botao tipo="fantasma" titulo="Gerar novos códigos de reserva" aoPressionar={() => { setSenha(''); setCodigo(''); setErro(''); setEtapa('trocar'); }} />
            <Botao tipo="perigo" titulo="Desligar a verificação" aoPressionar={() => { setSenha(''); setCodigo(''); setErro(''); setEtapa('desligar'); }} />
          </View>
        ) : null}

        {etapa === 'desligar' || etapa === 'trocar' ? (
          <View style={st.bloco}>
            <T tam={14} cor={cores.texto2} style={st.texto}>
              {etapa === 'desligar'
                ? 'Sem a verificação, quem souber a sua senha consegue entrar. Para confirmar, digite a senha e um código do aplicativo (ou de reserva).'
                : 'Os códigos de reserva antigos deixam de valer. Para confirmar, digite a senha e um código do aplicativo (ou de reserva).'}
            </T>
            {campoSenha}
            {campoCodigo(etapa === 'desligar' ? desligar : trocar)}
            {aviso}
            <Botao tipo={etapa === 'desligar' ? 'perigo' : 'primario'} titulo={etapa === 'desligar' ? 'Desligar' : 'Gerar códigos'} carregando={enviando} aoPressionar={etapa === 'desligar' ? desligar : trocar} />
            <Pressable accessibilityRole="button" onPress={() => { setErro(''); setEtapa('ligada'); }} hitSlop={8} style={{ alignSelf: 'center', padding: 6 }}>
              <T tam={14} cor={cores.texto2}>Voltar</T>
            </Pressable>
          </View>
        ) : null}
      </Folha>
    </>
  );
}

const st = estilos(() => StyleSheet.create({
  bloco: { gap: 14 },
  texto: { lineHeight: 20 },
  selo: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: cores.linha2 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chave: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao2 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  reserva: { width: '46%', alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: cores.cartao2 },
}));
