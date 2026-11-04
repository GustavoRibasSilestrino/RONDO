/* Pequenos auxiliares da Comunidade. */
export const quando = (ts: number): string => {
  const min = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} d`;
};

export const plural = (n: number, um: string, varios: string): string => `${n} ${n === 1 ? um : varios}`;

/* para buscar sem se importar com maiúsculas e acentos */
export const normalizar = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/* nome de usuário de partida: o nome sem acentos, em minúsculas, com pontos */
export const arrobaDe = (nome: string): string => nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^.+|.+$/g, '').slice(0, 20) || 'kora';
