/* O roteiro do RONDIN: o que ele pergunta, em que ordem e como cada resposta vira dado do perfil.
   Ele sempre começa se apresentando e logo depois pergunta o sotaque. No cadastro vêm as perguntas de treino e de vida
   (objetivo, corpo, rotina, alimentação, sono...) e no fim e-mail, senha e aceite. Quem já tem conta ouve "que ótimo" e vê
   os campos de entrada. As respostas são ids estáveis; os rótulos são só o que aparece. */
import type { Estado, PerfilFit } from '../tipos';

export type Opcao = { id: string; rotulo: string; nota?: string; comentario?: string };
export type Respostas = Record<string, string | string[]>;
export type Campo = 'texto' | 'email' | 'senha' | 'numero' | 'data';

/* Uma fala com lugares para o que muda de pessoa para pessoa: "Prazer, {nome}!". `valores` diz o que entra em cada lugar. */
export type Valores = Record<string, string>;
export type Dita = { modelo: string; valores: Valores };
/* Um pedaço de áudio: as partes fixas existem como mp3 pronto; as dinâmicas (nome, quilos) o servidor gera na hora. */
export type Trecho = { texto: string; dinamico: boolean };

export function trechosDe(modelo: string, valores: Valores = {}): { exibir: string; audio: Trecho[] } {
  const exibir = modelo.replace(/\{(\w+)\}/g, (_, k: string) => valores[k] ?? '');
  const audio: Trecho[] = [];
  for (const parte of modelo.split(/(\{\w+\})/)) {
    const m = /^\{(\w+)\}$/.exec(parte);
    if (m) {
      const v = (valores[m[1]] ?? '').trim();
      if (v) audio.push({ texto: v, dinamico: true });
    } else {
      const limpo = parte.replace(/^[\s!?.,;:]+/, '').trim();   // a pontuação que sobra depois do nome não é lida
      if (limpo) audio.push({ texto: limpo, dinamico: false });
    }
  }
  return { exibir, audio };
}

type Base = { id: string; fala: (r: Respostas) => string };
export type Passo =
  | (Base & { tipo: 'fala' })
  | (Base & { tipo: 'sotaque' })
  | (Base & { tipo: 'opcoes'; opcoes: Opcao[]; barra?: (id: string) => string | undefined; links?: boolean })
  | (Base & { tipo: 'multi'; opcoes: Opcao[]; exclusiva?: string })
  | (Base & { tipo: 'campo'; campo: Campo; rotulo: string; sufixo?: string; validar: (v: string, r: Respostas) => string | undefined; comentario?: (v: string, r: Respostas) => Dita | undefined })
  | (Base & { tipo: 'entrar' })     // os campos de e-mail e senha de quem já tem conta
  | (Base & { tipo: 'criar' });     // cria a conta (cadastro)

/* ---------- ajudas de leitura ---------- */
export const emailValido = (v: string): boolean => /^\S+@\S+\.\S+$/.test(v.trim());
export const primeiroNome = (r: Respostas): string => String(r.nome ?? '').trim().split(/\s+/)[0] || 'amigo';
export const numero = (v: string): number => Number(v.replace(',', '.').replace(/[^\d.]/g, ''));

/* DD/MM/AAAA -> AAAA-MM-DD, ou null se a data não existe ou está no futuro */
export function lerData(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(a, mes - 1, d);
  if (data.getFullYear() !== a || data.getMonth() !== mes - 1 || data.getDate() !== d) return null;
  if (a < 1900 || data > new Date()) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
export function idadeDe(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number), h = new Date();
  return h.getFullYear() - a - (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d) ? 1 : 0);
}
export const mascararData = (v: string): string => {
  const n = v.replace(/\D/g, '').slice(0, 8);
  return n.length > 4 ? `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}` : n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
};
export const ehMenor = (r: Respostas): boolean => {
  const iso = lerData(String(r.nascimento ?? ''));
  return iso !== null && idadeDe(iso) < 18;
};

