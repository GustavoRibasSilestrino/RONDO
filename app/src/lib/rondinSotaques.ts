/* Os sotaques do RONDIN (dados puros, sem dependências: o app e o gerador de vozes leem este arquivo). */
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
