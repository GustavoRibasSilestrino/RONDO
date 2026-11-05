/* Stories: o que está no ar (24 horas), o arquivo, os de demonstração de outras pessoas e as cores de fundo dos stories de texto. */
import type { Estado, Midia } from '../tipos';

export const DURACAO_NO_AR = 24 * 3600 * 1000;
export const DURACAO_STORY_MS = 5000;   // quanto tempo cada story fica na tela

/* fundos dos stories de texto: cores sólidas, sem degradê */
export const FUNDOS_STORY = ['#6a00d4', '#0a67ff', '#e11d48', '#059669', '#d97706', '#27272a'];

/* um story pronto para mostrar, seu ou de outra pessoa */
export type StoryVista = { id: string; autor: string; criado: number; midia?: Midia; texto?: string; fundo?: number; legenda?: string; meu?: boolean };

export const noAr = (criado: number, agora = Date.now()): boolean => agora - criado < DURACAO_NO_AR;

export function meusStories(e: Estado, apenasNoAr = true, agora = Date.now()): StoryVista[] {
  return e.stories
    .filter((s) => !apenasNoAr || noAr(s.criado, agora))
    .sort((a, b) => a.criado - b.criado)
    .map((s) => ({ ...s, autor: 'Você', meu: true }));
}

export const haStoryNovo = (itens: StoryVista[], vistos: Record<string, boolean>): boolean => itens.some((s) => !vistos[s.id]);

export function tempoStory(criado: number): string {
  const min = Math.max(1, Math.round((Date.now() - criado) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
}
