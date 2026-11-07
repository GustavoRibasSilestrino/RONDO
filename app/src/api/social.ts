/* A parte social, guardada no servidor e compartilhada entre as pessoas: publicações, cheers, comentários, seguir, clubes e avisos. */
import type { Midia } from '../tipos';
import { chamar } from './cliente';

export type Pessoa = { id: number; nome: string; arroba: string | null; selo: string | null; verificado: boolean; seguindo: boolean; voce: boolean };
export type PerfilPublico = Pessoa & { bio: string; posts: number; seguidores: number; seguindo_n: number; clubes?: { id: number; nome: string }[] };

export type PostSocial = {
  id: number;
  autor: Pessoa;
  texto: string;
  destaque: string | null;
  midia: Midia[] | null;   // só as referências: os arquivos ficam no aparelho de quem publicou
  clube: { id: number; nome: string } | null;
  quando: number;
  cheers: number;
  comentarios: number;
  curtiu: boolean;
  meu: boolean;
};

export type ComentarioSocial = { id: number; autor: Pessoa; texto: string; quando: number; meu: boolean };

export type CategoriaClube = 'treino' | 'corrida' | 'dieta' | 'constancia' | 'outro';
export type Clube = {
  id: number; nome: string; descricao: string; categoria: CategoriaClube; privado: boolean; cor: number; meta: string | null;
  membros: number; meu: boolean; proprio: boolean; codigo: string | null;
};

export type AvisoSocial = { id: number; tipo: 'cheers' | 'comentario' | 'seguidor'; texto: string; ator: Pessoa; post_id: number | null; quando: number; lida: boolean };

export type Resumo = {
  id: number; posts: number; cheers_dados: number; seguindo: number; seguidores: number; comentarios: number;
  clubes_criados: number; clubes: number[]; nao_lidas: number;
};

export type Pagina<T> = { itens: T[]; proximo: number | null };
export type FiltroFeed = 'todos' | 'seguindo' | 'clubes' | 'geral';

const qs = (p: Record<string, string | number | boolean | null | undefined>): string => {
  const partes = Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return partes.length ? `?${partes.join('&')}` : '';
};

export const resumoSocial = () => chamar<Resumo>('GET', '/social/resumo');

export const lerFeed = (p: { filtro?: FiltroFeed; clubeId?: number; antes?: number | null }) =>
  chamar<Pagina<PostSocial>>('GET', `/social/feed${qs({ filtro: p.filtro, clube_id: p.clubeId, antes: p.antes })}`);
export const publicarPost = (d: { texto: string; destaque?: string; midia?: Midia[]; clubeId?: number | null }) =>
  chamar<PostSocial>('POST', '/social/posts', { texto: d.texto, destaque: d.destaque, midia: d.midia, clube_id: d.clubeId ?? null });
export const apagarPost = (id: number) => chamar<{ status: string }>('DELETE', `/social/posts/${id}`);
export const darCheers = (id: number) => chamar<PostSocial>('PUT', `/social/posts/${id}/curtida`);
export const tirarCheers = (id: number) => chamar<PostSocial>('DELETE', `/social/posts/${id}/curtida`);

export const lerComentarios = (postId: number, depois?: number | null) =>
  chamar<Pagina<ComentarioSocial>>('GET', `/social/posts/${postId}/comentarios${qs({ depois })}`);
export const comentar = (postId: number, texto: string) => chamar<ComentarioSocial>('POST', `/social/posts/${postId}/comentarios`, { texto });
export const apagarComentario = (id: number) => chamar<{ status: string }>('DELETE', `/social/comentarios/${id}`);

export const lerAvisos = (antes?: number | null) => chamar<Pagina<AvisoSocial>>('GET', `/social/notificacoes${qs({ antes })}`);
export const marcarAvisosLidos = () => chamar<{ status: string }>('POST', '/social/notificacoes/lidas');
export const limparAvisos = () => chamar<{ status: string }>('DELETE', '/social/notificacoes');

export const buscarPessoas = (q: string) => chamar<Pagina<Pessoa>>('GET', `/pessoas${qs({ q })}`);
export const lerPerfil = (id: number) => chamar<PerfilPublico>('GET', `/pessoas/${id}`);
export const lerPostsDaPessoa = (id: number, antes?: number | null) => chamar<Pagina<PostSocial>>('GET', `/pessoas/${id}/posts${qs({ antes })}`);
export const lerSeguidores = (id: number, antes?: number | null) => chamar<Pagina<Pessoa>>('GET', `/pessoas/${id}/seguidores${qs({ antes })}`);
export const lerSeguindo = (id: number, antes?: number | null) => chamar<Pagina<Pessoa>>('GET', `/pessoas/${id}/seguindo${qs({ antes })}`);
export const seguirPessoa = (id: number) => chamar<{ status: string }>('PUT', `/pessoas/${id}/seguir`);
export const deixarDeSeguir = (id: number) => chamar<{ status: string }>('DELETE', `/pessoas/${id}/seguir`);

export const listarClubes = (p: { q?: string; meus?: boolean; antes?: number | null }) =>
  chamar<Pagina<Clube>>('GET', `/clubes${qs({ q: p.q, meus: p.meus ? true : undefined, antes: p.antes })}`);
export const lerClube = (id: number) => chamar<Clube>('GET', `/clubes/${id}`);
export const criarClube = (d: { nome: string; descricao: string; categoria: CategoriaClube; privado: boolean; cor: number; meta?: string }) => chamar<Clube>('POST', '/clubes', d);
export const entrarNoClube = (id: number) => chamar<Clube>('POST', `/clubes/${id}/entrar`);
export const entrarPorCodigo = (codigo: string) => chamar<Clube>('POST', '/clubes/entrar', { codigo });
export const sairDoClube = (id: number) => chamar<{ status: string }>('POST', `/clubes/${id}/sair`);
export const apagarClube = (id: number) => chamar<{ status: string }>('DELETE', `/clubes/${id}`);
export const lerMembros = (id: number) => chamar<Pagina<Pessoa>>('GET', `/clubes/${id}/membros`);

/* stories: 24 horas no ar, os seus e os de quem você segue */
export type StorySocial = { id: number; texto: string | null; fundo: number; legenda: string | null; midia: Midia | null; quando: number };
export type StoriesDaPessoa = { autor: Pessoa; itens: StorySocial[] };   // itens do mais antigo para o mais novo; você vem primeiro
export const lerStories = () => chamar<{ pessoas: StoriesDaPessoa[] }>('GET', '/social/stories');
export const publicarStory = (d: { texto?: string; fundo?: number; legenda?: string; midia?: Midia }) => chamar<StorySocial>('POST', '/social/stories', d);
export const apagarStory = (id: number) => chamar<{ status: string }>('DELETE', `/social/stories/${id}`);

export const pedirUpload = (tipo: 'imagem' | 'video', ext: string) => chamar<{ url_envio: string; url: string }>('POST', '/midia/upload', { tipo, ext });
