/* A conversa do RONDIN no recado do dia, nas três línguas dele (pt, en, es). Dados e funções puras, sem dependências do app,
   para scripts/testar-rondin.mjs poder conferir tudo (as três línguas têm os mesmos textos, o eco da palavra, o humor...).

   Como a conversa funciona: o RONDIN faz a pergunta do dia (lib/perguntas.ts), a pessoa responde em voz alta, ele reage e faz a
   segunda pergunta, a pessoa responde de novo e ele encerra. A reação não vem de uma IA: é um roteiro. Quando o navegador
   consegue transcrever a resposta (só com a voz do RONDIN ligada nas configurações), ele repete uma palavra que a pessoa usou
   e percebe se o tom foi leve ou pesado; sem a transcrição, a reação é a mais geral, sem fingir que entendeu. A transcrição
   existe só na memória, durante a conversa: não é guardada em lugar nenhum. */
import type { Idioma } from './rondinSotaques.ts';

export type TextosConversa = {
  ui: {
    responder: string; agoraNao: string; parar: string; gravando: string; terminar: string; guardar: string; descartar: string;
    ouvir: string; pararOuvir: string; diario: string; abrirDiario: string; voltar: string; entrar: string; fechar: string;
    outraPergunta: string; semMicrofone: string; erroGravar: string; limite: string; falarAgora: string; ouvindo: string;
    pularFala: string; repetirFala: string; ativarVoz: string; mantenhaOff: string; falarRecado: string;
    sairTitulo: string; sairTexto: string; sairDescartar: string; ficar: string;
  };
  falas: {
    jaHoje: string; guardado: string; descartado: string; naoResponder: string; chamado: string;
    convite: string;        // o convite a chamar o RONDIN pela voz (uma vez, na chegada)
    saudacao: (nome: string, hora: number) => string;
  };
  reacao: { neutras: string[]; curtas: string[]; positivas: string[]; negativas: string[]; eco: (palavra: string) => string };
  fechamento: string[];     // depois da segunda resposta
  encerrar: string[];       // quando a pessoa termina depois da primeira
};

const periodo = (hora: number, manha: string, tarde: string, noite: string) => (hora < 12 ? manha : hora < 18 ? tarde : noite);

