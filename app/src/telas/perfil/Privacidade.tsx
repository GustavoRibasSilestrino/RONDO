/* Privacidade e dados, dentro das Configurações: e-mails de novidades (consentimento separado), baixar uma cópia dos
   dados, os documentos legais e o contato. Apagar a conta fica em Conta e segurança. */
import React, { useState } from 'react';
import { Linking, Platform, Pressable, Share, StyleSheet, Switch, View } from 'react-native';
import { CONTATO_PRIVACIDADE, DOCUMENTOS, exportarDados, mudarMarketing, SITE_LEGAL } from '../../api/privacidade';
import { useAviso } from '../../componentes/Estrutura';
import { Icone } from '../../componentes/Icone';
import { Botao, T } from '../../componentes/Ui';
import { useLoja } from '../../estado/loja';
import { cores, estilos } from '../../tema';

/* no navegador, baixa um arquivo .json; no celular, abre o compartilhar com o conteúdo */
async function entregar(json: string) {
  if (Platform.OS === 'web') {
    const g = globalThis as unknown as { document: any; URL: any; Blob: any };
    const url = g.URL.createObjectURL(new g.Blob([json], { type: 'application/json' }));
    const a = g.document.createElement('a');
    a.href = url; a.download = `rondo-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    g.document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => g.URL.revokeObjectURL(url), 2000);
    return;
  }
  await Share.share({ title: 'Meus dados do RONDO', message: json });
}

export function Privacidade() {
  const { estado, commit } = useLoja();
  const avisar = useAviso();
  const [marketing, setMarketing] = useState(!!estado.usuario?.marketing);
  const [salvando, setSalvando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  const trocarMarketing = async (v: boolean) => {
    setMarketing(v); setSalvando(true);
    try {
      const r = await mudarMarketing(v);
      commit((e) => { if (e.usuario) e.usuario.marketing = r.marketing; });
      avisar(v ? 'Você vai receber e-mails de novidades.' : 'Pronto: você não recebe mais e-mails de novidades.');
    } catch (err) {
      setMarketing(!v);
      avisar(err instanceof Error ? err.message : 'Não foi possível salvar agora.');
    } finally {
      setSalvando(false);
    }
  };

  const baixar = async () => {
    setBaixando(true);
    try {
      const dados = await exportarDados();
      await entregar(JSON.stringify(dados, null, 2));
    } catch (err) {
      avisar(err instanceof Error ? err.message : 'Não foi possível gerar a cópia agora.');
    } finally {
      setBaixando(false);
    }
  };

  return (
    <View style={{ gap: 18 }}>
      <View style={st.linha}>
        <View style={{ flex: 1 }}>
          <T tam={15} peso="500">E-mails de novidades</T>
          <T tam={12.5} style={{ marginTop: 2, lineHeight: 18 }}>Opcional. Desligado, você só recebe o que for necessário sobre a sua conta.</T>
        </View>
        <Switch
          value={marketing} onValueChange={trocarMarketing} disabled={salvando}
          accessibilityLabel="Receber e-mails de novidades"
          trackColor={{ true: cores.destaque, false: cores.linha2 }} thumbColor="#ffffff"
        />
      </View>

      <View style={{ gap: 8 }}>
        <T tam={15} peso="500">Seus dados</T>
        <T tam={13} style={{ lineHeight: 19 }}>
          Baixe uma cópia de tudo o que o servidor guarda sobre você: conta, dados do app, publicações, comentários, quem você
          segue e os seus aceites. Os áudios dos recados não entram: eles ficam só neste aparelho.
        </T>
        <Botao tipo="fantasma" icone="enviar" titulo="Baixar meus dados" carregando={baixando} aoPressionar={baixar} />
        <T tam={12.5} style={{ lineHeight: 18 }}>Para apagar a conta e todos os dados, vá em Conta e segurança.</T>
      </View>

      <View style={{ gap: 4 }}>
        <T tam={15} peso="500" style={{ marginBottom: 4 }}>Documentos</T>
        {DOCUMENTOS.map((d) => (
          <Pressable key={d.caminho} accessibilityRole="link" accessibilityLabel={`${d.titulo}, abre no navegador`} onPress={() => Linking.openURL(`${SITE_LEGAL}${d.caminho}`)} style={({ pressed }) => [st.doc, pressed && { opacity: 0.8 }]}>
            <T tam={14}>{d.titulo}</T>
            <Icone nome="setaDireita" tamanho={16} cor="#ffffff" />
          </Pressable>
        ))}
      </View>

      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${CONTATO_PRIVACIDADE}`)} style={{ paddingVertical: 6 }}>
        <T tam={13} style={{ lineHeight: 19 }}>Dúvidas ou pedidos sobre os seus dados: <T tam={13} peso="500">{CONTATO_PRIVACIDADE}</T></T>
      </Pressable>
    </View>
  );
}

const st = estilos(() => StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao },
  doc: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: cores.linha },
}));