const faixa = (v: string, min: number, max: number, o: string): string | undefined => {
  const n = numero(v);
  return Number.isFinite(n) && n >= min && n <= max ? undefined : o;
};

/* ---------- falas fixas ----------
   As partes fixas viram áudio pronto (scripts/gerar-vozes.mjs); {nome} e {n} são gerados na hora pelo servidor. */
export const COMENTARIO_PESO = {
  manter: 'Você quer manter o peso. Ótimo, vamos proteger isso.',
  pouco: 'É uma diferença pequena. Com constância, a gente chega lá.',
  ganhar: 'São {n} quilos para ganhar. Ganhar peso do jeito certo é treino e comida, e a gente chega lá com constância.',
  perder: 'São {n} quilos para perder. Com calma e constância, a gente chega lá, sem pressa e sem milagre.',
};
export const FALAS = {
  deVolta: 'Bem-vindo de volta, {nome}! Que bom te ver.',
  contaCriada: 'Pronto, {nome}! Sua conta está criada e o seu perfil está salvo. Bem-vindo ao RONDO.',
  emailJaTem: 'Esse e-mail já tem uma conta. Use outro, ou volte e entre com ele.',
  falhaCriar: 'Não consegui criar a conta agora.',
};

/* ---------- as opções ---------- */
const OBJETIVOS: Opcao[] = [
  { id: 'gordura', rotulo: 'Perder gordura', comentario: 'Perder gordura é comigo. Treino e comida andam juntos.' },
  { id: 'massa', rotulo: 'Ganhar massa muscular', comentario: 'Hora de crescer! Vou pensar nisso no seu treino e na sua dieta.' },
  { id: 'forma', rotulo: 'Manter a forma', comentario: 'Manter também dá trabalho. Vamos fazer isso com constância.' },
  { id: 'forca', rotulo: 'Ficar mais forte', comentario: 'Força é o melhor investimento. Bora levantar peso.' },
  { id: 'saude', rotulo: 'Ter mais saúde e disposição', comentario: 'O melhor objetivo de todos. Seu eu do futuro agradece.' },
  { id: 'corrida', rotulo: 'Correr mais e melhor', comentario: 'Pista livre! Vou te acompanhar a cada quilômetro.' },
];

const opc = (...pares: [string, string][]): Opcao[] => pares.map(([id, rotulo]) => ({ id, rotulo }));