export const CONVERSA: Record<Idioma, TextosConversa> = {
  pt: {
    ui: {
      responder: 'Responder', agoraNao: 'Agora não', parar: 'Parar', gravando: 'Gravando… toque para parar', terminar: 'Terminar por aqui',
      guardar: 'Guardar no diário', descartar: 'Descartar', ouvir: 'Ouvir o que gravei', pararOuvir: 'Parar', diario: 'Diário de recados',
      abrirDiario: 'Abrir o diário', voltar: 'Voltar', entrar: 'Entrar', fechar: 'Fechar', outraPergunta: 'Outra pergunta',
      semMicrofone: 'Preciso do microfone para ouvir você. Libere o acesso nas configurações do aparelho ou do navegador.',
      erroGravar: 'Não consegui gravar agora. Tente de novo.', limite: 'Chegou a um minuto. Parei a gravação por aqui.',
      falarAgora: 'Pode falar, estou ouvindo.', ouvindo: 'Ouvindo', pularFala: 'Pular a fala', repetirFala: 'Repetir a fala',
      ativarVoz: 'Ativar', mantenhaOff: 'Agora não', falarRecado: 'Falar o recado do dia',
      sairTitulo: 'Sair sem guardar?', sairTexto: 'As respostas que você gravou agora serão descartadas.', sairDescartar: 'Sair e descartar', ficar: 'Continuar aqui',
    },
    falas: {
      jaHoje: 'Hoje nós já conversamos. Amanhã eu volto com uma nova pergunta. Quer ouvir o que você disse?',
      guardado: 'Guardei no seu diário. Daqui a um tempo, vale ouvir de novo.',
      descartado: 'Tudo bem, descartei. Algumas respostas são só para o momento.',
      naoResponder: 'Tudo bem. A pergunta fica com você; pense nela durante o dia.',
      chamado: 'Oi, estou aqui. O que você quer fazer?',
      convite: 'Se quiser, eu posso ficar ouvindo. É só dizer "Olá Rondin" e eu apareço. O navegador usa o microfone para isso.',
      saudacao: (nome, hora) => `${periodo(hora, 'Bom dia', 'Boa tarde', 'Boa noite')}${nome ? `, ${nome}` : ''}. Bom te ver.`,
    },
    reacao: {
      neutras: [
        'Obrigado por dizer isso em voz alta. Pensar já é metade do caminho.',
        'Interessante. Quando a gente fala, ouve o próprio pensamento de outro jeito.',
        'Não é uma resposta simples, e ainda bem. As boas perguntas não têm pressa.',
        'Entendi. Deixe essa ideia ficar com você um pouco.',
      ],
      curtas: ['Foi curto, mas às vezes o essencial cabe em poucas palavras.', 'Poucas palavras, e talvez as certas.'],
      positivas: ['Dá para ouvir que isso te faz bem.', 'Que bom ouvir isso. Guarde essa sensação.'],
      negativas: ['Parece pesar um pouco. Obrigado por confiar isso a mim.', 'Não deve ser fácil dizer isso. Fico feliz que você tenha dito.'],
      eco: (p) => `Você falou em "${p}". Fique um instante com essa palavra.`,
    },
    fechamento: [
      'Foi uma boa conversa. Quer guardar no seu diário, para ouvir mais tarde?',
      'Obrigado por pensar comigo hoje. Quer guardar essas respostas no diário ou deixar para lá?',
    ],
    encerrar: ['Tudo bem, por hoje chega. Quer guardar essa resposta no diário?'],
  },
  en: {
    ui: {
      responder: 'Answer', agoraNao: 'Not now', parar: 'Stop', gravando: 'Recording… tap to stop', terminar: "Let's stop here",
      guardar: 'Save in the diary', descartar: 'Discard', ouvir: 'Listen to what I recorded', pararOuvir: 'Stop', diario: 'Voice diary',
      abrirDiario: 'Open the diary', voltar: 'Back', entrar: 'Enter', fechar: 'Close', outraPergunta: 'Another question',
      semMicrofone: 'I need the microphone to hear you. Allow access in your device or browser settings.',
      erroGravar: 'I could not record right now. Please try again.', limite: 'One minute reached. I stopped the recording here.',
      falarAgora: 'Go ahead, I am listening.', ouvindo: 'Listening', pularFala: 'Skip', repetirFala: 'Repeat',
      ativarVoz: 'Turn on', mantenhaOff: 'Not now', falarRecado: "Answer today's question",
      sairTitulo: 'Leave without saving?', sairTexto: 'The answers you just recorded will be discarded.', sairDescartar: 'Leave and discard', ficar: 'Stay here',
    },
    falas: {
      jaHoje: 'We already talked today. I will be back tomorrow with a new question. Would you like to hear what you said?',
      guardado: 'Saved in your diary. In a while, it is worth listening again.',
      descartado: 'All right, I let it go. Some answers are only for the moment.',
      naoResponder: 'No problem. The question stays with you; think about it during the day.',
      chamado: 'Hi, I am here. What would you like to do?',
      convite: 'If you like, I can keep listening. Just say "Hello Rondin" and I will appear. Your browser uses the microphone for that.',
      saudacao: (nome, hora) => `${periodo(hora, 'Good morning', 'Good afternoon', 'Good evening')}${nome ? `, ${nome}` : ''}. Good to see you.`,
    },
    reacao: {
      neutras: [
        'Thank you for saying that out loud. Thinking about it is already half the way.',
        'Interesting. When we speak, we hear our own thoughts differently.',
        'That is not a simple answer, and that is good. Good questions are in no hurry.',
        'I see. Let that idea stay with you for a while.',
      ],
      curtas: ['Short, but sometimes the essence fits in a few words.', 'Few words, and maybe the right ones.'],
      positivas: ['I can hear that this feels good to you.', 'Good to hear. Hold on to that feeling.'],
      negativas: ['That seems to weigh on you. Thank you for trusting me with it.', 'It cannot be easy to say. I am glad you said it.'],
      eco: (p) => `You mentioned "${p}". Stay with that word for a moment.`,
    },
    fechamento: [
      'That was a good conversation. Would you like to save it in your diary, to listen to later?',
      'Thank you for thinking with me today. Save these answers in your diary, or let them go?',
    ],
    encerrar: ['All right, that is enough for today. Would you like to save this answer in your diary?'],
  },
  es: {
    ui: {
      responder: 'Responder', agoraNao: 'Ahora no', parar: 'Parar', gravando: 'Grabando… toca para parar', terminar: 'Terminar aquí',
      guardar: 'Guardar en el diario', descartar: 'Descartar', ouvir: 'Escuchar lo que grabé', pararOuvir: 'Parar', diario: 'Diario de recados',
      abrirDiario: 'Abrir el diario', voltar: 'Volver', entrar: 'Entrar', fechar: 'Cerrar', outraPergunta: 'Otra pregunta',
      semMicrofone: 'Necesito el micrófono para escucharte. Permite el acceso en la configuración del dispositivo o del navegador.',
      erroGravar: 'No pude grabar ahora. Inténtalo de nuevo.', limite: 'Llegó a un minuto. Detuve la grabación aquí.',
      falarAgora: 'Habla, te escucho.', ouvindo: 'Escuchando', pularFala: 'Saltar', repetirFala: 'Repetir',
      ativarVoz: 'Activar', mantenhaOff: 'Ahora no', falarRecado: 'Responder la pregunta del día',
      sairTitulo: '¿Salir sin guardar?', sairTexto: 'Las respuestas que acabas de grabar se descartarán.', sairDescartar: 'Salir y descartar', ficar: 'Quedarme aquí',
    },
    falas: {
      jaHoje: 'Hoy ya hablamos. Mañana vuelvo con una nueva pregunta. ¿Quieres escuchar lo que dijiste?',
      guardado: 'Guardado en tu diario. Dentro de un tiempo, vale la pena escucharlo otra vez.',
      descartado: 'Está bien, lo descarté. Algunas respuestas son solo para el momento.',
      naoResponder: 'Sin problema. La pregunta se queda contigo; piénsala durante el día.',
      chamado: 'Hola, aquí estoy. ¿Qué quieres hacer?',
      convite: 'Si quieres, puedo quedarme escuchando. Solo di "Hola Rondin" y aparezco. El navegador usa el micrófono para eso.',
      saudacao: (nome, hora) => `${periodo(hora, 'Buenos días', 'Buenas tardes', 'Buenas noches')}${nome ? `, ${nome}` : ''}. Qué bueno verte.`,
    },
    reacao: {
      neutras: [
        'Gracias por decirlo en voz alta. Pensar ya es la mitad del camino.',
        'Interesante. Cuando hablamos, escuchamos nuestro propio pensamiento de otra manera.',
        'No es una respuesta simple, y qué bueno. Las buenas preguntas no tienen prisa.',
        'Entiendo. Deja que esa idea se quede contigo un rato.',
      ],
      curtas: ['Fue corto, pero a veces lo esencial cabe en pocas palabras.', 'Pocas palabras, y quizá las justas.'],
      positivas: ['Se nota que eso te hace bien.', 'Qué bueno oírlo. Guarda esa sensación.'],
      negativas: ['Parece pesarte un poco. Gracias por confiármelo.', 'No debe de ser fácil decirlo. Me alegra que lo hayas dicho.'],
      eco: (p) => `Hablaste de "${p}". Quédate un instante con esa palabra.`,
    },
    fechamento: [
      'Fue una buena conversación. ¿Quieres guardarla en tu diario para escucharla más tarde?',
      'Gracias por pensar conmigo hoy. ¿Guardas estas respuestas en tu diario o las dejamos ir?',
    ],
    encerrar: ['Está bien, por hoy basta. ¿Quieres guardar esta respuesta en tu diario?'],
  },
};

