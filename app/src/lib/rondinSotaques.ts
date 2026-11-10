/* As vozes do RONDIN (dados puros, sem dependências: o app e o gerador de vozes leem este arquivo).
   São só duas: Português e Inglês. A de inglês é a voz americana falando o mesmo roteiro, que é em português (o texto das
   perguntas não muda). Os ids e as amostras são os de antes ('br' e 'gringo'), para o áudio já gerado continuar valendo.
   As outras opções (Portugal, portunhol, italiano, francês, narrador, robô e só texto) saíram em 2026-11-10; quem tinha
   escolhido uma delas cai no Português (`achaSotaque`). */
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
  { id: 'br', nome: 'Português', nota: 'a voz brasileira', lang: 'pt-BR', tom: 1, taxa: 1, amostra: 'Fechado! Vou falar do jeitão brasileiro mesmo.' },
  { id: 'gringo', nome: 'Inglês', nota: 'voz americana, falando português', lang: 'en-US', tom: 1, taxa: 0.95, amostra: 'Okay! Eu vou falar português com sotaque de Nova York. Muito bom, né?' },
];

export const sotaquePadrao = (): Sotaque => SOTAQUES[0];
export const achaSotaque = (id: string | undefined): Sotaque => SOTAQUES.find((s) => s.id === id) ?? SOTAQUES[0];
