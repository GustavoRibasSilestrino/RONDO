/* Os browniezinhos abertos neste navegador e ainda não resgatados para uma conta (desde 2026-11-18).
   Abrir um pacote não pede conta: o servidor sorteia o mascote e devolve um código de resgate, que vale 7 dias. O site
   guarda aqui o código e qual mascote saiu, para a pessoa poder entrar (ou criar a conta) no app e, de volta à loja,
   resgatar com um toque. Não é dado pessoal: só códigos e posições na folha de mascotes. Sai daqui ao resgatar ou ao vencer. */
import { useSyncExternalStore } from "react";

export type Pendente = { codigo: string; linha: number; coluna: number; vence: string };

const CHAVE = "rondo.loja.resgates";
const MAXIMO = 60;

function ler(): Pendente[] {
  try {
    const lista: unknown = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
    if (!Array.isArray(lista)) return [];
    return lista.filter((p): p is Pendente =>
      !!p && typeof p.codigo === "string" && Number.isInteger(p.linha) && Number.isInteger(p.coluna) && Date.parse(p.vence) > Date.now());
  } catch {
    return [];
  }
}

let lista: Pendente[] = typeof window === "undefined" ? [] : ler();
const ouvintes = new Set<() => void>();

function gravar(nova: Pendente[]) {
  lista = nova;
  try { localStorage.setItem(CHAVE, JSON.stringify(nova)); } catch { /* sem armazenamento: vale só enquanto a página está aberta */ }
  ouvintes.forEach((f) => f());
}

if (typeof window !== "undefined") {
  addEventListener("storage", (e) => { if (e.key === CHAVE || e.key === null) { lista = ler(); ouvintes.forEach((f) => f()); } });
}

export const guardarPendente = (p: Pendente) => gravar([p, ...lista.filter((x) => x.codigo !== p.codigo)].slice(0, MAXIMO));
export const tirarPendente = (codigo: string) => gravar(lista.filter((x) => x.codigo !== codigo));
export const usePendentes = () => useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => lista);