/* minúsculas, sem acentos nem pontuação, com espaços simples: a forma usada para comparar o que a pessoa disse */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export const escolher = <T,>(lista: T[], semente: number): T => lista[Math.abs(Math.floor(semente)) % lista.length];

/* palavras comuns e compridas demais para valer um eco ("porque", "sempre"...) */
const COMUNS: Record<Idioma, Set<string>> = {
  pt: new Set(['porque', 'entao', 'tambem', 'assim', 'ainda', 'sempre', 'nunca', 'muito', 'quando', 'sobre', 'depois', 'antes', 'coisas', 'estava', 'estou', 'fazer', 'algum', 'alguma', 'mesmo', 'minha', 'tenho', 'talvez', 'agora', 'todos', 'todas', 'quase', 'acho', 'estamos', 'tinha', 'fazendo', 'gostaria']),
  en: new Set(['because', 'before', 'after', 'always', 'though', 'really', 'things', 'thing', 'would', 'should', 'could', 'where', 'which', 'about', 'think', 'maybe', 'something', 'nothing', 'everything', 'another', 'myself', 'there', 'their', 'still', 'being', 'having', 'doing']),
  es: new Set(['porque', 'entonces', 'tambien', 'siempre', 'nunca', 'mucho', 'cuando', 'sobre', 'despues', 'antes', 'cosas', 'estaba', 'estoy', 'hacer', 'mismo', 'tengo', 'quizas', 'ahora', 'todos', 'todas', 'algun', 'alguna', 'tenia', 'haciendo']),
};

