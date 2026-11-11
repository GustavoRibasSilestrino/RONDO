/* Confere se os textos do RONDIN têm as mesmas chaves em português, inglês e espanhol e se nenhum ficou vazio, e mostra
   quantas frases cada voz precisa (lib/rondinTextos.ts). Uso (dentro da pasta app): npm run textos */
import { TEXTOS } from '../src/lib/rondinTextos.ts';
import { listarFalas, passosCadastro, passosEntrar } from '../src/lib/rondinRoteiro.ts';

let problemas = 0;
const falha = (m) => { problemas += 1; console.error(`✗ ${m}`); };
const base = TEXTOS.pt;
const vazio = (v) => typeof v !== 'string' || !v.trim();

for (const [idioma, t] of Object.entries(TEXTOS)) {
  for (const grupo of Object.keys(base)) {
    if (grupo === 'srv' && idioma === 'pt') continue;   // em português a mensagem do servidor já está certa
    const de = base[grupo], para = t[grupo];
    if (typeof de === 'string') { if (vazio(para)) falha(`${idioma}.${grupo} está vazio`); continue; }
    const chaves = grupo === 'srv' ? Object.keys(TEXTOS.en.srv) : Object.keys(de);
    for (const k of chaves) {
      if (grupo === 'nota' || grupo === 'com') continue;   // notas e comentários existem só em algumas opções: conferidos abaixo
      if (de[k] === undefined && grupo !== 'srv') continue;
      if (typeof para?.[k] === 'object' && para[k]) { for (const kk of Object.keys(de[k])) if (vazio(para[k][kk])) falha(`${idioma}.${grupo}.${k}.${kk} está vazio`); }
      else if (vazio(para?.[k])) falha(`${idioma}.${grupo}.${k} está vazio ou falta`);
    }
    for (const k of Object.keys(para ?? {})) if (grupo !== 'srv' && de[k] === undefined) falha(`${idioma}.${grupo}.${k} não existe em português`);
  }
  for (const grupo of ['nota', 'com']) {
    const a = Object.keys(base[grupo]).sort().join(), b = Object.keys(t[grupo]).sort().join();
    if (a !== b) falha(`${idioma}.${grupo} tem chaves diferentes do português`);
  }
  /* todo {nome} do português tem de existir na outra língua, e vice-versa */
  for (const k of Object.keys(base.fala)) if (/\{nome\}/.test(base.fala[k]) !== /\{nome\}/.test(t.fala[k] ?? '')) falha(`${idioma}.fala.${k}: o {nome} não bate com o português`);
  /* as perguntas e as opções montadas a partir do texto não podem sair com buraco */
  for (const lista of [passosCadastro({}, idioma), passosCadastro({ nascimento: '01/01/2012' }, idioma), passosEntrar(idioma)]) {
    for (const p of lista) {
      if (vazio(p.fala({}))) falha(`${idioma}: a pergunta "${p.id}" está sem fala`);
      if (p.tipo === 'opcoes' || p.tipo === 'multi') for (const o of p.opcoes) if (vazio(o.rotulo)) falha(`${idioma}: a opção "${p.id}.${o.id}" está sem rótulo`);
      if (p.tipo === 'campo' && vazio(p.rotulo)) falha(`${idioma}: o campo "${p.id}" está sem rótulo`);
    }
  }
  console.log(`${idioma}: ${listarFalas(idioma).length} frases fixas para a voz`);
}
if (problemas) { console.error(`\n${problemas} problema(s).`); process.exit(1); }
console.log('Textos conferidos: tudo certo.');
