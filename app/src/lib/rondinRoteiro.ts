/* O roteiro do RONDIN: o que ele pergunta, em que ordem e como cada resposta vira dado do perfil.
   Ele começa perguntando a língua (português, inglês ou espanhol) e conversa nela até o fim: os textos de cada língua
   estão em rondinTextos.ts, aqui só ficam a ordem das perguntas e os ids das respostas, que são os mesmos nas três.
   No cadastro vêm só as perguntas essenciais (objetivo, corpo, treino, rotina) e no fim e-mail, senha e aceite. Quem já
   tem conta vê os campos de entrada. As respostas são ids estáveis; os rótulos são só o que aparece. */
import type { Estado, PerfilFit } from '../tipos';
import type { Idioma } from './rondinSotaques';
import { TEXTOS, type Textos } from './rondinTextos.ts';
import { CONVERSA } from './rondinConversa.ts';
import { PERGUNTAS_DO_DIA } from './perguntas.ts';

export type Opcao = { id: string; rotulo: string; nota?: string; comentario?: string };
export type Respostas = Record<string, string | string[]>;
export type Campo = 'texto' | 'email' | 'senha' | 'numero' | 'data';

/* Uma fala com lugares para o que muda de pessoa para pessoa: "Prazer, {nome}!". `valores` diz o que entra em cada lugar. */
export type Valores = Record<string, string>;
export type Dita = { modelo: string; valores: Valores };
/* Um pedaço de áudio: as partes fixas existem como mp3 pronto. As dinâmicas (nome, números) não são mais faladas
   (ficam só na legenda); o tipo ainda aceita `dinamico` para quem chamar a voz com um trecho próprio. */
export type Trecho = { texto: string; dinamico: boolean };

export function trechosDe(modelo: string, valores: Valores = {}): { exibir: string; audio: Trecho[] } {
  const exibir = modelo.replace(/\{(\w+)\}/g, (_, k: string) => valores[k] ?? '');
  const audio: Trecho[] = [];
  for (const parte of modelo.split(/(\{\w+\})/)) {
    const m = /^\{(\w+)\}$/.exec(parte);
    if (m) {
      /* desde 2026-11-13 o RONDIN não fala o nome nem os números (pedido do dono): a voz diz só "Prazer!", com a voz
         gravada (Will, da ElevenLabs), e o nome aparece na legenda. Assim nenhum nome vai para um serviço de voz e a
         fala não espera o servidor. */
      continue;
    } else {
      const limpo = parte.replace(/^[\s!?.,;:¡¿]+/, '').trim();   // a pontuação que sobra depois do nome não é lida
      if (limpo) audio.push({ texto: limpo, dinamico: false });
    }
  }
  return { exibir, audio };
}

/* Uma frase pronta (já com o que muda de pessoa para pessoa) virando áudio. O que é da pessoa não é falado, fica só na
   legenda: as palavras entre aspas (o "eco" de uma palavra que ela disse) e o que vier em `ocultar` (o nome dela). Quando há
   algo assim, a frase é dividida em sentenças, para cada sentença fixa ter o seu áudio gravado. O gerador de vozes passa as
   frases pelo mesmo caminho, então o que se grava é exatamente o que se toca. */
export function trechosParaVoz(texto: string, ocultar: string[] = []): Trecho[] {
  const nomes = ocultar.map((n) => n.trim()).filter((n) => n.length > 1);
  const temAspas = /"[^"]*"/.test(texto);
  const temNome = nomes.some((n) => texto.includes(n));
  if (!temAspas && !temNome) return [{ texto, dinamico: false }];
  let modelo = texto.replace(/"[^"]*"/g, '{x}');
  for (const n of nomes) modelo = modelo.split(n).join('{x}');
  return modelo.split(/(?<=[.!?])\s+/).flatMap((frase) => trechosDe(frase).audio);
}

type Base = { id: string; fala: (r: Respostas) => string };
export type Passo =
  | (Base & { tipo: 'fala' })
  | (Base & { tipo: 'idioma' })     // a escolha da língua: português, inglês ou espanhol
  | (Base & { tipo: 'opcoes'; opcoes: Opcao[]; barra?: (id: string) => string | undefined; links?: boolean })
  | (Base & { tipo: 'multi'; opcoes: Opcao[]; exclusiva?: string; todas?: string })   // `exclusiva`: desmarca as outras; `todas`: marca todas as outras
  | (Base & { tipo: 'campo'; campo: Campo; rotulo: string; sufixo?: string; validar: (v: string, r: Respostas) => string | undefined; comentario?: (v: string, r: Respostas) => Dita | undefined })
  | (Base & { tipo: 'entrar' })     // os campos de e-mail e senha de quem já tem conta
  | (Base & { tipo: 'criar' });     // cria a conta (cadastro)

