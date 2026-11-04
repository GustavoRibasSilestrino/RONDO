/* Um benefício mínimo para cada nível da conta, de 2 a 25. Os números (destaques, títulos, fotos e descrição) crescem de verdade
   no app; a patente e o tema Ultra aparecem quando o nível chega neles. */
import { useLoja } from '../estado/loja';
import { nivelDe, xpTotal } from './nivel';

export type Efeito = 'destaque' | 'titulo' | 'midia' | 'bio' | 'patente' | 'tema';
export type Beneficio = { nivel: number; texto: string; efeito: Efeito };

export const NIVEL_ULTRA = 15;
export const NIVEL_MAX_BENEFICIOS = 25;

export const BENEFICIOS: Beneficio[] = [
  { nivel: 2, texto: 'Patente Bronze I no perfil', efeito: 'patente' },
  { nivel: 3, texto: 'Mais um destaque no perfil', efeito: 'destaque' },
  { nivel: 4, texto: 'Mais um título no perfil', efeito: 'titulo' },
  { nivel: 5, texto: 'Patente Prata II no perfil', efeito: 'patente' },
  { nivel: 6, texto: 'Mais um destaque no perfil', efeito: 'destaque' },
  { nivel: 7, texto: 'Mais uma foto ou vídeo por publicação', efeito: 'midia' },
  { nivel: 8, texto: 'Patente Ouro III no perfil', efeito: 'patente' },
  { nivel: 9, texto: 'Mais um título no perfil', efeito: 'titulo' },
  { nivel: 10, texto: 'Descrição do perfil 20 letras maior', efeito: 'bio' },
  { nivel: 11, texto: 'Mais um destaque no perfil', efeito: 'destaque' },
  { nivel: 12, texto: 'Patente Platina IV no perfil', efeito: 'patente' },
  { nivel: 13, texto: 'Mais uma foto ou vídeo por publicação', efeito: 'midia' },
  { nivel: 14, texto: 'Mais um título no perfil', efeito: 'titulo' },
  { nivel: 15, texto: 'Tema Ultra e o título Lenda de ontem', efeito: 'tema' },
  { nivel: 16, texto: 'Mais um destaque no perfil', efeito: 'destaque' },
  { nivel: 17, texto: 'Descrição do perfil 20 letras maior', efeito: 'bio' },
  { nivel: 18, texto: 'Patente Diamante V no perfil', efeito: 'patente' },
  { nivel: 19, texto: 'Mais um título no perfil', efeito: 'titulo' },
  { nivel: 20, texto: 'Mais uma foto ou vídeo por publicação', efeito: 'midia' },
  { nivel: 21, texto: 'Mais um destaque no perfil', efeito: 'destaque' },
  { nivel: 22, texto: 'Descrição do perfil 20 letras maior', efeito: 'bio' },
  { nivel: 23, texto: 'Mais um título no perfil', efeito: 'titulo' },
  { nivel: 24, texto: 'Descrição do perfil 20 letras maior', efeito: 'bio' },
  { nivel: 25, texto: 'Patente RONDO no perfil', efeito: 'patente' },
];

export type Limites = { destaques: number; titulos: number; midias: number; bio: number };

/* o que a conta pode ter neste nível */
export function limitesDe(nivel: number): Limites {
  const n = (e: Efeito) => BENEFICIOS.filter((b) => b.efeito === e && b.nivel <= nivel).length;
  return { destaques: 3 + n('destaque'), titulos: 3 + n('titulo'), midias: 4 + n('midia'), bio: 160 + 20 * n('bio') };
}

/* o benefício que cada nível dá (só um por nível) */
export const beneficioDoNivel = (nivel: number): Beneficio | undefined => BENEFICIOS.find((b) => b.nivel === nivel);

/* o nível e os limites da conta de agora */
export function useConta(): { nivel: number; limites: Limites } {
  const { estado } = useLoja();
  const nivel = nivelDe(xpTotal(estado));
  return { nivel, limites: limitesDe(nivel) };
}
