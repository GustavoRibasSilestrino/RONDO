/* Gera os áudios do RONDIN no Azure (voz neural): um mp3 por frase e por sotaque, em public/vozes/<sotaque>/<frase>.mp3, mais o
   public/vozes/manifest.json (quais frases têm áudio e quanto duram). O app toca esses arquivos; o que faltar cai na voz do aparelho.

   Uso (dentro da pasta app):
     npm run vozes -- --listar                lista as vozes do Azure (para trocar o nome em scripts/vozes.config.json)
     npm run vozes -- --dry                   só conta os caracteres que seriam gerados
     npm run vozes -- --sotaque br            gera só um sotaque (comece por aqui)
     npm run vozes                            gera todos os sotaques
     npm run vozes -- --forcar                regenera mesmo o que já existe (use depois de trocar a voz)
     npm run vozes -- --simular               áudios mudos de teste, sem chamar o Azure (só para testar o app)

   As credenciais ficam em AZURE_SPEECH_KEY e AZURE_SPEECH_REGION (variáveis de ambiente ou arquivo app/.env, que o git ignora).
   Nunca vão para o app. Frases que já existem não são geradas de novo, então dá para rodar quantas vezes quiser. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashFala } from '../src/lib/hashFala.ts';
import { listarFalas } from '../src/lib/rondinRoteiro.ts';
import { SOTAQUES } from '../src/lib/rondinSotaques.ts';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pasta = join(raiz, 'public', 'vozes');
const config = JSON.parse(readFileSync(join(raiz, 'scripts', 'vozes.config.json'), 'utf8'));
const args = process.argv.slice(2);
const tem = (a) => args.includes(a);
const valor = (a) => { const i = args.indexOf(a); return i >= 0 ? args[i + 1] : undefined; };

function ler(nome) {
  if (process.env[nome]) return process.env[nome].trim();
  const env = join(raiz, '.env');
  if (existsSync(env)) {
    const linha = readFileSync(env, 'utf8').replace(/^﻿/, '').split(/\r?\n/).find((l) => l.startsWith(`${nome}=`));
    if (linha) return linha.slice(nome.length + 1).trim().replace(/^["']|["']$/g, '');
  }
  return '';
}
const chave = () => ler('AZURE_SPEECH_KEY');
const regiao = () => ler('AZURE_SPEECH_REGION').toLowerCase();

const escapar = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

async function azure(caminho, opcoes = {}) {
  const url = `https://${regiao()}.tts.speech.microsoft.com${caminho}`;
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const r = await fetch(url, { ...opcoes, headers: { 'Ocp-Apim-Subscription-Key': chave(), 'User-Agent': 'rondo-vozes', ...(opcoes.headers ?? {}) } });
    if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 1500 * (tentativa + 1))); continue; }
    return r;
  }
  throw new Error('O Azure não respondeu depois de várias tentativas.');
}

async function listar() {
  const r = await azure('/cognitiveservices/voices/list');
  if (!r.ok) throw new Error(`Não consegui listar as vozes (${r.status}). Confira a chave e a região.`);
  const vozes = await r.json();
  const idiomas = new Set(['pt-BR', 'pt-PT', 'en-US', 'es-ES', 'it-IT', 'fr-FR']);
  console.log('Vozes dos idiomas usados pelo RONDIN:\n');
  for (const v of vozes.filter((x) => idiomas.has(x.Locale)).sort((a, b) => a.Locale.localeCompare(b.Locale) || a.ShortName.localeCompare(b.ShortName))) {
    console.log(`${v.ShortName.padEnd(36)} ${v.Gender.padEnd(7)} ${v.VoiceType ?? ''}`);
  }
}

/* o SSML que o Azure lê: a voz, o idioma e, se houver, o ajuste de tom e velocidade */
function ssml(cfg, texto) {
  const dentro = cfg.tom || cfg.taxa
    ? `<prosody${cfg.tom ? ` pitch="${cfg.tom}"` : ''}${cfg.taxa ? ` rate="${cfg.taxa}"` : ''}>${escapar(texto)}</prosody>`
    : escapar(texto);
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${cfg.lang}"><voice name="${cfg.voz}">${dentro}</voice></speak>`;
}

async function gerarUma(cfg, texto, destino) {
  if (tem('--simular')) {   // áudio mudo com duração proporcional ao texto, só para testar o app
    const seg = Math.max(0.8, texto.length * 0.065).toFixed(2);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', seg, '-b:a', `${config.bitrate}`, destino]);
    return;
  }
  const r = await azure('/cognitiveservices/v1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': config.formato },
    body: ssml(cfg, texto),
  });
  if (r.status === 401 || r.status === 403) throw new Error('Credenciais recusadas pelo Azure. Confira AZURE_SPEECH_KEY e AZURE_SPEECH_REGION.');
  if (!r.ok) throw new Error(`Azure respondeu ${r.status}: ${(await r.text()).slice(0, 300)}`);
  writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
}

async function main() {
  const simular = tem('--simular');
  const dry = tem('--dry');
  if (!simular && !dry && (!chave() || !regiao())) throw new Error('Defina AZURE_SPEECH_KEY e AZURE_SPEECH_REGION (variáveis de ambiente ou arquivo app/.env).');
  if (tem('--listar')) { if (!chave() || !regiao()) throw new Error('Defina AZURE_SPEECH_KEY e AZURE_SPEECH_REGION (ou app/.env).'); return listar(); }

  const falas = listarFalas();
  const escolhido = valor('--sotaque');
  const ids = Object.keys(config.sotaques).filter((id) => !escolhido || id === escolhido);
  if (escolhido && !ids.length) throw new Error(`Sotaque desconhecido: ${escolhido}.`);

  const manifestoCaminho = join(pasta, 'manifest.json');
  const manifesto = existsSync(manifestoCaminho) ? JSON.parse(readFileSync(manifestoCaminho, 'utf8')) : {};
  let chars = 0, feitos = 0, pulados = 0;

  for (const id of ids) {
    const cfg = config.sotaques[id];
    const so = SOTAQUES.find((s) => s.id === id);
    if (!so) throw new Error(`O sotaque "${id}" do config não existe em rondinSotaques.ts.`);
    const frases = [...new Set([...falas, so.amostra])];   // a amostra só existe na voz do próprio sotaque
    if (!dry) mkdirSync(join(pasta, id), { recursive: true });
    manifesto[id] ??= {};
    for (const texto of frases) {
      const h = hashFala(texto);
      const destino = join(pasta, id, `${h}.mp3`);
      if (existsSync(destino) && manifesto[id][h] && !tem('--forcar')) { pulados += 1; continue; }
      chars += texto.length;
      if (dry) continue;
      await gerarUma(cfg, texto, destino);
      const bytes = readFileSync(destino).length;
      manifesto[id][h] = Math.round(((bytes * 8) / config.bitrate) * 100) / 100;   // mp3 de taxa fixa: duração = bytes * 8 / bits por segundo
      feitos += 1;
      process.stdout.write(`\r${id}: ${feitos} gerados`);
      writeFileSync(manifestoCaminho, JSON.stringify(manifesto));   // grava a cada frase: se parar no meio, nada se perde
    }
    process.stdout.write('\n');
  }
  console.log(dry
    ? `Seriam gerados ${chars} caracteres em ${ids.length} sotaque(s). (${pulados} frases já existem.)`
    : `Pronto: ${feitos} áudios novos, ${pulados} já existiam, ${chars} caracteres usados.`);
}

main().catch((e) => { console.error(`\nErro: ${e.message}`); process.exit(1); });
