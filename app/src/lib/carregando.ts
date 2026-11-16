/* A tela de carregamento do navegador (public/index.html, gerada por scripts/gerar-carregando.mjs): o RONDIN (a esfera de
   pontos) no meio, sobre o fundo do app, aparece antes de o app carregar. Quando o app está pronto, ela some esmaecendo e o
   RONDIN do app assume no mesmo lugar. No navegador não há a abertura com o nome RONDO (só no celular, Abertura.tsx). */
import { Platform } from 'react-native';

let tirada = false;
export function tirarCarregando(): void {
  if (tirada || Platform.OS !== 'web' || typeof document === 'undefined') return;
  tirada = true;
  const el = document.getElementById('carregando');
  if (!el) return;
  el.classList.add('saindo');
  setTimeout(() => el.remove(), 320);
}
