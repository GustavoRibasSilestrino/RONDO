/* As vozes do RONDIN (dados puros, sem dependências: o app e o gerador de vozes leem este arquivo).
   São três, uma por língua: Português, English e Español. Quem escolhe a língua na primeira pergunta do RONDIN ouve e lê
   todo o resto da conversa nela: as perguntas, as opções, os comentários e os avisos (os textos estão em rondinTextos.ts).
   Os ids ('br', 'gringo', 'espanhol') são os mesmos de antes, os do servidor (backend/app/servicos/voz.py) e do áudio já
   gerado. Quem tinha escolhido outro sotaque (Portugal, italiano, robô...) cai no Português (`achaSotaque`). */
export type Idioma = 'pt' | 'en' | 'es';

export type Sotaque = {
  id: string;              // o id da voz no servidor e nas pastas de áudio
  idioma: Idioma;          // a língua da conversa inteira
  nome: string;            // como a língua se chama nela mesma
  nota: string;            // a linha miúda embaixo do nome
  lang: string;            // idioma da voz que vai ler
  tom: number;             // 0.5 a 2
  taxa: number;            // 0.5 a 2 (1 = normal)
  mudo?: boolean;          // só legenda, sem som
};

export const SOTAQUES: Sotaque[] = [
  { id: 'br', idioma: 'pt', nome: 'Português', nota: 'voz brasileira', lang: 'pt-BR', tom: 1, taxa: 1 },
  { id: 'gringo', idioma: 'en', nome: 'English', nota: 'American voice', lang: 'en-US', tom: 1, taxa: 1 },
  { id: 'espanhol', idioma: 'es', nome: 'Español', nota: 'voz en español', lang: 'es-ES', tom: 1, taxa: 1 },
];

export const achaSotaque = (id: string | undefined): Sotaque => SOTAQUES.find((s) => s.id === id) ?? SOTAQUES[0];
export const sotaqueDoIdioma = (i: Idioma): Sotaque => SOTAQUES.find((s) => s.idioma === i) ?? SOTAQUES[0];

/* A língua do aparelho ou do navegador decide só em que língua a primeira pergunta ("escolha a sua língua") é feita; tudo o
   mais vem da escolha da pessoa. Qualquer língua que não seja inglês ou espanhol fica em português. */
export function sotaquePadrao(): Sotaque {
  let lingua = '';
  try { lingua = (Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase(); } catch { /* sem Intl: português */ }
  return lingua.startsWith('en') ? sotaqueDoIdioma('en') : lingua.startsWith('es') ? sotaqueDoIdioma('es') : SOTAQUES[0];
}
