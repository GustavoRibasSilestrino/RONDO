/* As perguntas do dia do RONDIN. São perguntas de filosofia, feitas para a pessoa parar e pensar (e não só "como foi o treino"):
   o tempo, o corpo, a escolha, o esforço, o arrependimento, quem a gente é quando ninguém está olhando.
   A mesma pergunta para todo mundo no mesmo dia (a lista gira por dia). Cada uma traz uma segunda pergunta (`seguir`), que o
   RONDIN faz depois da primeira resposta, para a conversa ir mais fundo. Três línguas, as mesmas da conversa dele.
   Arquivo de dados puros (sem dependências do app), para poder ser conferido por scripts/testar-rondin.mjs. */
import type { Idioma } from './rondinSotaques.ts';

export type Pergunta = Record<Idioma, string> & { seguir: Record<Idioma, string> };

export const PERGUNTAS_DO_DIA: Pergunta[] = [
  {
    pt: 'Se este dia se repetisse para sempre, você ainda o escolheria?',
    en: 'If this day repeated forever, would you still choose it?',
    es: 'Si este día se repitiera para siempre, ¿lo elegirías de nuevo?',
    seguir: { pt: 'O que, neste dia, você mudaria primeiro?', en: 'What is the first thing you would change about it?', es: '¿Qué es lo primero que cambiarías de él?' },
  },
  {
    pt: 'Quem você seria se ninguém nunca tivesse esperado nada de você?',
    en: 'Who would you be if no one had ever expected anything of you?',
    es: '¿Quién serías si nadie hubiera esperado nunca nada de ti?',
    seguir: { pt: 'Qual parte dessa pessoa você tem coragem de ser já?', en: 'Which part of that person do you have the courage to be right now?', es: '¿Qué parte de esa persona tienes el valor de ser ya?' },
  },
  {
    pt: 'O que você faz por obrigação e chama de escolha?',
    en: 'What do you do out of obligation and call it a choice?',
    es: '¿Qué haces por obligación y llamas elección?',
    seguir: { pt: 'E o que aconteceria se você parasse de fazer isso por um mês?', en: 'And what would happen if you stopped doing it for a month?', es: '¿Y qué pasaría si dejaras de hacerlo durante un mes?' },
  },
  {
    pt: 'Se o seu corpo fosse um velho amigo, ele diria que você o trata com respeito?',
    en: 'If your body were an old friend, would it say you treat it with respect?',
    es: 'Si tu cuerpo fuera un viejo amigo, ¿diría que lo tratas con respeto?',
    seguir: { pt: 'O que ele pediria a você hoje, se pudesse falar?', en: 'What would it ask of you today, if it could speak?', es: '¿Qué te pediría hoy, si pudiera hablar?' },
  },
  {
    pt: 'O que você está adiando para um futuro que talvez nunca chegue?',
    en: 'What are you postponing for a future that may never arrive?',
    es: '¿Qué estás aplazando para un futuro que quizá nunca llegue?',
    seguir: { pt: 'Qual seria o menor passo possível, ainda hoje?', en: 'What would be the smallest possible step, still today?', es: '¿Cuál sería el paso más pequeño posible, aún hoy?' },
  },
  {
    pt: 'Qual é a diferença entre estar ocupado e estar vivo?',
    en: 'What is the difference between being busy and being alive?',
    es: '¿Cuál es la diferencia entre estar ocupado y estar vivo?',
    seguir: { pt: 'Em que momento desta semana você esteve realmente vivo?', en: 'When this week were you truly alive?', es: '¿En qué momento de esta semana estuviste de verdad vivo?' },
  },
  {
    pt: 'De que você já se arrependeu e que, no fim, fez de você quem você é?',
    en: 'What did you once regret that ended up making you who you are?',
    es: '¿De qué te arrepentiste alguna vez y que, al final, te hizo quien eres?',
    seguir: { pt: 'Você faria tudo igual se pudesse voltar?', en: 'Would you do it all the same if you could go back?', es: '¿Lo harías todo igual si pudieras volver?' },
  },
  {
    pt: 'Se o você de dez anos atrás pudesse te ver agora, o que sentiria?',
    en: 'If the you of ten years ago could see you now, what would they feel?',
    es: 'Si el tú de hace diez años pudiera verte ahora, ¿qué sentiría?',
    seguir: { pt: 'E o que o você de daqui a dez anos gostaria que você começasse hoje?', en: 'And what would the you of ten years from now want you to start today?', es: '¿Y qué querría el tú de dentro de diez años que empezaras hoy?' },
  },
  {
    pt: 'O que você precisaria deixar de ser para se tornar quem diz que quer ser?',
    en: 'What would you have to stop being to become who you say you want to be?',
    es: '¿Qué tendrías que dejar de ser para convertirte en quien dices querer ser?',
    seguir: { pt: 'O que ainda te prende a essa versão antiga?', en: 'What still holds you to that old version?', es: '¿Qué te ata todavía a esa versión antigua?' },
  },
  {
    pt: 'Quando foi a última vez que você fez algo difícil só porque era o certo?',
    en: 'When was the last time you did something hard simply because it was right?',
    es: '¿Cuándo fue la última vez que hiciste algo difícil solo porque era lo correcto?',
    seguir: { pt: 'Como você se sentiu depois, quando ninguém estava olhando?', en: 'How did you feel afterwards, when no one was watching?', es: '¿Cómo te sentiste después, cuando nadie miraba?' },
  },
  {
    pt: 'Você se esforça para ser melhor ou para ser aceito?',
    en: 'Do you strive to be better, or to be accepted?',
    es: '¿Te esfuerzas por ser mejor o por ser aceptado?',
    seguir: { pt: 'Se ninguém nunca soubesse, você continuaria?', en: 'If no one ever knew, would you keep going?', es: 'Si nadie lo supiera nunca, ¿seguirías?' },
  },
  {
    pt: 'O que seria suficiente para você? E por que ainda não é?',
    en: 'What would be enough for you? And why is it not enough yet?',
    es: '¿Qué sería suficiente para ti? ¿Y por qué todavía no lo es?',
    seguir: { pt: 'Quem decidiu o tamanho desse "suficiente"?', en: 'Who decided how big "enough" should be?', es: '¿Quién decidió el tamaño de ese "suficiente"?' },
  },
  {
    pt: 'Se a disciplina é uma forma de amor-próprio, como você tem se amado esta semana?',
    en: 'If discipline is a form of self-love, how have you loved yourself this week?',
    es: 'Si la disciplina es una forma de amor propio, ¿cómo te has querido esta semana?',
    seguir: { pt: 'E onde o seu amor-próprio virou só cobrança?', en: 'And where has your self-love turned into mere demand?', es: '¿Y dónde tu amor propio se ha vuelto pura exigencia?' },
  },
  {
    pt: 'O que você levaria a sério se soubesse que ninguém ia te julgar?',
    en: 'What would you take seriously if you knew no one would judge you?',
    es: '¿Qué tomarías en serio si supieras que nadie te va a juzgar?',
    seguir: { pt: 'O que te impede de começar hoje, mesmo assim?', en: 'What stops you from starting today anyway?', es: '¿Qué te impide empezar hoy de todos modos?' },
  },
];

/* o número do dia no calendário local (o mesmo para todo mundo que está na mesma data) */
const numeroDoDia = (d: Date): number => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);

/* a pergunta de um dia: `deslocamento` pula para as seguintes (quem tem o PRO e quer conversar de novo no mesmo dia) */
export const indiceDaPergunta = (d: Date = new Date(), deslocamento = 0): number => (numeroDoDia(d) + deslocamento) % PERGUNTAS_DO_DIA.length;

export const perguntaDoDia = (idioma: Idioma, d: Date = new Date(), deslocamento = 0): string => PERGUNTAS_DO_DIA[indiceDaPergunta(d, deslocamento)][idioma];