/* ---------- o cadastro ---------- */
export function passosCadastro(r: Respostas): Passo[] {
  const p: Passo[] = [
    { id: 'apresentacao', tipo: 'fala', fala: () => 'Oi! Eu sou o RONDIN, o agente do RONDO. Vou te ajudar a criar a sua conta e montar o seu perfil de treino.' },
    { id: 'sotaque', tipo: 'sotaque', fala: () => 'Antes de começar: com qual sotaque você quer que eu fale?' },
    {
      id: 'nome', tipo: 'campo', campo: 'texto', rotulo: 'Seu nome', fala: () => 'Como eu posso te chamar?',
      validar: (v) => (v.trim().length < 2 ? 'Digite o seu nome.' : undefined),
    },
    { id: 'objetivo', tipo: 'opcoes', fala: () => 'Prazer, {nome}! Qual é o seu grande objetivo agora?', opcoes: OBJETIVOS },
    {
      id: 'sexo', tipo: 'opcoes', fala: () => 'Para calcular as suas calorias direitinho, qual destas opções combina com você?',
      opcoes: [{ id: 'm', rotulo: 'Masculino' }, { id: 'f', rotulo: 'Feminino' }, { id: 'nd', rotulo: 'Prefiro não dizer', comentario: 'Tudo bem. Vou usar uma média nas contas.' }],
    },
    {
      id: 'nascimento', tipo: 'campo', campo: 'data', rotulo: 'Nascimento (DD/MM/AAAA)', fala: () => 'Qual é a sua data de nascimento? Pode digitar só os números.',
      validar: (v) => (lerData(v) ? undefined : 'Digite uma data que exista, no formato dia, mês e ano.'),
    },
  ];
  if (ehMenor(r)) {
    p.push(
      {
        id: 'respNome', tipo: 'campo', campo: 'texto', rotulo: 'Nome do responsável',
        fala: () => 'Como você tem menos de dezoito anos, preciso da autorização de um dos seus pais ou responsável. Qual é o nome dele?',
        validar: (v) => (v.trim().length < 2 ? 'Digite o nome do responsável.' : undefined),
      },
      {
        id: 'respEmail', tipo: 'campo', campo: 'email', rotulo: 'E-mail do responsável', fala: () => 'E o e-mail dele?',
        validar: (v) => (!emailValido(v) ? 'Digite um e-mail válido.' : undefined),
      },
      {
        id: 'respAutoriza', tipo: 'opcoes', fala: () => 'O responsável autoriza a criação da sua conta e o uso dos seus dados, como descrito na Política de Privacidade?',
        opcoes: [{ id: 'sim', rotulo: 'Sim, autoriza' }, { id: 'nao', rotulo: 'Ainda não' }],
        barra: (id) => (id === 'sim' ? undefined : 'Sem a autorização do responsável eu não consigo criar a conta. Quando ele estiver com você, é só autorizar.'),
      },
    );
  }
  p.push(
    {
      id: 'altura', tipo: 'campo', campo: 'numero', rotulo: 'Altura', sufixo: 'cm', fala: () => 'Agora o seu corpo. Quantos centímetros de altura você tem?',
      validar: (v) => faixa(v, 120, 230, 'Digite a altura em centímetros, entre 120 e 230.'),
    },
    {
      id: 'peso', tipo: 'campo', campo: 'numero', rotulo: 'Peso atual', sufixo: 'kg', fala: () => 'E quanto você pesa hoje, em quilos?',
      validar: (v) => faixa(v, 30, 300, 'Digite o peso em quilos, entre 30 e 300.'),
    },
    {
      id: 'pesoMeta', tipo: 'campo', campo: 'numero', rotulo: 'Peso que você quer', sufixo: 'kg', fala: () => 'E qual peso você sonha em ter?',
      validar: (v) => faixa(v, 30, 300, 'Digite o peso em quilos, entre 30 e 300.'),
      comentario: (v, rr): Dita => {
        const dif = numero(v) - numero(String(rr.peso ?? 0));
        const d = Math.abs(dif);
        if (d < 0.5) return { modelo: COMENTARIO_PESO.manter, valores: {} };
        if (d < 2) return { modelo: COMENTARIO_PESO.pouco, valores: {} };
        return { modelo: dif > 0 ? COMENTARIO_PESO.ganhar : COMENTARIO_PESO.perder, valores: { n: String(Math.round(d * 10) / 10).replace('.', ',') } };
      },
    },
    {
      id: 'experiencia', tipo: 'opcoes', fala: () => 'Agora o seu treino. Qual é a sua experiência com exercícios?',
      opcoes: [
        { id: 'nunca', rotulo: 'Nunca treinei', comentario: 'Todo mundo começa em algum lugar. Eu vou pegar leve no começo.' },
        { id: 'iniciante', rotulo: 'Iniciante', nota: 'até 6 meses' },
        { id: 'intermediario', rotulo: 'Intermediário', nota: '1 a 3 anos' },
        { id: 'avancado', rotulo: 'Avançado', nota: 'mais de 3 anos', comentario: 'Veterano! Então vamos para o treino de verdade.' },
      ],
    },
    { id: 'dias', tipo: 'opcoes', fala: () => 'Quantos dias por semana você consegue treinar?', opcoes: opc(['2', '2 dias'], ['3', '3 dias'], ['4', '4 dias'], ['5', '5 dias'], ['6', '6 dias']) },
    { id: 'local', tipo: 'opcoes', fala: () => 'Onde você vai treinar?', opcoes: opc(['academia', 'Na academia'], ['casa', 'Em casa'], ['rua', 'Ao ar livre'], ['misto', 'Um pouco de tudo']) },
    {
      id: 'horario', tipo: 'opcoes', fala: () => 'Em que horário você mais gosta de treinar?',
      opcoes: opc(['manha', 'De manhã cedo'], ['tarde', 'À tarde'], ['noite', 'À noite'], ['madrugada', 'Sou coruja, de madrugada'], ['varia', 'Varia bastante']),
    },
    { id: 'duracao', tipo: 'opcoes', fala: () => 'Quanto tempo você tem para cada treino?', opcoes: opc(['30', '30 minutos'], ['45', '45 minutos'], ['60', '1 hora'], ['90', '1 hora e meia ou mais']) },
    {
      id: 'foco', tipo: 'multi', fala: () => 'O que você quer destacar no corpo? Pode escolher mais de uma.',
      opcoes: opc(['peito_braco', 'Peito e braços'], ['costas', 'Costas'], ['pernas', 'Pernas e glúteos'], ['ombros', 'Ombros'], ['abdomen', 'Abdômen'], ['corpo', 'Corpo todo']),
    },
    {
      id: 'lesoes', tipo: 'multi', exclusiva: 'nenhuma', fala: () => 'Tem alguma lesão ou limitação que eu deva saber? Eu cuido do resto.',
      opcoes: opc(['nenhuma', 'Nenhuma'], ['joelho', 'Joelho'], ['ombro', 'Ombro'], ['coluna', 'Coluna'], ['punho', 'Punho ou cotovelo'], ['outra', 'Outra']),
    },
    {
      id: 'dia', tipo: 'opcoes', fala: () => 'Fora do treino, como é o seu dia a dia?',
      opcoes: opc(['sentado', 'Quase sempre sentado'], ['leve', 'Ando um pouco'], ['moderado', 'Em pé e me movimentando'], ['pesado', 'Trabalho pesado, muito ativo']),
    },
    {
      id: 'dieta', tipo: 'opcoes', fala: () => 'E a alimentação, como é?',
      opcoes: opc(['tudo', 'Como de tudo'], ['vegetariano', 'Vegetariano'], ['vegano', 'Vegano'], ['lowcarb', 'Low carb'], ['semlactose', 'Sem lactose'], ['semgluten', 'Sem glúten']),
    },
    {
      id: 'sono', tipo: 'opcoes', fala: () => 'Quantas horas você dorme por noite, mais ou menos?',
      opcoes: [
        { id: 'menos5', rotulo: 'Menos de 5 horas', comentario: 'Dormir pouco atrapalha o resultado. A gente vai cuidar disso também.' },
        { id: '5a6', rotulo: '5 a 6 horas' }, { id: '7a8', rotulo: '7 a 8 horas', comentario: 'Sono em dia, que beleza.' }, { id: 'mais8', rotulo: 'Mais de 8 horas' },
      ],
    },
    { id: 'agua', tipo: 'opcoes', fala: () => 'E de água, quanto você bebe por dia?', opcoes: opc(['menos1', 'Menos de 1 litro'], ['1a2', '1 a 2 litros'], ['2a3', '2 a 3 litros'], ['mais3', 'Mais de 3 litros']) },
    {
      id: 'inimigo', tipo: 'opcoes', fala: () => 'Agora uma pergunta séria: qual é o seu maior inimigo no caminho?',
      opcoes: [
        { id: 'preguica', rotulo: 'A preguiça de manhã' }, { id: 'doce', rotulo: 'O docinho da noite' }, { id: 'tempo', rotulo: 'A falta de tempo' },
        { id: 'desanimo', rotulo: 'O desânimo no meio do caminho' }, { id: 'fds', rotulo: 'O fim de semana' },
      ].map((o) => ({ ...o, comentario: 'Anotado. Vou ficar de olho nesse inimigo junto com você.' })),
    },
    {
      id: 'trilha', tipo: 'opcoes', fala: () => 'Se o seu treino tivesse trilha sonora, qual seria?',
      opcoes: opc(['rock', 'Rock pesado'], ['funk', 'Funk'], ['rap', 'Rap'], ['eletronica', 'Eletrônica'], ['sertanejo', 'Sertanejo'], ['pop', 'Pop'], ['silencio', 'Silêncio total'])
        .map((o) => ({ ...o, comentario: 'Boa escolha. Põe no volume máximo.' })),
    },
    {
      id: 'motivacao', tipo: 'opcoes', fala: () => 'Que tipo de motivação você curte receber de mim?',
      opcoes: opc(['reto', 'Papo reto, sem enrolação'], ['gentil', 'Tranquilo e gentil'], ['treinador', 'Pegada de treinador'], ['humor', 'Com muito humor']),
    },
    {
      id: 'meta90', tipo: 'opcoes', fala: () => 'Imagina daqui a noventa dias. O que você quer ouvir das pessoas?',
      opcoes: opc(['emagreceu', 'Nossa, você emagreceu!'], ['braco', 'Que braço é esse?'], ['energia', 'Você está cheio de energia!'], ['correu', 'Você correu tudo isso?!'], ['forte', 'Você está muito mais forte!'])
        .map((o) => ({ ...o, comentario: 'Combinado. É essa frase que a gente vai buscar.' })),
    },
    {
      id: 'email', tipo: 'campo', campo: 'email', rotulo: 'E-mail', fala: () => 'Beleza, {nome}! Falta pouco. Agora a conta: qual é o seu e-mail?',
      validar: (v) => (!emailValido(v) ? 'Digite um e-mail válido.' : undefined),
    },
    {
      id: 'senha', tipo: 'campo', campo: 'senha', rotulo: 'Senha', fala: () => 'Escolha uma senha com pelo menos seis caracteres. Prometo que não conto pra ninguém.',
      validar: (v) => (v.length < 6 ? 'A senha precisa de pelo menos 6 caracteres.' : undefined),
    },
    {
      id: 'termos', tipo: 'opcoes', links: true,
      fala: () => 'Última etapa. Preciso que você aceite os Termos de Uso e a Política de Privacidade, e autorize o uso dos seus dados de saúde, como peso e treinos, para o app funcionar. Você aceita?',
      opcoes: [{ id: 'aceito', rotulo: 'Aceito' }, { id: 'ler', rotulo: 'Quero ler antes' }],
      barra: (id) => (id === 'aceito' ? undefined : 'Claro, leia com calma pelos links aqui embaixo. Quando terminar, é só tocar em aceito.'),
    },
    { id: 'marketing', tipo: 'opcoes', fala: () => 'Posso te mandar novidades do RONDO por e-mail? É opcional.', opcoes: [{ id: 'sim', rotulo: 'Pode mandar' }, { id: 'nao', rotulo: 'Prefiro que não' }] },
    { id: 'criar', tipo: 'criar', fala: () => 'Perfeito, {nome}! Estou montando a sua conta e o seu perfil agora.' },
  );
  return p;
}

