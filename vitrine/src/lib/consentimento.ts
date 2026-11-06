/* Preferências de cookies e armazenamento do site.
   Hoje o site não carrega nenhum rastreador, análise ou publicidade: só o essencial (lembrar esta escolha).
   Regra para o futuro: qualquer script de análise ou marketing só pode ser carregado se podeUsar(...) for true,
   e precisa aparecer na Política de Privacidade e em /suboperadores antes. */
export type Categoria = "analise" | "marketing";
export type Prefs = { analise: boolean; marketing: boolean; em: string; versao: string };

const CHAVE = "rondo.cookies.v1";
export const VERSAO_COOKIES = "2026-11-05";   // mudou o que é coletado? suba a versão: o aviso aparece de novo

const ouvintes = new Set<() => void>();
let abrir: (() => void) | null = null;

export function lerPrefs(): Prefs | null {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Prefs | null;
    return p && p.versao === VERSAO_COOKIES ? p : null;
  } catch {
    return null;
  }
}

export function salvarPrefs(escolha: { analise: boolean; marketing: boolean }) {
  const p: Prefs = { ...escolha, em: new Date().toISOString(), versao: VERSAO_COOKIES };
  try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* navegador sem armazenamento: vale só nesta visita */ }
  ouvintes.forEach((f) => f());
}

/* sem escolha feita, nada opcional liga (bloqueado até o consentimento) */
export const podeUsar = (c: Categoria): boolean => lerPrefs()?.[c] === true;

export const aoMudarPrefs = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };

/* o rodapé reabre o painel a qualquer momento */
export const registrarAbrirPreferencias = (f: (() => void) | null) => { abrir = f; };
export const abrirPreferenciasCookies = () => abrir?.();
