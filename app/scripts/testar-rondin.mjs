/* Confere as partes puras do RONDIN do recado: as perguntas do dia, a conversa e o reconhecimento de "Olá Rondin".
   Uso (dentro da pasta app): node --experimental-strip-types scripts/testar-rondin.mjs
   Sai com erro (código 1) se algo falhar. */
import { PERGUNTAS_DO_DIA, indiceDaPergunta, perguntaDoDia } from '../src/lib/perguntas.ts';
import { CONVERSA, encerrarConversa, humor, palavraChave, reagir, saudacao } from '../src/lib/rondinConversa.ts';
import { idiomaDoChamado, ouveChamado } from '../src/lib/chamado.ts';
import { agrupar, diasComRecado, porDia } from '../src/lib/diarioRecados.ts';

let falhas = 0;
const confere = (ok, nome, extra = '') => { if (!ok) { falhas += 1; console.error(`FALHOU: ${nome} ${extra}`); } };
const IDIOMAS = ['pt', 'en', 'es'];

/* ---------- perguntas ---------- */
confere(PERGUNTAS_DO_DIA.length >= 14, 'pelo menos 14 perguntas (duas semanas sem repetir)');
PERGUNTAS_DO_DIA.forEach((p, i) => {
  for (const l of IDIOMAS) {
    confere(typeof p[l] === 'string' && p[l].trim().endsWith('?'), `pergunta ${i} (${l}) termina com ?`, p[l]);
    confere(typeof p.seguir[l] === 'string' && p.seguir[l].trim().endsWith('?'), `seguir ${i} (${l}) termina com ?`, p.seguir[l]);
    confere(p[l].length <= 110, `pergunta ${i} (${l}) cabe na legenda`, String(p[l].length));
  }
});
const unicas = new Set(PERGUNTAS_DO_DIA.map((p) => p.pt));
confere(unicas.size === PERGUNTAS_DO_DIA.length, 'perguntas sem repetição');
const dia = new Date(2026, 10, 13);
const seguinte = new Date(2026, 10, 14);
confere(indiceDaPergunta(seguinte) === (indiceDaPergunta(dia) + 1) % PERGUNTAS_DO_DIA.length, 'a pergunta muda a cada dia');
confere(indiceDaPergunta(dia, 3) === (indiceDaPergunta(dia) + 3) % PERGUNTAS_DO_DIA.length, 'o deslocamento pula para as seguintes');
confere(perguntaDoDia('en', dia) === PERGUNTAS_DO_DIA[indiceDaPergunta(dia)].en, 'a pergunta do dia vem na língua pedida');
/* a pergunta de meia-noite e a de um minuto depois são a mesma (o dia é o do calendário local) */
confere(indiceDaPergunta(new Date(2026, 10, 13, 0, 1)) === indiceDaPergunta(new Date(2026, 10, 13, 23, 59)), 'a pergunta não muda no meio do dia');

/* ---------- conversa: as três línguas têm tudo ---------- */
const chaves = (o) => Object.keys(o).sort().join(',');
for (const l of IDIOMAS) {
  const c = CONVERSA[l];
  confere(chaves(c.ui) === chaves(CONVERSA.pt.ui), `ui de ${l} tem as mesmas chaves`);
  confere(chaves(c.falas) === chaves(CONVERSA.pt.falas), `falas de ${l} tem as mesmas chaves`);
  confere(chaves(c.reacao) === chaves(CONVERSA.pt.reacao), `reacao de ${l} tem as mesmas chaves`);
  for (const [k, v] of Object.entries(c.ui)) confere(typeof v === 'string' && v.length > 0, `ui.${k} (${l}) preenchido`);
  for (const k of ['neutras', 'curtas', 'positivas', 'negativas']) confere(c.reacao[k].length >= 2, `reacao.${k} (${l}) tem variações`);
  confere(c.fechamento.length >= 1 && c.encerrar.length >= 1, `fechamentos de ${l}`);
  confere(c.reacao.eco('teste').includes('teste'), `o eco de ${l} usa a palavra`);
  confere(c.falas.saudacao('Ana', 8).includes('Ana'), `a saudação de ${l} usa o nome`);
  confere(!c.falas.saudacao('', 8).includes(', .'), `a saudação de ${l} sem nome não quebra`);
}
confere(saudacao('pt', 'Ana', 8).startsWith('Bom dia'), 'bom dia de manhã');
confere(saudacao('pt', 'Ana', 15).startsWith('Boa tarde'), 'boa tarde à tarde');
confere(saudacao('pt', 'Ana', 21).startsWith('Boa noite'), 'boa noite à noite');

