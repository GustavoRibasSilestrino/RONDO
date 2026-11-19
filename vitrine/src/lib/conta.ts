/* A conta do RONDO no site (pedidos do dono em 2026-11-18).
   O app web (userondo.vercel.app/app) e o site ficam no mesmo endereço e dividem o armazenamento do navegador. A sessão é
   uma só: o token em "yy.token", o mesmo que o app guarda (app/src/api/sessao.ts). Por isso:
   - quem entrou no app já aparece entrado no site;
   - quem entra pelo site (a tela do RONDIN em /entrar) já aparece entrado no app: o app vê o token e busca a conta
     (App.tsx, "sessão feita no site");
   - sair, num ou noutro, tira o token e vale para os dois.
   O nome, o @ e a foto ficam numa cópia ("rondo.site.conta", presa ao token) para aparecerem na hora; o site confere com o
   servidor (/auth/eu) a cada visita. Token vencido ou recusado tira a conta do site. */
import { useSyncExternalStore } from "react";
import { API, type ContaLogada } from "./api";

export type Conta = { nome: string; arroba: string | null; foto: string | null };
type Estado = { token: string | null; conta: Conta | null };

const TOKEN = "yy.token", DADOS_DO_APP = "yy.app.v1", COPIA = "rondo.site.conta";
const FORA: Estado = { token: null, conta: null };
const marcaDo = (token: string) => token.slice(-16);   // a cópia só vale para o token com que foi feita

function lerJson<T>(chave: string): T | null {
  try { return JSON.parse(localStorage.getItem(chave) ?? "null") as T | null; } catch { return null; }
}

function lerLocal(): Estado {
  try {
    const token = localStorage.getItem(TOKEN);
    if (!token) return FORA;
    const copia = lerJson<Conta & { marca?: string }>(COPIA);
    if (copia?.nome && copia.marca === marcaDo(token)) return { token, conta: { nome: copia.nome, arroba: copia.arroba ?? null, foto: copia.foto ?? null } };
    const doApp = lerJson<{ usuario?: { nome?: string; arroba?: string; foto?: string } | null }>(DADOS_DO_APP)?.usuario;
    return { token, conta: doApp?.nome ? { nome: doApp.nome, arroba: doApp.arroba || null, foto: doApp.foto || null } : null };
  } catch {
    return FORA;   // sem acesso ao armazenamento (janela privada, bloqueio): o site fica sem conta
  }
}

function gravarCopia(token: string, c: Conta) {
  try { localStorage.setItem(COPIA, JSON.stringify({ ...c, marca: marcaDo(token) })); } catch { /* sem armazenamento */ }
}

/* a conta guardada pelo app é de outra pessoa? O app passa a não tê-la, e ao abrir busca a nova pelo token (e começa limpo) */
function soltarContaDoApp(email: string | null) {
  try {
    const dados = lerJson<{ usuario?: { email?: string } | null }>(DADOS_DO_APP);
    if (dados?.usuario && (email === null || dados.usuario.email?.toLowerCase() !== email.toLowerCase())) {
      localStorage.setItem(DADOS_DO_APP, JSON.stringify({ ...dados, usuario: null }));
    }
  } catch { /* sem armazenamento */ }
}

let estado: Estado = typeof window === "undefined" ? FORA : lerLocal();
const ouvintes = new Set<() => void>();
function mudar(novo: Estado) { estado = novo; ouvintes.forEach((f) => f()); }

function esquecer() {
  try { localStorage.removeItem(TOKEN); localStorage.removeItem(COPIA); } catch { /* sem armazenamento */ }
  soltarContaDoApp(null);
  mudar(FORA);
}

/* confere a conta com o servidor: o nome, o @ e a foto mais novos; token vencido ou recusado sai do navegador */
async function conferir() {
  const { token } = estado;
  if (!token) return;
  try {
    const r = await fetch(`${API}/auth/eu`, { headers: { Authorization: `Bearer ${token}` } });
    if (estado.token !== token) return;
    if (r.status === 401 || r.status === 403) { esquecer(); return; }
    if (!r.ok) return;
    const eu = (await r.json()) as { nome: string; arroba?: string | null; foto?: string | null };
    const conta: Conta = { nome: eu.nome, arroba: eu.arroba || null, foto: eu.foto || null };
    gravarCopia(token, conta);
    mudar({ token, conta });
  } catch { /* sem rede: fica a cópia */ }
}

if (typeof window !== "undefined") {
  if (estado.token) void conferir();
  /* entrou ou saiu em outra aba (no app ou no site): o site acompanha sem recarregar */
  addEventListener("storage", (e) => {
    if (e.key !== null && e.key !== TOKEN) return;
    const novo = lerLocal();
    if (novo.token === estado.token) return;
    mudar(novo);
    void conferir();
  });
}

export const useConta = () => useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => estado);

/* entrou ou criou a conta pelo site: guarda a sessão no mesmo lugar do app (vale para os dois) */
export function guardarSessao(l: ContaLogada) {
  const conta: Conta = { nome: l.nome, arroba: l.arroba || null, foto: l.foto || null };
  try { localStorage.setItem(TOKEN, l.token); } catch { /* sem armazenamento: vale só nesta página */ }
  gravarCopia(l.token, conta);
  soltarContaDoApp(l.email);
  mudar({ token: l.token, conta });
}

/* sair da conta pelo site: tira a sessão do navegador (sai do app também, como o "Sair da conta" do app) */
export const sair = () => esquecer();

/* o servidor recusou o token no meio do caminho (ex.: a senha mudou em outro aparelho) */
export const contaRecusada = () => esquecer();

/* como a conta aparece: o @ quando existe, senão o primeiro nome */
export const rotuloDa = (c: Conta) => (c.arroba ? `@${c.arroba}` : c.nome.trim().split(/\s+/)[0]);