/* ---------- ajudas de leitura ---------- */
export const emailValido = (v: string): boolean => /^\S+@\S+\.\S+$/.test(v.trim());
export const primeiroNome = (r: Respostas, idioma: Idioma = 'pt'): string => String(r.nome ?? '').trim().split(/\s+/)[0] || TEXTOS[idioma].amigo;
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

/* As falas soltas (conta criada, nome em uso...) na língua da conversa. */
export const falasDe = (idioma: Idioma): Textos['falas'] => TEXTOS[idioma].falas;

/* as opções de um grupo, na ordem dos ids: o rótulo, a nota e o comentário vêm do texto da língua */
const opcoes = (t: Textos, grupo: string, ids: string[]): Opcao[] =>
  ids.map((id) => ({ id, rotulo: t.op[`${grupo}.${id}`], nota: t.nota[`${grupo}.${id}`], comentario: t.com[`${grupo}.${id}`] }));

/* ---------- o cadastro ---------- */
export function passosCadastro(r: Respostas, idioma: Idioma): Passo[] {
  const t = TEXTOS[idioma], f = t.fala, e = t.erro;
  const p: Passo[] = [
    { id: 'idioma', tipo: 'idioma', fala: () => f.idioma },
    {
      id: 'nome', tipo: 'campo', campo: 'texto', rotulo: t.campo.nome, fala: () => f.nome,
      validar: (v) => (v.trim().length < 2 ? e.nome : undefined),
    },
    { id: 'objetivo', tipo: 'opcoes', fala: () => f.objetivo, opcoes: opcoes(t, 'objetivo', ['gordura', 'massa', 'forma', 'forca', 'saude', 'corrida']) },
    { id: 'sexo', tipo: 'opcoes', fala: () => f.sexo, opcoes: opcoes(t, 'sexo', ['m', 'f', 'nd']) },
    {
      id: 'nascimento', tipo: 'campo', campo: 'data', rotulo: t.campo.nascimento, fala: () => f.nascimento,
      validar: (v) => (lerData(v) ? undefined : e.nascimento),
    },
  ];
  if (ehMenor(r)) {
    p.push(
      {
        id: 'respNome', tipo: 'campo', campo: 'texto', rotulo: t.campo.respNome, fala: () => f.respNome,
        validar: (v) => (v.trim().length < 2 ? e.respNome : undefined),
      },
      {
        id: 'respEmail', tipo: 'campo', campo: 'email', rotulo: t.campo.respEmail, fala: () => f.respEmail,
        validar: (v) => (!emailValido(v) ? e.email : undefined),
      },
      {
        id: 'respAutoriza', tipo: 'opcoes', fala: () => f.respAutoriza, opcoes: opcoes(t, 'respAutoriza', ['sim', 'nao']),
        barra: (id) => (id === 'sim' ? undefined : t.barra.respAutoriza),
      },
    );
  }
  p.push(
    {
      id: 'altura', tipo: 'campo', campo: 'numero', rotulo: t.campo.altura, sufixo: t.sufixo.altura, fala: () => f.altura,
      validar: (v) => faixa(v, 120, 230, e.altura),
    },
    {
      id: 'peso', tipo: 'campo', campo: 'numero', rotulo: t.campo.peso, sufixo: t.sufixo.peso, fala: () => f.peso,
      validar: (v) => faixa(v, 30, 300, e.peso),
    },
    { id: 'experiencia', tipo: 'opcoes', fala: () => f.experiencia, opcoes: opcoes(t, 'experiencia', ['nunca', 'iniciante', 'intermediario', 'avancado']) },
    {
      id: 'dias', tipo: 'opcoes', fala: () => f.dias,
      opcoes: ['2', '3', '4', '5', '6'].map((n) => ({ id: n, rotulo: t.ui.dias.replace('{n}', n) })),
    },
    { id: 'local', tipo: 'opcoes', fala: () => f.local, opcoes: opcoes(t, 'local', ['academia', 'casa', 'rua', 'misto']) },
    /* "Corpo todo" marca todas as outras opções (e desmarcar qualquer uma tira o "Corpo todo") */
    { id: 'foco', tipo: 'multi', todas: 'corpo', fala: () => f.foco, opcoes: opcoes(t, 'foco', ['peito_braco', 'costas', 'pernas', 'ombros', 'abdomen', 'corpo']) },
    { id: 'lesoes', tipo: 'multi', exclusiva: 'nenhuma', fala: () => f.lesoes, opcoes: opcoes(t, 'lesoes', ['nenhuma', 'joelho', 'ombro', 'coluna', 'punho', 'outra']) },
    { id: 'dia', tipo: 'opcoes', fala: () => f.dia, opcoes: opcoes(t, 'dia', ['sentado', 'leve', 'moderado', 'pesado']) },
    {
      id: 'email', tipo: 'campo', campo: 'email', rotulo: t.campo.email, fala: () => f.email,
      validar: (v) => (!emailValido(v) ? e.email : undefined),
    },
    {
      id: 'senha', tipo: 'campo', campo: 'senha', rotulo: t.campo.senha, fala: () => f.senha,
      validar: (v) => (v.length < 8 ? e.senha : undefined),
    },
    {
      id: 'termos', tipo: 'opcoes', links: true, fala: () => f.termos, opcoes: opcoes(t, 'termos', ['aceito', 'ler']),
      barra: (id) => (id === 'aceito' ? undefined : t.barra.termos),
    },
    { id: 'criar', tipo: 'criar', fala: () => f.criar },
  );
  return p;
}

