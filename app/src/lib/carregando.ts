/* A tela de carregamento do navegador (public/index.html, gerada por scripts/gerar-carregando.mjs): preta, com o nome RONDO no
   meio, aparece antes de o app carregar. Quando o app está pronto para mostrar a primeira tela, ela some esmaecendo e a
   abertura do app (componentes/Abertura.tsx), com o mesmo nome, assume no mesmo lugar.
   No celular não existe (lá é só a abertura). */
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
