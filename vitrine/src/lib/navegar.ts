/* Troca de tela dentro do site sem recarregar a página (pedido do dono em 2026-11-18: ao tocar na tenda aparecia uma tela
   preta antes da loja, e outra na volta). Entre a página principal (/) e a loja (/loja), o clique num link troca a tela na
   hora: o site não é baixado de novo e a imagem grande da outra tela já vem carregada (adiantada assim que a página abre).
   As outras páginas (as legais e o /app) seguem como links comuns.
   O "voltar" do navegador funciona igual, e a página principal volta no ponto em que a pessoa estava. */
import { useSyncExternalStore } from "react";
import heroFoto from "../assets/cenas/hero-floresta.webp";
import floresta from "../assets/loja/floresta.webp";
import florestaSuave from "../assets/loja/floresta-suave.webp";
import mascotes from "../assets/loja/mascotes.webp";

/* as telas do site que trocam entre si sem recarregar: a principal, a loja e a tela do RONDIN para entrar ou criar conta */
const INTERNAS = new Set(["/", "/loja", "/entrar"]);
const limpar = (caminho: string) => caminho.replace(/\/+$/, "") || "/";
export const rotaAtual = () => limpar(location.pathname);

const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());
function assinar(f: () => void) {
  ouvintes.add(f);
  addEventListener("popstate", f);
  return () => { ouvintes.delete(f); removeEventListener("popstate", f); };
}
export const useRota = () => useSyncExternalStore(assinar, rotaAtual);

/* Depois da primeira troca de tela, as entradas animadas (o título que sobe, os blocos que clareiam ao rolar) não se
   repetem: quem volta encontra tudo já no lugar. A classe no <html> deixa os blocos visíveis (base.css). */
let trocou = false;
export const primeiraTela = () => !trocou;
function marcarTroca() {
  trocou = true;
  document.documentElement.classList.add("ja-entrou");
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";   // a rolagem de cada tela fica por nossa conta
}

/* as imagens grandes de cada tela: a outra tela só aparece com elas prontas */
/* a loja usa a floresta nítida no celular e a levemente desfocada no computador (styles/loja.css, .loja-cenario) */
const largo = () => typeof window !== "undefined" && window.matchMedia("(min-width: 761px)").matches;
const IMAGENS: Record<string, () => string[]> = { "/": () => [heroFoto], "/loja": () => [largo() ? florestaSuave : floresta, mascotes] };
const carregadas = new Map<string, Promise<unknown>>();
function carregar(src: string) {
  let pronta = carregadas.get(src);
  if (!pronta) {
    const img = new Image();
    img.src = src;
    pronta = img.decode().catch(() => {});
    carregadas.set(src, pronta);
  }
  return pronta;
}

/* adianta o que a outra tela vai precisar (imagens e, para a loja, as letras de pixel), sem atrapalhar a que está aberta */
export function adiantar(rota: string) {
  IMAGENS[rota]?.().forEach(carregar);
  if (rota === "/loja" && document.fonts) {
    void document.fonts.load('16px "Press Start 2P"').catch(() => {});
    void document.fonts.load('16px "Pixelify Sans Variable"').catch(() => {});
  }
}

type Marca = { de?: string; y?: number };
const marca = () => (history.state ?? {}) as Marca;
/* onde a tela atual estava rolada (guardado ao sair dela) */
export const rolagemGuardada = () => marca().y ?? 0;

export async function irPara(destino: string) {
  const url = new URL(destino, location.href);
  const rota = limpar(url.pathname), atual = rotaAtual();
  if (rota === atual) return;
  /* voltar para a tela de onde veio é o mesmo que o "voltar" do navegador: ela volta no ponto em que estava */
  if (marca().de === rota && !url.hash) { history.back(); return; }
  /* espera as imagens da outra tela, no máximo um instante (com a rede lenta, troca assim mesmo) */
  await Promise.race([Promise.all((IMAGENS[rota]?.() ?? []).map(carregar)), new Promise((r) => setTimeout(r, 700))]);
  history.replaceState({ ...marca(), y: scrollY }, "");
  marcarTroca();
  history.pushState({ de: atual, y: 0 } satisfies Marca, "", url.pathname + url.search + url.hash);
  avisar();
}

/* sair de uma tela de passagem (a de entrar, depois do login) para o destino, sem deixá-la no histórico: o "voltar" do
   navegador não leva de novo ao formulário. Se a pessoa veio do próprio destino, é o "voltar" (a tela volta onde estava). */
export function sairDaTela(destino: string) {
  const url = new URL(destino, location.href);
  if (marca().de === limpar(url.pathname) && !url.search && !url.hash) { history.back(); return; }
  marcarTroca();
  history.replaceState({ y: 0 } satisfies Marca, "", url.pathname + url.search + url.hash);
  avisar();
}

/* os cliques em links para a outra tela viram troca de tela; o resto (âncoras da mesma tela, /app, páginas legais,
   abrir em outra aba) segue o caminho normal do navegador */
export function interceptarLinks() {
  addEventListener("popstate", () => { if (!trocou) marcarTroca(); });
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    const rota = limpar(url.pathname), atual = rotaAtual();
    if (url.origin !== location.origin || !INTERNAS.has(rota) || !INTERNAS.has(atual) || rota === atual) return;
    e.preventDefault();
    void irPara(a.href);
  });
}