/* ---------- entrar na conta ---------- */
export function passosEntrar(idioma: Idioma): Passo[] {
  const f = TEXTOS[idioma].fala;
  return [
    { id: 'idioma', tipo: 'idioma', fala: () => f.idioma },
    { id: 'entrar', tipo: 'entrar', fala: () => f.entrar },
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
    experiencia: um(r.experiencia), diasSemana: Number(um(r.dias)) || 3, local: um(r.local),
    foco: lista(r.foco), lesoes: lista(r.lesoes), dia: um(r.dia),
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

/* Todas as frases fixas que o RONDIN diz numa língua. O gerador de vozes (scripts/gerar-vozes.mjs) usa esta lista; o que
   não estiver aqui cai na voz do aparelho (ex.: mensagens de erro vindas do servidor que não foram traduzidas). */
export function listarFalas(idioma: Idioma): string[] {
  const t = TEXTOS[idioma];
  const achadas = new Set<string>();
  /* só as partes fixas viram áudio pronto; o lugar do nome fica de fora */
  const add = (modelo: string | undefined) => {
    if (modelo) trechosDe(modelo, { nome: 'X' }).audio.filter((x) => !x.dinamico).forEach((x) => achadas.add(x.texto));
  };
  const listas = [passosCadastro({}, idioma), passosCadastro({ nascimento: '01/01/2012' }, idioma), passosEntrar(idioma)];
  for (const l of listas) {
    for (const p of l) {
      add(p.fala({}));
      if (p.tipo === 'opcoes') { p.opcoes.forEach((o) => { add(o.comentario); add(p.barra?.(o.id)); }); }
      if (p.tipo === 'multi') p.opcoes.forEach((o) => add(o.comentario));
      if (p.tipo === 'campo') for (const teste of ['', 'x', '0', '1', '999', 'a@', '31/02/2020']) add(p.validar(teste, {}));
    }
  }
  add(t.fala.boasVindas);     // a tela de apresentação, antes de entrar ou criar conta
  add(t.fala.apresentacao);   // vai na frente da primeira pergunta do cadastro
  Object.values(t.falas).forEach(add);
  Object.values(t.srv).forEach(add);
  add(t.erro.email); add(t.erro.senhaLogin);
  /* a conversa do recado (lib/rondinConversa.ts), as perguntas do dia (lib/perguntas.ts) e a saudação da chegada */
  const voz = (texto: string, ocultar: string[] = []) => trechosParaVoz(texto, ocultar).forEach((x) => { if (!x.dinamico) achadas.add(x.texto); });
  const c = CONVERSA[idioma];
  for (const pg of PERGUNTAS_DO_DIA) { voz(pg[idioma]); voz(pg.seguir[idioma]); }
  [c.falas.jaHoje, c.falas.guardado, c.falas.descartado, c.falas.naoResponder, c.falas.chamado, c.falas.convite].forEach((f) => voz(f));
  for (const hora of [8, 15, 21]) { voz(c.falas.saudacao('', hora)); voz(c.falas.saudacao('Fulano', hora), ['Fulano']); }
  const { neutras, curtas, positivas, negativas, eco } = c.reacao;
  for (const f of [...neutras, ...curtas, ...positivas, ...negativas, ...c.fechamento, ...c.encerrar]) {
    voz(f);
    voz(`${f} "x"`);   // a mesma frase quando vem junto do eco: dividida em sentenças
  }
  voz(eco('palavra'));
  return [...achadas];
}
