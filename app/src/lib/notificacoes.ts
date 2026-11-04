/* O que chega para o perfil vira notificação: medalhas novas e as reações às suas publicações.
   Em modo demonstração, quem reage às suas publicações é gente de demonstração; com a API, isso vem do servidor. */
import { useEffect, useRef } from 'react';
import { modoDemonstracao } from '../api/conta';
import { useLoja } from '../estado/loja';
import type { Estado } from '../tipos';
import { MEDALHAS, medalhasDe } from './medalhas';

const GENTE = ['Marina Rocha', 'Lucas Prado', 'Bia Almeida', 'Tiago Santos', 'Camila Duarte', 'Rafa Lima'];

export const naoLidas = (e: Estado): number => e.notificacoes.filter((n) => !n.lida).length;

function adicionar(e: Estado, n: Omit<Estado['notificacoes'][number], 'id' | 'lida' | 'quando'>): void {
  e.notificacoes.unshift({ ...n, id: `n${Date.now()}${Math.floor(Math.random() * 1000)}`, quando: Date.now(), lida: false });
  e.notificacoes = e.notificacoes.slice(0, 80);
}

export function useNotificacoes(): void {
  const { estado, pronto, commit } = useLoja();
  const postsVistos = useRef<Set<string> | null>(null);

  /* medalhas novas: a primeira leitura só registra as que já estavam abertas */
  useEffect(() => {
    if (!pronto || !estado.usuario) return;
    const abertas = medalhasDe(estado, new Date()).filter((m) => m.aberta).map((m) => m.id);
    if (estado.medalhasAvisadas === null) {
      commit((e) => { e.medalhasAvisadas = abertas; });
      return;
    }
    const novas = abertas.filter((id) => !estado.medalhasAvisadas!.includes(id));
    if (novas.length === 0) return;
    commit((e) => {
      for (const id of novas) {
        const m = MEDALHAS.find((x) => x.id === id);
        if (m) adicionar(e, { tipo: 'medalha', texto: `Missão cumprida: ${m.nome}. Você ganhou uma medalha.`, ref: id });
      }
      e.medalhasAvisadas = [...(e.medalhasAvisadas ?? []), ...novas];
    });
  }, [pronto, estado, commit]);

  /* publicação nova sua: em demonstração, duas pessoas reagem alguns segundos depois */
  useEffect(() => {
    if (!pronto || !estado.usuario || !modoDemonstracao) return undefined;
    const meus = estado.posts.map((p) => p.id);
    if (postsVistos.current === null) { postsVistos.current = new Set(meus); return undefined; }
    const novos = meus.filter((id) => !postsVistos.current!.has(id));
    postsVistos.current = new Set(meus);
    if (novos.length === 0) return undefined;
    const t1 = setTimeout(() => commit((e) => adicionar(e, { tipo: 'cheers', texto: `${GENTE[Math.floor(Math.random() * GENTE.length)]} deu cheers na sua publicação.` })), 5000);
    const t2 = setTimeout(() => commit((e) => adicionar(e, { tipo: 'comentario', texto: `${GENTE[Math.floor(Math.random() * GENTE.length)]} comentou na sua publicação.` })), 11000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pronto, estado.posts, estado.usuario, commit]);
}
