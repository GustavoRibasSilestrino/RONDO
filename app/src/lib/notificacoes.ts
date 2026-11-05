/* O que chega para o perfil vira notificação. As medalhas novas são avisos locais (estado.notificacoes);
   cheers, comentários e seguidores vêm do servidor e entram só na contagem (estado.social.naoLidas). */
import { useEffect } from 'react';
import { useLoja } from '../estado/loja';
import type { Estado } from '../tipos';
import { MEDALHAS, medalhasDe } from './medalhas';

export const naoLidas = (e: Estado): number => e.notificacoes.filter((n) => !n.lida).length + e.social.naoLidas;

export function adicionar(e: Estado, n: Pick<Estado['notificacoes'][number], 'tipo' | 'texto'> & { ref?: string }): void {
  e.notificacoes.unshift({ ...n, id: `n${Date.now()}${Math.floor(Math.random() * 1000)}`, quando: Date.now(), lida: false });
  e.notificacoes = e.notificacoes.slice(0, 80);
}

export function useNotificacoes(): void {
  const { estado, pronto, commit } = useLoja();

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

}
