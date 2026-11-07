/* Os provedores de login, só no navegador por enquanto: o Google (botão oficial do Google Identity Services) e a Apple (Sign in with Apple JS).
   Cada botão só aparece se o ID de cliente estiver nas variáveis de ambiente do app (EXPO_PUBLIC_GOOGLE_CLIENT_ID e EXPO_PUBLIC_APPLE_CLIENT_ID),
   que vêm das contas de desenvolvedor da Google e da Apple. No celular o login social entra com o aplicativo instalado das lojas (ver docs/login-social.md). */
import { Platform } from 'react-native';

declare const process: { env: Record<string, string | undefined> };

export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
export const APPLE_CLIENT_ID = process.env.EXPO_PUBLIC_APPLE_CLIENT_ID ?? '';
const web = Platform.OS === 'web';
export const googleDisponivel = web && !!GOOGLE_CLIENT_ID;
export const appleDisponivel = web && !!APPLE_CLIENT_ID;

const scripts = new Map<string, Promise<void>>();
function carregar(src: string): Promise<void> {
  let p = scripts.get(src);
  if (!p) {
    p = new Promise<void>((ok, falha) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = () => ok(); s.onerror = () => { scripts.delete(src); falha(new Error('script')); };
      document.head.appendChild(s);
    });
    scripts.set(src, p);
  }
  return p;
}

/* o botão do Google dentro do elemento: quando a pessoa escolhe a conta, `aoToken` recebe o id_token */
export async function desenharBotaoGoogle(alvo: HTMLElement, largura: number, aoToken: (idToken: string) => void): Promise<void> {
  await carregar('https://accounts.google.com/gsi/client');
  const g = (window as unknown as { google?: { accounts: { id: { initialize: (c: object) => void; renderButton: (el: HTMLElement, o: object) => void } } } }).google;
  if (!g) throw new Error('google');
  g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r: { credential?: string }) => { if (r.credential) aoToken(r.credential); }, ux_mode: 'popup' });
  alvo.innerHTML = '';
  g.accounts.id.renderButton(alvo, { type: 'standard', theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left', width: Math.round(largura) });
}

/* abre a janela da Apple e devolve o id_token (e o nome, que a Apple só dá na primeira vez) */
export async function entrarComAppleNoNavegador(): Promise<{ idToken: string; nome?: string }> {
  await carregar('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js');
  const a = (window as unknown as { AppleID?: { auth: { init: (c: object) => void; signIn: () => Promise<{ authorization: { id_token: string }; user?: { name?: { firstName?: string; lastName?: string } } }> } } }).AppleID;
  if (!a) throw new Error('apple');
  a.auth.init({ clientId: APPLE_CLIENT_ID, scope: 'name email', redirectURI: `${window.location.origin}/app/`, usePopup: true });
  const r = await a.auth.signIn();
  const n = r.user?.name;
  return { idToken: r.authorization.id_token, nome: n ? [n.firstName, n.lastName].filter(Boolean).join(' ') || undefined : undefined };
}