/* ---------- entrar na conta ---------- */
export function passosEntrar(): Passo[] {
  return [
    { id: 'apresentacao', tipo: 'fala', fala: () => 'Oi! Eu sou o RONDIN, o agente do RONDO.' },
    { id: 'sotaque', tipo: 'sotaque', fala: () => 'Antes de entrar: com qual sotaque você quer que eu fale?' },
    { id: 'entrar', tipo: 'entrar', fala: () => 'Que ótimo! Então é só entrar com o seu e-mail e a sua senha.' },
  ];
}

/* ---------- das respostas ao perfil salvo no banco ---------- */
const um = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] ?? '' : v ?? '');
const lista = (v: string | string[] | undefined): string[] => (Array.isArray(v) ? v : v ? [v] : []);

const ATIVIDADE: Record<string, number> = { sentado: 1.2, leve: 1.375, moderado: 1.55, pesado: 1.725 };
const META_CALORICA: Record<string, number> = { gordura: 0.85, massa: 1.1, forca: 1.1, forma: 1, saude: 1, corrida: 1 };

/* Devolve o que entra no estado do app (e daí no servidor, na tabela de dados da pessoa): o perfil que o app já usa nas
   contas de calorias, o perfil completo do RONDIN e o primeiro registro de peso. */
export function montarPerfil(r: Respostas, sotaque: string, hoje: Date = new Date()): Pick<Estado, 'perfil' | 'perfilFit' | 'pesos'> {
  const nasc = lerData(um(r.nascimento));
  const peso = Math.round(numero(um(r.peso)) * 10) / 10;
  const sexo = (um(r.sexo) as PerfilFit['sexo']) || 'nd';
  const dataIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const fit: PerfilFit = {
    sotaque, objetivo: um(r.objetivo), sexo, altura: Math.round(numero(um(r.altura))), peso,
    pesoMeta: Math.round(numero(um(r.pesoMeta)) * 10) / 10,
    experiencia: um(r.experiencia), diasSemana: Number(um(r.dias)) || 3, local: um(r.local), duracao: Number(um(r.duracao)) || 60,
    horario: um(r.horario), foco: lista(r.foco), lesoes: lista(r.lesoes), dia: um(r.dia), dieta: um(r.dieta), sono: um(r.sono),
    agua: um(r.agua), trilha: um(r.trilha), motivacao: um(r.motivacao), inimigo: um(r.inimigo), meta90: um(r.meta90),
    criadoEm: hoje.toISOString(),
  };
  return {
    perfil: {
      sexo: sexo === 'f' ? 'f' : 'm',   // as contas de calorias só têm duas fórmulas; "prefiro não dizer" usa a masculina como média
      idade: nasc ? idadeDe(nasc) : 28, peso, altura: fit.altura,
      atividade: ATIVIDADE[fit.dia] ?? 1.55, objetivo: META_CALORICA[fit.objetivo] ?? 1,
    },
    perfilFit: fit,
    pesos: [{ data: dataIso, kg: peso }],
  };
}


