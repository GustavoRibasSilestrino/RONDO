/* A voz do RONDIN. Usa a voz do próprio aparelho (expo-speech: no navegador, a síntese do Chrome/Safari/Edge).
   O "sotaque" é a escolha de qual voz lê o texto em português: o de Portugal usa a voz pt-PT; o gringo, o espanhol, o
   italiano e o francês usam a voz desses idiomas lendo português, que é o que dá o sotaque. Se o aparelho não tiver a
   voz pedida, ele fala com a padrão em vez de ficar mudo. Sem voz nenhuma, o RONDIN segue só com a legenda. */
import * as Speech from 'expo-speech';

export type Sotaque = {
  id: string;
  nome: string;
  nota: string;            // a linha miúda embaixo do nome
  lang: string;            // idioma da voz que vai ler
  tom: number;             // 0.5 a 2
  taxa: number;            // 0.5 a 2 (1 = normal)
  amostra: string;         // o que ele diz logo depois de ser escolhido
  mudo?: boolean;          // só legenda, sem som
};

export const SOTAQUES: Sotaque[] = [
  { id: 'br', nome: 'Brasileiro', nota: 'do jeitão de casa', lang: 'pt-BR', tom: 1, taxa: 1, amostra: 'Fechado! Vou falar do jeitão brasileiro mesmo.' },
  { id: 'pt', nome: 'Português de Portugal', nota: 'à moda de Lisboa', lang: 'pt-PT', tom: 1, taxa: 1, amostra: 'Pronto, ficou combinado! Falo à moda de Lisboa, pá.' },
  { id: 'gringo', nome: 'Gringo', nota: 'americano arriscando português', lang: 'en-US', tom: 1, taxa: 0.95, amostra: 'Okay! Eu vou falar português com sotaque de Nova York. Muito bom, né?' },
  { id: 'espanhol', nome: 'Portunhol', nota: 'com muito gusto', lang: 'es-ES', tom: 1, taxa: 1, amostra: 'Vamos! Fechado, falo portunhol y listo.' },
  { id: 'italiano', nome: 'Italiano', nota: 'mamma mia, que treino!', lang: 'it-IT', tom: 1.05, taxa: 1, amostra: 'Perfetto! Vou falar com sotaque de Roma, bellissimo!' },
  { id: 'frances', nome: 'Francês', nota: 'très chique', lang: 'fr-FR', tom: 1, taxa: 1, amostra: 'Voilà! Falo com sotaque de Paris, très bien.' },
  { id: 'narrador', nome: 'Narrador de cinema', nota: 'voz grave e dramática', lang: 'pt-BR', tom: 0.45, taxa: 0.82, amostra: 'Nesta jornada, um herói decidiu mudar de vida. Era você.' },
  { id: 'robo', nome: 'Robô', nota: 'bip, bop, treino', lang: 'pt-BR', tom: 0.2, taxa: 0.8, amostra: 'Bip bop. Modo robô ativado. Pronto para treinar.' },
  { id: 'mudo', nome: 'Só texto', nota: 'sem som, só a legenda', lang: 'pt-BR', tom: 1, taxa: 1, amostra: 'Combinado, sigo só com a legenda.', mudo: true },
];

export const sotaquePadrao = (): Sotaque => SOTAQUES[0];
export const achaSotaque = (id: string | undefined): Sotaque => SOTAQUES.find((s) => s.id === id) ?? SOTAQUES[0];

/* as vozes do aparelho, lidas uma vez (no navegador elas chegam depois do carregamento da página) */
let vozes: Speech.Voice[] | null = null;
let lendoVozes: Promise<Speech.Voice[]> | null = null;
async function listarVozes(): Promise<Speech.Voice[]> {
  if (vozes && vozes.length) return vozes;
  if (!lendoVozes) {
    lendoVozes = (async () => {
      for (let i = 0; i < 4; i += 1) {   // o navegador pode devolver a lista vazia nas primeiras vezes
        try {
          const v = await Speech.getAvailableVoicesAsync();
          if (v.length) { vozes = v; return v; }
        } catch { /* sem lista de vozes: usa a padrão */ }
        await new Promise((r) => setTimeout(r, 250));
      }
      return [];
    })().finally(() => { lendoVozes = null; });
  }
  return lendoVozes;
}

/* a melhor voz do idioma: prefere as "naturais"/"Google"/"Online" e a qualidade melhor */
async function escolherVoz(lang: string): Promise<string | undefined> {
  const todas = await listarVozes();
  const base = lang.slice(0, 2).toLowerCase();
  const igual = todas.filter((v) => v.language?.replace('_', '-').toLowerCase() === lang.toLowerCase());
  const doIdioma = igual.length ? igual : todas.filter((v) => v.language?.toLowerCase().startsWith(base));
  if (!doIdioma.length) return undefined;
  const nota = (v: Speech.Voice) =>
    (/natural|online|neural/i.test(v.name ?? '') ? 3 : 0) + (/google/i.test(v.name ?? '') ? 2 : 0) + (v.quality === 'Enhanced' ? 1 : 0);
  return [...doIdioma].sort((a, b) => nota(b) - nota(a))[0].identifier;
}

let rodada = 0;   // cada fala nova invalida a anterior: um "acabou" atrasado não dispara o passo errado

export function parar(): void {
  rodada += 1;
  try { void Speech.stop(); } catch { /* nada falando */ }
}

/* Fala o texto. `aoFim` roda quando a voz termina, ou na hora se não há voz (modo só texto ou aparelho sem síntese).
   `aoPalavra` avisa o avanço da voz no texto (índice do caractere), quando o aparelho informa. */
export function falar(texto: string, sotaque: Sotaque, aoFim: () => void, aoPalavra?: (indice: number) => void): void {
  parar();
  const minha = rodada;
  const fim = () => { if (rodada === minha) aoFim(); };
  if (sotaque.mudo) { fim(); return; }
  void (async () => {
    try {
      const voice = await escolherVoz(sotaque.lang);
      if (rodada !== minha) return;
      Speech.speak(texto, {
        language: sotaque.lang, pitch: sotaque.tom, rate: sotaque.taxa, voice,
        onDone: fim, onStopped: () => undefined, onError: fim,
        onBoundary: ((e: { charIndex?: number }) => { if (rodada === minha && typeof e.charIndex === 'number') aoPalavra?.(e.charIndex); }) as never,
      });
    } catch {
      fim();
    }
  })();
}
