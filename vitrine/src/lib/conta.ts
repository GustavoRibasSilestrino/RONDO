/* A conta do app no site (pedido do dono em 2026-11-18: "quando a pessoa já tem conta no app, essa conta fica salva no
   site também"). O app web (userondo.vercel.app/app) e o site ficam no mesmo endereço e por isso dividem o armazenamento do
   navegador: quem entrou no app já está entrado no site. O site só LÊ o que o app guardou (o token em "yy.token" e a cópia
   da conta em "yy.app.v1"; ver app/src/api/sessao.ts e app/src/estado/loja.tsx) e confere o nome, o @ e a foto com a API.
   Não grava nada ali: entrar, criar conta e sair continuam sendo no app.
   Para o app, a pessoa só está dentro com as duas coisas juntas (o token e a conta); o site segue a mesma regra. */
import { useSyncExternalStore } from "react";
import { API } from "./api";

export type Conta = { nome: string; arroba: string | null; foto: string | null };
type Estado = { token: string | null; conta: Conta | null };

const TOKEN = "yy.token", DADOS = "yy.app.v1";
const FORA: Estado = { token: null, conta: null };

function lerDoApp(): Estado {
  try {
    const token = localStorage.getItem(TOKEN);
    const bruto = token ? localStorage.getItem(DADOS) : null;
    if (!token || !bruto) return FORA;
    const u = (JSON.parse(bruto) as { usuario?: { nome?: string; arroba?: string; foto?: string } | null }).usuario;
    return u?.nome ? { token, conta: { nome: u.nome, arroba: u.arroba || null, foto: u.foto || null } } : FORA;
  } catch {
    return FORA;   // sem acesso ao armazenamento (janela privada, bloqueio): o site fica sem conta
  }
}

let estado: Estado = typeof window === "undefined" ? FORA : lerDoApp();
const ouvintes = new Set<() => void>();
function mudar(novo: Estado) { estado = novo; ouvintes.forEach((f) => f()); }

/* confere a conta com o servidor: o nome, o @ e a foto mais novos; token vencido ou recusado tira a conta do site */
async function conferir() {
  const { token } = estado;
  if (!token) return;
  try {
    const r = await fetch(`${API}/auth/eu`, { headers: { Authorization: `Bearer ${token}` } });
    if (estado.token !== token) return;
    if (r.status === 401 || r.status === 403) { mudar(FORA); return; }
    if (!r.ok) return;
    const eu = (await r.json()) as { nome: string; arroba?: string | null; foto?: string | null };
    mudar({ token, conta: { nome: eu.nome, arroba: eu.arroba || null, foto: eu.foto || null } });
  } catch { /* sem rede: fica a cópia que o app guardou */ }
}

if (typeof window !== "undefined") {
  if (estado.token) void conferir();
  /* entrou ou saiu do app em outra aba: o site acompanha sem recarregar */
  addEventListener("storage", (e) => {
    if (e.key !== null && e.key !== TOKEN && !(e.key === DADOS && !estado.conta)) return;
    const novo = lerDoApp();
    if (novo.token === estado.token && !!novo.conta === !!estado.conta) return;
    mudar(novo);
    void conferir();
  });
}

export const useConta = () => useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => estado);

/* o servidor recusou o token no meio do caminho (ex.: a senha mudou em outro aparelho): o site passa a mostrar sem conta */
export const contaRecusada = () => mudar(FORA);

/* como a conta aparece: o @ quando existe, senão o primeiro nome */
export const rotuloDa = (c: Conta) => (c.arroba ? `@${c.arroba}` : c.nome.trim().split(/\s+/)[0]);
