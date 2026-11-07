/* Stories: ficam no servidor, 24 horas no ar, e aparecem para quem segue o autor (api/social.ts).
   Aqui: um cache compartilhado entre a faixa do Feed e o Perfil, o tempo de cada story e as cores dos stories de texto. */
import { useEffect, useState } from 'react';
import { lerStories, type Pessoa, type StoriesDaPessoa } from '../api/social';
import { useLoja } from '../estado/loja';
import type { Midia } from '../tipos';

export const DURACAO_NO_AR = 24 * 3600 * 1000;
export const DURACAO_STORY_MS = 5000;   // quanto tempo cada story fica na tela

/* fundos dos stories de texto: cores sólidas, sem degradê */
export const FUNDOS_STORY = ['#6a00d4', '#0a67ff', '#e11d48', '#059669', '#d97706', '#27272a'];

/* um story pronto para mostrar, seu ou de outra pessoa (o id é o do servidor, em texto) */
export type StoryVista = {
  id: string; autor: string; criado: number; midia?: Midia; texto?: string; fundo?: number; legenda?: string; meu?: boolean;
  visualizacoes?: number; reacoes?: number; vistos?: Pessoa[]; minhaReacao?: string | null;
};

/* as reações: o coração é o "curtir"; as outras são emojis. O servidor guarda só o nome. */
export const REACOES_STORY: { tipo: string; emoji: string; rotulo: string }[] = [
  { tipo: 'curtir', emoji: '❤️', rotulo: 'Curtir' },
  { tipo: 'fogo', emoji: '🔥', rotulo: 'Fogo' },
  { tipo: 'forca', emoji: '💪', rotulo: 'Força' },
  { tipo: 'palmas', emoji: '👏', rotulo: 'Palmas' },
  { tipo: 'risada', emoji: '😂', rotulo: 'Risada' },
  { tipo: 'uau', emoji: '😮', rotulo: 'Uau' },
];
export const emojiDe = (tipo: string | null | undefined): string => REACOES_STORY.find((r) => r.tipo === tipo)?.emoji ?? '';
/* os stories de uma pessoa, na ordem em que foram publicados */
export type StoriesPessoa = { pessoa: Pessoa; autor: string; itens: StoryVista[] };

export const noAr = (criado: number, agora = Date.now()): boolean => agora - criado < DURACAO_NO_AR;

export const haStoryNovo = (itens: StoryVista[], vistos: Record<string, boolean>): boolean => itens.some((s) => !vistos[s.id]);

export function tempoStory(criado: number): string {
  const min = Math.max(1, Math.round((Date.now() - criado) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h` : `${Math.round(h / 24)} d`;
}

function converter(p: StoriesDaPessoa): StoriesPessoa {
  const autor = p.autor.voce ? 'Você' : p.autor.nome;
  return {
    pessoa: p.autor,
    autor,
    itens: p.itens.map((s) => ({
      id: String(s.id), autor, criado: s.quando, meu: p.autor.voce,
      midia: s.midia ?? undefined, texto: s.texto ?? undefined, fundo: s.fundo, legenda: s.legenda ?? undefined,
      visualizacoes: s.visualizacoes, reacoes: s.reacoes, vistos: s.vistos, minhaReacao: s.minha_reacao ?? null,
    })),
  };
}

/* ---------- cache: uma leitura serve a faixa do Feed e o Perfil; publicar ou excluir recarrega ---------- */
type Cache = { dono: string; pessoas: StoriesPessoa[] };
let cache: Cache | null = null;
let pedido: Promise<void> | null = null;
const ouvintes = new Set<() => void>();
const avisarOuvintes = () => ouvintes.forEach((f) => f());

export function recarregarStories(dono: string): Promise<void> {
  if (pedido) return pedido;
  pedido = lerStories()
    .then((r) => { cache = { dono, pessoas: r.pessoas.map(converter) }; })
    .finally(() => { pedido = null; avisarOuvintes(); });
  return pedido;
}

/* os stories no ar para a pessoa logada; lê do servidor ao montar e mostra o cache enquanto isso */
export function useStories() {
  const { estado } = useLoja();
  const dono = estado.usuario?.email ?? '';
  const [, setVersao] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const f = () => setVersao((v) => v + 1);
    ouvintes.add(f);
    return () => { ouvintes.delete(f); };
  }, []);
  useEffect(() => {
    if (!dono) return;
    recarregarStories(dono).then(() => setErro(null), (e: unknown) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar os stories.'));
  }, [dono]);

  const pessoas = cache && cache.dono === dono ? cache.pessoas : [];   // de outra conta: não mostra nada até chegar o novo
  const meus = pessoas.find((p) => p.pessoa.voce)?.itens ?? [];
  const outros = pessoas.filter((p) => !p.pessoa.voce);
  return { pessoas, meus, outros, erro, recarregar: () => recarregarStories(dono) };
}
