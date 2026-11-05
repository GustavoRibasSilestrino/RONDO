/* Todas as publicações que a pessoa pode ver, da mais nova para a mais antiga.
   Por enquanto são só as suas, guardadas no aparelho; as de outras pessoas vão chegar pela API. */
import type { Estado, Post } from '../../tipos';

export function todosOsPosts(estado: Estado): Post[] {
  return [...estado.posts].sort((a, b) => b.quando - a.quando);
}
