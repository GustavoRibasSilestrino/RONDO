/* Todas as publicações que a pessoa pode ver: as dela (guardadas no aparelho) e as de demonstração, da mais nova para a mais antiga. */
import { POSTS_BASE } from '../../dados';
import type { Estado, Post } from '../../tipos';

export function todosOsPosts(estado: Estado): Post[] {
  const agora = Date.now();
  const base: Post[] = POSTS_BASE.map((p) => ({ id: p.id, autor: p.autor, texto: p.texto, destaque: p.destaque, quando: agora - p.horas * 3600000, grupo: p.grupo }));
  return [...estado.posts, ...base].sort((a, b) => b.quando - a.quando);
}
