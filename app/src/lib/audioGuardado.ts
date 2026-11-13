/* Onde os áudios dos recados ficam guardados, para ainda existirem amanhã.
   No celular, a gravação nasce na pasta de cache (que o sistema pode esvaziar): ao guardar, o arquivo é copiado para a pasta de
   documentos do app. No navegador a gravação é um endereço "blob:" que morre quando a página recarrega: ao guardar, o áudio
   vai para o IndexedDB do navegador (neste aparelho, só seu), e o diário pega de lá. O áudio nunca sai do aparelho. */
import { File, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Recado } from '../tipos';

const NA_WEB = Platform.OS === 'web';
const BANCO = 'rondo-recados';
const LOJA = 'audios';

/* endereços "blob:" criados nesta visita: ainda tocam sem ir ao IndexedDB */
const vivos = new Set<string>();
export const marcarVivo = (uri: string): void => { vivos.add(uri); };

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    if (typeof indexedDB === 'undefined') { erro(new Error('sem IndexedDB')); return; }
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => { pedido.result.createObjectStore(LOJA); };
    pedido.onsuccess = () => ok(pedido.result);
    pedido.onerror = () => erro(pedido.error ?? new Error('IndexedDB falhou'));
  });
}

async function operar<T>(modo: IDBTransactionMode, fazer: (loja: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const banco = await abrir();
  try {
    return await new Promise<T>((ok, erro) => {
      const pedido = fazer(banco.transaction(LOJA, modo).objectStore(LOJA));
      pedido.onsuccess = () => ok(pedido.result);
      pedido.onerror = () => erro(pedido.error ?? new Error('IndexedDB falhou'));
    });
  } finally {
    banco.close();
  }
}

/* guarda o áudio de um recado de forma durável e devolve o endereço que vale daqui em diante */
export async function guardarAudio(id: string, uri: string): Promise<string> {
  try {
    if (NA_WEB) {
      const blob = await (await fetch(uri)).blob();
      await operar('readwrite', (l) => l.put(blob, id));
      return uri;
    }
    if (uri.startsWith('file:')) {
      const extensao = /\.(\w{2,4})$/.exec(uri)?.[1] ?? 'm4a';
      const destino = new File(Paths.document, `recado-${id}.${extensao}`);
      if (destino.exists) destino.delete();
      new File(uri).copySync(destino);
      return destino.uri;
    }
  } catch { /* não deu para guardar à parte: o recado fica com o arquivo original */ }
  return uri;
}

const urls = new Map<string, string>();   // id -> endereço "blob:" criado a partir do IndexedDB
async function lerAudio(id: string): Promise<string | null> {
  const feito = urls.get(id);
  if (feito) return feito;
  try {
    const blob = await operar<Blob | undefined>('readonly', (l) => l.get(id));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urls.set(id, url);
    return url;
  } catch {
    return null;
  }
}

/* o endereço para tocar um recado agora: o do celular, o "blob:" desta visita, ou o que está no IndexedDB. null enquanto procura
   ou quando o áudio se perdeu (ex.: o navegador limpou os dados do site). `direto` serve a um rascunho, ainda sem recado. */
export function useUriDoRecado(recado?: Pick<Recado, 'id' | 'uri'>, direto?: string): string | null {
  const alvo = direto ?? recado?.uri ?? '';
  const id = recado?.id ?? '';
  const [uri, setUri] = useState<string | null>(!NA_WEB || vivos.has(alvo) ? alvo : urls.get(id) ?? null);
  useEffect(() => {
    let vivo = true;
    if (!NA_WEB || vivos.has(alvo)) { setUri(alvo || null); return undefined; }
    if (!id) { setUri(null); return undefined; }
    void lerAudio(id).then((u) => { if (vivo) setUri(u); });
    return () => { vivo = false; };
  }, [alvo, id]);
  return uri;
}

/* apaga o áudio de um recado do aparelho */
export async function apagarAudio(r: Pick<Recado, 'id' | 'uri'>): Promise<void> {
  try {
    if (NA_WEB) {
      await operar('readwrite', (l) => l.delete(r.id));
      const url = urls.get(r.id);
      if (url) { URL.revokeObjectURL(url); urls.delete(r.id); }
    } else if (r.uri.startsWith('file:')) {
      new File(r.uri).delete();
    }
  } catch { /* já não existia */ }
}
