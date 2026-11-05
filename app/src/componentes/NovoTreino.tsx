/* "Adicionar treino": a pessoa escolhe entre criar no app (adicionando os exercícios) ou enviar um arquivo com o treino dela. */
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { lerTreino, type TreinoLido } from '../lib/importar';
import { cores, estilos } from '../tema';
import { Folha } from './Estrutura';
import { Icone, type NomeIcone } from './Icone';
import { T } from './Ui';

const EXEMPLO = 'Supino reto; 4; 8-10; 70\nCrucifixo; 3; 12; 14\nTríceps corda; 3; 12-15; 25';

function Opcao({ icone, titulo, texto, aoPressionar }: { icone: NomeIcone; titulo: string; texto: string; aoPressionar: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={titulo} onPress={aoPressionar} style={({ pressed }) => [st.opcao, pressed && { opacity: 0.85 }]}>
      <View style={st.icone}><Icone nome={icone} tamanho={22} cor="#ffffff" /></View>
      <View style={{ flex: 1 }}>
        <T tam={16} peso="500">{titulo}</T>
        <T tam={12.5} style={{ marginTop: 2, opacity: 0.8, lineHeight: 18 }}>{texto}</T>
      </View>
      <Icone nome="setaDireita" tamanho={16} cor={cores.texto3} />
    </Pressable>
  );
}

type Props = { aberta: boolean; aoFechar: () => void; aoCriar: () => void; aoArquivo: (treino: TreinoLido, nomeDoArquivo: string) => void };

export function NovoTreino({ aberta, aoFechar, aoCriar, aoArquivo }: Props) {
  const [erro, setErro] = useState('');
  const [lendo, setLendo] = useState(false);

  const escolherArquivo = async () => {
    setErro('');
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0];
      if (/\.(pdf|png|jpe?g|webp|heic|docx?|xlsx?)$/i.test(a.name)) {
        setErro('Ainda não leio PDF, foto, Word ou Excel. Envie um arquivo CSV, TXT ou JSON.');
        return;
      }
      setLendo(true);
      const texto = a.file ? await a.file.text() : await (await fetch(a.uri)).text();
      const lido = lerTreino(texto);
      if (!lido.exercicios.length) {
        setErro('Não achei exercícios nesse arquivo. Veja o formato de exemplo abaixo.');
        return;
      }
      aoArquivo(lido, a.name.replace(/\.[^.]+$/, ''));
    } catch {
      setErro('Não consegui abrir o arquivo. Tente de novo.');
    } finally {
      setLendo(false);
    }
  };

  return (
    <Folha aberta={aberta} aoFechar={aoFechar} titulo="Adicionar treino">
      <View style={{ gap: 10 }}>
        <Opcao icone="lapis" titulo="Criar no app" texto="Dê um nome e adicione os exercícios, com séries, repetições e carga." aoPressionar={aoCriar} />
        <Opcao icone="upload" titulo={lendo ? 'Lendo o arquivo…' : 'Enviar um arquivo'} texto="CSV, TXT ou JSON com o seu treino. Você confere tudo antes de salvar." aoPressionar={escolherArquivo} />
      </View>
      {erro ? <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ marginTop: 12 }}><T tam={13} cor={cores.erro} style={{ lineHeight: 19 }}>{erro}</T></View> : null}
      <View style={st.exemplo}>
        <T tam={12} peso="500" style={{ opacity: 0.8 }}>Formato do arquivo (nome; séries; repetições; carga em kg)</T>
        <T tam={12.5} mono style={{ marginTop: 8, lineHeight: 19 }}>{EXEMPLO}</T>
      </View>
    </Folha>
  );
}

const st = estilos(() => StyleSheet.create({
  opcao: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, borderWidth: 1, borderColor: cores.linha2, backgroundColor: cores.cartao, minHeight: 76 },
  icone: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: cores.destaqueForte },
  exemplo: { marginTop: 16, padding: 14, borderRadius: 18, backgroundColor: cores.cartao2 },
}));
