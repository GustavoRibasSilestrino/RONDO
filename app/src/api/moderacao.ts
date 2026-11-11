/* Segurança da comunidade: denunciar, bloquear e (só para o dono do RONDO) a fila de denúncias. As lojas exigem isso de apps
   com conteúdo publicado pelas pessoas. */
import { chamar } from './cliente';
import type { Pagina, Pessoa } from './social';

export type TipoDenuncia = 'post' | 'comentario' | 'story' | 'pessoa';
export type MotivoDenuncia = 'spam' | 'ofensa' | 'odio' | 'nudez' | 'violencia' | 'golpe' | 'outro';

export const MOTIVOS: { id: MotivoDenuncia; titulo: string }[] = [
  { id: 'ofensa', titulo: 'Ofensa, assédio ou bullying' },
  { id: 'odio', titulo: 'Discurso de ódio ou preconceito' },
  { id: 'nudez', titulo: 'Nudez ou conteúdo sexual' },
  { id: 'violencia', titulo: 'Violência, ameaça ou automutilação' },
  { id: 'golpe', titulo: 'Golpe, fraude ou conta falsa' },
  { id: 'spam', titulo: 'Spam ou propaganda' },
  { id: 'outro', titulo: 'Outro motivo' },
];
export const nomeDoMotivo = (m: string) => MOTIVOS.find((x) => x.id === m)?.titulo ?? m;

export const denunciar = (d: { tipo: TipoDenuncia; alvoId: number; motivo: MotivoDenuncia; detalhe?: string }) =>
  chamar<{ status: string }>('POST', '/denuncias', { tipo: d.tipo, alvo_id: d.alvoId, motivo: d.motivo, detalhe: d.detalhe || null });

export const lerBloqueados = () => chamar<Pagina<Pessoa>>('GET', '/bloqueios');
export const bloquear = (id: number) => chamar<{ status: string }>('PUT', `/bloqueios/${id}`);
export const desbloquear = (id: number) => chamar<{ status: string }>('DELETE', `/bloqueios/${id}`);

export type Denuncia = {
  id: number; tipo: TipoDenuncia; alvo_id: number; motivo: MotivoDenuncia; detalhe: string | null; trecho: string | null;
  midia: string | null; autor: Pessoa | null; denunciante: Pessoa | null; quando: number; situacao: 'pendente' | 'removido' | 'mantido'; vezes: number;
};
export const lerDenuncias = (situacao: 'pendente' | 'removido' | 'mantido' = 'pendente') =>
  chamar<{ itens: Denuncia[]; pendentes: number }>('GET', `/moderacao/denuncias?situacao=${situacao}`);
export const decidirDenuncia = (id: number, acao: 'remover' | 'manter') => chamar<{ status: string }>('POST', `/moderacao/denuncias/${id}`, { acao });

/* o contato da equipe, que aparece no app (as lojas pedem um contato visível para a comunidade) */
export const CONTATO_COMUNIDADE = 'rondooficial.dev@gmail.com';