/* começos de palavras que dizem como a pessoa se sente */
const HUMOR: Record<Idioma, { bom: string[]; ruim: string[] }> = {
  pt: {
    bom: ['feliz', 'alegr', 'orgulh', 'gratid', 'grato', 'grata', 'paz', 'amor', 'tranquil', 'leve', 'conquist', 'forte', 'esperanc', 'animad', 'realizad', 'satisfeit'],
    ruim: ['trist', 'cansad', 'medo', 'ansios', 'ansied', 'culpa', 'raiva', 'sozinh', 'solidao', 'estress', 'pesad', 'dificil', 'preocup', 'vazio', 'frustr', 'dor', 'perdid', 'exaust'],
  },
  en: {
    bom: ['happy', 'proud', 'grateful', 'peace', 'love', 'calm', 'light', 'strong', 'hope', 'joy', 'glad', 'fulfill', 'satisf'],
    ruim: ['sad', 'tired', 'afraid', 'fear', 'anxi', 'guilt', 'angry', 'alone', 'lonel', 'stress', 'heavy', 'hard', 'worr', 'empty', 'pain', 'lost', 'exhaust', 'frustrat'],
  },
  es: {
    bom: ['feliz', 'alegr', 'orgull', 'gratitud', 'agradecid', 'paz', 'amor', 'tranquil', 'ligero', 'fuerte', 'esperanz', 'content', 'satisfech'],
    ruim: ['trist', 'cansad', 'miedo', 'ansios', 'ansied', 'culpa', 'enfad', 'soledad', 'estres', 'pesad', 'dificil', 'preocup', 'vacio', 'frustr', 'dolor', 'perdid', 'agotad'],
  },
};

/* a palavra mais longa que não é comum, com as letras do jeito que a pessoa disse (sem a pontuação) */
export function palavraChave(texto: string, idioma: Idioma): string | null {
  let melhor: string | null = null;
  for (const bruta of texto.toLowerCase().split(/\s+/)) {
    const p = bruta.replace(/[^\p{L}\p{N}-]/gu, '');
    if (p.length < 6 || COMUNS[idioma].has(normalizar(p))) continue;
    if (!melhor || p.length > melhor.length) melhor = p;
  }
  return melhor;
}

export function humor(texto: string, idioma: Idioma): 'bom' | 'ruim' | 'neutro' {
  const palavras = normalizar(texto).split(' ').filter(Boolean);
  const h = HUMOR[idioma];
  const bom = palavras.filter((p) => h.bom.some((s) => p.startsWith(s))).length;
  const ruim = palavras.filter((p) => h.ruim.some((s) => p.startsWith(s))).length;
  return bom === ruim ? 'neutro' : bom > ruim ? 'bom' : 'ruim';
}

/* a reação a uma resposta. `texto` é a transcrição, quando existe; sem ela vale a reação geral. `semente` varia a frase de um
   dia para o outro (e de uma resposta para a outra) sem sorteio, para ser sempre a mesma no mesmo dia. */
export function reagir(idioma: Idioma, texto: string | undefined, semente: number): string {
  const r = CONVERSA[idioma].reacao;
  const palavras = texto ? normalizar(texto).split(' ').filter(Boolean) : [];
  if (palavras.length === 0) return escolher(r.neutras, semente);
  if (palavras.length <= 3) return escolher(r.curtas, semente);
  const h = humor(texto as string, idioma);
  const chave = palavraChave(texto as string, idioma);
  const tom = h === 'bom' ? escolher(r.positivas, semente) : h === 'ruim' ? escolher(r.negativas, semente) : null;
  if (tom && chave && semente % 2 === 0) return `${tom} ${r.eco(chave)}`;
  if (tom) return tom;
  if (chave) return r.eco(chave);
  return escolher(r.neutras, semente);
}

/* o que ele diz depois da última resposta: a reação e a pergunta se quer guardar */
export function encerrarConversa(idioma: Idioma, texto: string | undefined, semente: number, cedo: boolean): string[] {
  const c = CONVERSA[idioma];
  return [reagir(idioma, texto, semente), escolher(cedo ? c.encerrar : c.fechamento, semente)];
}

export const saudacao = (idioma: Idioma, nome: string, hora: number): string => CONVERSA[idioma].falas.saudacao(nome, hora);