/* ---------- conversa: humor, palavra-chave e reação ---------- */
confere(humor('estou muito cansado e com medo do que vem', 'pt') === 'ruim', 'humor ruim em pt');
confere(humor('tenho orgulho do que fiz e estou feliz', 'pt') === 'bom', 'humor bom em pt');
confere(humor('fui ao mercado comprar pão', 'pt') === 'neutro', 'humor neutro em pt');
confere(humor('i feel proud and happy today', 'en') === 'bom', 'humor bom em en');
confere(humor('me siento triste y cansado', 'es') === 'ruim', 'humor ruim em es');
confere(palavraChave('eu acho que a disciplina é o que me falta, porque sempre desisto', 'pt') === 'disciplina', 'palavra-chave em pt', String(palavraChave('eu acho que a disciplina é o que me falta, porque sempre desisto', 'pt')));
confere(palavraChave('sim não ok', 'pt') === null, 'sem palavra-chave quando tudo é curto');
confere(palavraChave('because always maybe', 'en') === null, 'palavras comuns não viram eco');
for (const l of IDIOMAS) {
  confere(CONVERSA[l].reacao.neutras.includes(reagir(l, undefined, 1)), `sem transcrição a reação é geral (${l})`);
  confere(CONVERSA[l].reacao.curtas.includes(reagir(l, 'não sei', 0)), `resposta curta (${l})`);
  confere(reagir(l, 'x', 7) === reagir(l, 'x', 7), `a reação é estável para a mesma semente (${l})`);
}
const pesado = reagir('pt', 'tenho trabalhado muito e estou exausto com a rotina', 1);
confere(CONVERSA.pt.reacao.negativas.some((n) => pesado.startsWith(n)), 'reação a texto pesado acolhe', pesado);
const leve = reagir('pt', 'estou feliz com o que construí nesta semana toda', 1);
confere(CONVERSA.pt.reacao.positivas.some((n) => leve.startsWith(n)), 'reação a texto leve celebra', leve);
const eco = reagir('pt', 'a minha disciplina vai e volta durante a semana inteira', 1);
confere(eco.includes('disciplina'), 'eco da palavra-chave', eco);
const fim = encerrarConversa('en', 'I am proud of my family and I want more time with them', 2, false);
confere(fim.length === 2 && fim[1].length > 10, 'o encerramento tem a reação e a pergunta de guardar');
confere(CONVERSA.en.encerrar.includes(encerrarConversa('en', undefined, 0, true)[1]), 'terminar cedo usa o encerramento curto');

/* ---------- diário: conversas e dias ---------- */
const em = (d, h, m = 0) => new Date(2026, 10, d, h, m).getTime();
const R = (id, criado, extra = {}) => ({ id, criado, entrega: '2026-11-01', pergunta: 'p', segundos: 10, uri: 'u', ...extra });
const recados = [
  R('a2', em(13, 8, 1), { grupo: 'g1', turno: 2 }),
  R('a1', em(13, 8, 0), { grupo: 'g1', turno: 1 }),
  R('b1', em(11, 20, 0)),
  R('c1', em(13, 21, 0), { grupo: 'g2', turno: 1 }),
];
const conversas = agrupar(recados);
confere(conversas.length === 3, 'três conversas (duas respostas viram uma)', String(conversas.length));
confere(conversas[0].id === 'g2' && conversas[1].id === 'g1' && conversas[2].id === 'b1', 'conversas da mais nova para a mais antiga', conversas.map((c) => c.id).join());
confere(conversas[1].itens.map((r) => r.id).join() === 'a1,a2', 'as respostas ficam na ordem do turno');
confere(conversas[2].itens.length === 1, 'recado antigo sem grupo é uma conversa só');
const dias = diasComRecado(recados);
confere(dias.size === 2 && dias.has('2026-11-13') && dias.has('2026-11-11'), 'dias com recado', [...dias].join());
const separado = porDia(conversas);
confere(separado.length === 2 && separado[0].dia === '2026-11-13' && separado[0].conversas.length === 2, 'conversas separadas por dia, o mais novo primeiro');
confere(agrupar([]).length === 0 && diasComRecado([]).size === 0 && porDia([]).length === 0, 'diário vazio');

/* ---------- "Olá Rondin" ---------- */
const CHAMAM = [
  'olá rondin', 'ola rondin', 'Olá, Rondin!', 'oi rondin', 'ola rondim', 'ei rondin', 'rondin', 'Rondin?', 'olá ron din', 'ola ron dim',
  'hello rondin', 'Hello, Rondin', 'hey rondin', 'hi rondin', 'hola rondin', 'Hola, Rondin!', 'oye rondin', 'buenas rondin',
  'bonjour rondin', 'ciao rondin', 'hallo rondin', 'olá rondin tudo bem com você hoje', 'hello there rondin how are you doing today',
  'привет рондин', 'ロンディン', 'olá rondo', 'ola rodin', 'hello ron dean',
];
const NAO_CHAMAM = [
  'eu estou fazendo uma ronda no bairro', 'o marechal rondon explorou o brasil e fez muitas coisas importantes',
  'hello world', 'vamos treinar hoje à tarde', 'rondo é um app muito legal e eu gosto de usar todo dia', 'robin hood',
  'a ronda da noite', 'ola tudo bem', 'hola como estas', 'hello how are you', 'dinheiro no bolso', '', '   ',
  'ronaldo marcou dois gols', 'meu cachorro se chama rex e ele é muito bonzinho',
];
CHAMAM.forEach((f) => confere(ouveChamado(f), `deve chamar: "${f}"`));
NAO_CHAMAM.forEach((f) => confere(!ouveChamado(f), `não deve chamar: "${f}"`));
confere(idiomaDoChamado('olá rondin') === 'pt', 'saudação em português');
confere(idiomaDoChamado('hello rondin') === 'en', 'saudação em inglês');
confere(idiomaDoChamado('hola rondin') === 'es', 'saudação em espanhol');
confere(idiomaDoChamado('rondin') === undefined, 'sem saudação, sem língua');

if (falhas) { console.error(`\n${falhas} verificação(ões) falharam.`); process.exit(1); }
console.log(`Tudo certo: ${PERGUNTAS_DO_DIA.length} perguntas, ${CHAMAM.length + NAO_CHAMAM.length} frases de chamado, 3 línguas.`);
