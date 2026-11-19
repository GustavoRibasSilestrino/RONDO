/* O que chega para o perfil vira notificação. Os brownies ganhos e os níveis novos são avisos locais (estado.notificacoes;
   os brownies entram por componentes/AvisoBrownie.tsx); cheers, comentários e seguidores vêm do servidor e entram só na
   contagem (estado.social.naoLidas). */
import type { Estado } from '../tipos';

export const naoLidas = (e: Estado): number => e.notificacoes.filter((n) => !n.lida).length + e.social.naoLidas;

export function adicionar(e: Estado, n: Pick<Estado['notificacoes'][number], 'tipo' | 'texto'> & { ref?: string }): void {
  e.notificacoes.unshift({ ...n, id: `n${Date.now()}${Math.floor(Math.random() * 1000)}`, quando: Date.now(), lida: false });
  e.notificacoes = e.notificacoes.slice(0, 80);
}
