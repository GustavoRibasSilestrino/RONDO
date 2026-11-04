/* Fotos e vídeos da comunidade.
   O estado do app guarda só a referência (id, tipo e medidas); o endereço do arquivo fica aqui, por id, no aparelho,
   para o estado não engordar a cada foto. No celular o arquivo é copiado para a pasta do app. No navegador (modo
   demonstração) a foto é reduzida e guardada como data URI, e vídeos muito grandes são recusados. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Midia } from '../tipos';

export const MAX_MIDIAS = 4;

const CHAVE = 'yy.midia.';
const LIMITE_VIDEO_WEB = 3_000_000;   // caracteres do data URI: acima disso o navegador não guardaria
const uris = new Map<string, string>();

const novoId = (): string => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* ---------- navegador: reduz a foto antes de guardar ---------- */
function reduzirNoNavegador(uri: string, maxLado = 1080, qualidade = 0.72): Promise<{ uri: string; largura: number; altura: number }> {
  return new Promise((resolve) => {
    const g = globalThis as unknown as { document?: { createElement: (t: string) => any }; Image?: new () => any };
    if (!g.document || !g.Image) { resolve({ uri, largura: 0, altura: 0 }); return; }
    const img = new g.Image();
    img.onload = () => {
      const k = Math.min(1, maxLado / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * k));
      const h = Math.max(1, Math.round(img.height * k));
      const tela = g.document!.createElement('canvas');
      tela.width = w;
      tela.height = h;
      tela.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve({ uri: tela.toDataURL('image/jpeg', qualidade), largura: w, altura: h });
    };
    img.onerror = () => resolve({ uri, largura: 0, altura: 0 });
    img.src = uri;
  });
}

/* ---------- celular: copia o arquivo para a pasta do app, que não é limpa como o cache ---------- */
async function copiarParaOApp(uri: string, id: string, ext: string): Promise<string> {
  try {
    const pasta = new Directory(Paths.document, 'midia');
    pasta.create({ idempotent: true, intermediates: true });
    const destino = new File(pasta, `${id}.${ext}`);
    await new File(uri).copy(destino);
    return destino.uri;
  } catch {
    return uri;   // se não deu para copiar, fica com o endereço original
  }
}

const extensao = (a: ImagePicker.ImagePickerAsset, video: boolean): string => {
  const doNome = a.fileName?.split('.').pop();
  if (doNome && doNome.length <= 5) return doNome.toLowerCase();
  const doTipo = a.mimeType?.split('/').pop();
  return doTipo && doTipo.length <= 5 ? doTipo : video ? 'mp4' : 'jpg';
};

async function guardar(a: ImagePicker.ImagePickerAsset): Promise<Midia> {
  const video = a.type === 'video' || (a.mimeType ?? '').startsWith('video');
  const id = novoId();
  let uri = a.uri;
  let largura = a.width || 0;
  let altura = a.height || 0;

  if (Platform.OS === 'web') {
    if (video) {
      if (uri.startsWith('data:') && uri.length > LIMITE_VIDEO_WEB) throw new Error('No navegador, vídeos grandes não cabem no modo demonstração. Escolha um vídeo menor.');
    } else {
      const r = await reduzirNoNavegador(uri);
      uri = r.uri;
      if (r.largura) { largura = r.largura; altura = r.altura; }
    }
  } else {
    uri = await copiarParaOApp(uri, id, extensao(a, video));
  }

  uris.set(id, uri);
  AsyncStorage.setItem(CHAVE + id, uri).catch(() => {});   // sem espaço no navegador: a mídia vale só até recarregar
  return { id, tipo: video ? 'video' : 'imagem', largura, altura, duracao: video && a.duration ? Math.max(1, Math.round(a.duration / 1000)) : undefined };
}

/* abre a galeria (ou a câmera) e devolve as referências já guardadas; lista vazia se a pessoa cancelar */
export async function escolherMidia(origem: 'galeria' | 'camera', limite: number): Promise<Midia[]> {
  if (limite <= 0) return [];
  let resultado: ImagePicker.ImagePickerResult;
  if (origem === 'camera') {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissao.granted) throw new Error('Permita o uso da câmera nas configurações do aparelho para tirar fotos.');
    resultado = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 0.7, videoMaxDuration: 60 });
  } else {
    resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: limite > 1,
      selectionLimit: limite,
      quality: 0.7,
      videoMaxDuration: 60,
    });
  }
  if (resultado.canceled) return [];
  const saida: Midia[] = [];
  for (const a of resultado.assets.slice(0, limite)) saida.push(await guardar(a));
  return saida;
}

/* apaga o arquivo e a referência (ao apagar uma publicação ou descartar um rascunho) */
export function removerMidia(ids: string[]): void {
  for (const id of ids) {
    const uri = uris.get(id);
    uris.delete(id);
    AsyncStorage.removeItem(CHAVE + id).catch(() => {});
    if (uri && Platform.OS !== 'web' && uri.startsWith('file:')) {
      try { new File(uri).delete(); } catch { /* já não existia */ }
    }
  }
}

/* endereço do arquivo de uma mídia, carregado do aparelho quando precisa */
export function useUriMidia(id: string): string | null {
  const [uri, setUri] = useState<string | null>(uris.get(id) ?? null);
  useEffect(() => {
    const emMemoria = uris.get(id);
    if (emMemoria) { setUri(emMemoria); return undefined; }
    let vivo = true;
    AsyncStorage.getItem(CHAVE + id)
      .then((v) => { if (v) uris.set(id, v); if (vivo) setUri(v); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [id]);
  return uri;
}
