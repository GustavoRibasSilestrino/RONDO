/* "Olá Rondin": decide se uma frase ouvida pelo navegador está chamando o RONDIN. Puro, sem dependências do app (conferido por
   scripts/testar-rondin.mjs).

   O reconhecimento de fala erra o nome ("Rondim", "Ron Din", "Rodin"), então a comparação é aproximada: vale o nome com no
   máximo uma letra diferente, ou duas palavras coladas ("ron" + "din"). Para não acordar com qualquer conversa, a frase precisa
   ter uma saudação (em qualquer língua da lista) ou ser curta (até quatro palavras): "Rondon explorou o Brasil" não chama. */
import type { Idioma } from './rondinSotaques.ts';
import { normalizar } from './rondinConversa.ts';

const ALVO = 'rondin';

/* escritas que o reconhecedor devolve para o nome, inclusive em outros alfabetos */
const EXATOS = new Set([
  'rondin', 'rondim', 'rodin', 'rondine', 'ronden', 'rondyn', 'rondyne', 'rondinn',
  'рондин', 'рондін', 'ロンディン', 'ロンジン', 'ロンダン', 'روندين', 'رندين', '론딘', '론딩',
]);

/* saudações por língua; as de línguas fora das três do RONDIN só servem para aceitar a frase */
const SAUDACOES: Record<Idioma | 'outra', string[]> = {
  pt: ['ola', 'oi', 'oie', 'ei', 'eai', 'salve', 'fala', 'opa'],
  en: ['hello', 'hi', 'hey', 'yo', 'howdy'],
  es: ['hola', 'oye', 'buenas', 'che', 'ey'],
  outra: ['bonjour', 'salut', 'coucou', 'allo', 'ciao', 'hallo', 'hej', 'ahoj', 'merhaba', 'salam', 'shalom', 'namaste', 'aloha', 'nihao', 'konnichiwa', 'привет', 'здравствуйте', 'こんにちは', '你好', '안녕', 'مرحبا'],
};

const PRIMEIRAS = new Set(['ron', 'rom', 'run', 'rhon']);
const SEGUNDAS = new Set(['din', 'dim', 'dean', 'dinn', 'ding', 'dine', 'dyn', 'dien', 'diem', 'dino']);

/* distância de edição (quantas letras trocar, pôr ou tirar) */
export function distancia(a: string, b: string): number {
  if (a === b) return 0;
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const atual = [i];
    for (let j = 1; j <= b.length; j += 1) {
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    anterior = atual;
  }
  return anterior[b.length];
}

const pareceONome = (t: string): boolean => EXATOS.has(t) || (t.length >= 5 && t.length <= 8 && distancia(t, ALVO) <= 1);

export function ouveChamado(frase: string): boolean {
  const palavras = normalizar(frase).split(' ').filter(Boolean);
  if (palavras.length === 0) return false;
  const saudou = palavras.some((p) => Object.values(SAUDACOES).some((l) => l.includes(p)));
  let achou = palavras.some(pareceONome);
  /* "ron din" falado em duas palavras */
  for (let i = 0; !achou && i + 1 < palavras.length; i += 1) {
    if ((PRIMEIRAS.has(palavras[i]) && SEGUNDAS.has(palavras[i + 1])) || pareceONome(palavras[i] + palavras[i + 1])) achou = true;
  }
  /* quem diz o nome do app ("Olá Rondo") também está chamando, mas só com saudação */
  if (!achou && saudou && palavras.some((p) => p === 'rondo' || p === 'rondon')) achou = true;
  return achou && (saudou || palavras.length <= 4);
}

/* a língua da saudação, para ele responder nela; sem saudação conhecida, nenhuma */
export function idiomaDoChamado(frase: string): Idioma | undefined {
  const palavras = normalizar(frase).split(' ').filter(Boolean);
  for (const lingua of ['pt', 'en', 'es'] as const) if (palavras.some((p) => SAUDACOES[lingua].includes(p))) return lingua;
  return undefined;
}
