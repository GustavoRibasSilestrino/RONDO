/* Escolher e ler um arquivo de treino (CSV, TXT ou JSON). Devolve `null` se a pessoa cancelar. */
import * as DocumentPicker from 'expo-document-picker';
import { lerTreino, type TreinoLido } from './importar';

export type ResultadoArquivo = { ok: true; treino: TreinoLido; nomeDoArquivo: string } | { ok: false; erro: string };

export async function escolherArquivoDeTreino(): Promise<ResultadoArquivo | null> {
  try {
    const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (r.canceled || !r.assets?.[0]) return null;
    const a = r.assets[0];
    if (/\.(pdf|png|jpe?g|webp|heic|docx?|xlsx?)$/i.test(a.name)) {
      return { ok: false, erro: 'Ainda não leio PDF, foto, Word ou Excel. Envie um arquivo CSV, TXT ou JSON.' };
    }
    const texto = a.file ? await a.file.text() : await (await fetch(a.uri)).text();
    const treino = lerTreino(texto);
    if (!treino.exercicios.length) return { ok: false, erro: 'Não achei exercícios nesse arquivo. Use o formato: nome; séries; repetições; carga (ex.: Supino reto; 4; 8-10; 70).' };
    return { ok: true, treino, nomeDoArquivo: a.name.replace(/\.[^.]+$/, '') };
  } catch {
    return { ok: false, erro: 'Não consegui abrir o arquivo. Tente de novo.' };
  }
}