/* Todas as frases que o RONDIN pode dizer (sem as amostras de sotaque, que são de cada voz). O gerador de vozes usa esta
   lista; o que não estiver aqui cai na voz do aparelho (ex.: mensagens de erro vindas do servidor). */
export function listarFalas(): string[] {
  const achadas = new Set<string>();
  /* só as partes fixas viram áudio pronto; os lugares de nome e número ficam de fora */
  const add = (modelo: string | undefined) => {
    if (modelo) trechosDe(modelo, { nome: 'X', n: 'X' }).audio.filter((t) => !t.dinamico).forEach((t) => achadas.add(t.texto));
  };
  const listas = [passosCadastro({}), passosCadastro({ nascimento: '01/01/2012' }), passosEntrar()];
  for (const lista of listas) {
    for (const p of lista) {
      add(p.fala({}));
      if (p.tipo === 'opcoes') { p.opcoes.forEach((o) => { add(o.comentario); add(p.barra?.(o.id)); }); }
      if (p.tipo === 'multi') p.opcoes.forEach((o) => add(o.comentario));
      if (p.tipo === 'campo') for (const teste of ['', 'x', '0', '1', '999', 'a@', '31/02/2020']) add(p.validar(teste, {}));
    }
  }
  Object.values(COMENTARIO_PESO).forEach(add);
  Object.values(FALAS).forEach(add);
  add('Digite um e-mail válido.'); add('A senha tem pelo menos 6 caracteres.');
  return [...achadas];
}
