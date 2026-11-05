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
