/* Guarda o token de acesso devolvido pela API.
   No celular vai para o armazenamento seguro do sistema (Keychain no iOS, Keystore no Android).
   Na web não existe cofre: usa o armazenamento do navegador, que é menos protegido. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHAVE = 'yy.token';
const nativo = Platform.OS !== 'web';

export async function guardarToken(token: string): Promise<void> {
  try {
    if (nativo) await SecureStore.setItemAsync(CHAVE, token);
    else await AsyncStorage.setItem(CHAVE, token);
  } catch { /* sem armazenamento: a pessoa entra de novo no próximo acesso */ }
}

export async function lerToken(): Promise<string | null> {
  try {
    return nativo ? await SecureStore.getItemAsync(CHAVE) : await AsyncStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export async function esquecerToken(): Promise<void> {
  try {
    if (nativo) await SecureStore.deleteItemAsync(CHAVE);
    else await AsyncStorage.removeItem(CHAVE);
  } catch { /* nada a apagar */ }
}

/* Um identificador aleatório deste aparelho (ou navegador), criado na primeira vez e guardado aqui. Vai junto ao entrar, para o
   servidor avisar por e-mail quando a conta entra por um aparelho que nunca tinha usado. Não identifica a pessoa nem o
   aparelho (é só um número sorteado) e não é segredo: o servidor guarda só um hash dele. */
const CHAVE_APARELHO = 'yy.aparelho';
let aparelho: string | null = null;
export async function idDoAparelho(): Promise<string> {
  if (aparelho) return aparelho;
  try {
    aparelho = await AsyncStorage.getItem(CHAVE_APARELHO);
  } catch { /* sem armazenamento */ }
  if (!aparelho) {
    const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
    const b = new Uint8Array(16);
    if (c?.getRandomValues) c.getRandomValues(b);
    else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    aparelho = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    try { await AsyncStorage.setItem(CHAVE_APARELHO, aparelho); } catch { /* fica só nesta sessão */ }
  }
  return aparelho;
}
