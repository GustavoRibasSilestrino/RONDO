/* Gera os áudios do RONDIN na ElevenLabs: um mp3 por frase e por língua, em public/vozes/<sotaque>/<frase>.mp3, mais o
   public/vozes/manifest.json (quais frases têm áudio e quanto duram). O app toca esses arquivos; o que faltar cai na voz do aparelho.
   (Até 2026-11-13 era o Azure; o dono assinou a ElevenLabs e escolheu a voz "Will", brasileira, para as três línguas.)

   Uso (dentro da pasta app):
     npm run vozes -- --listar                lista as vozes da conta (para trocar o voice_id em scripts/vozes.config.json)
     npm run vozes -- --dry                   só conta os caracteres (os créditos) que seriam gastos
     npm run vozes -- --sotaque br            gera só uma língua (comece por aqui)
     npm run vozes                            gera todas
     npm run vozes -- --forcar                regenera mesmo o que já existe (use depois de trocar a voz)
     npm run vozes -- --simular               áudios mudos de teste, sem chamar a ElevenLabs (só para testar o app)

   A chave fica em ELEVENLABS_API_KEY (variável de ambiente ou arquivo app/.env, que o git ignora). Nunca vai para o app.
   Frases que já existem não são geradas de novo, então dá para rodar quantas vezes quiser. */
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
const chave = () => ler('ELEVENLABS_API_KEY');

/* como os nomes da marca se falam: RONDO é "Rôndo" (não "rondó") e RONDIN não pode ser soletrado letra por letra */
function preparar(texto, idioma) {
  return texto
    .replace(/RONDIN/g, 'Rondin')
    .replace(/RONDO/g, idioma === 'pt' ? 'Rôndo' : 'Rondo');
}

async function eleven(caminho, opcoes = {}) {
  const url = `https://api.elevenlabs.io${caminho}`;
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    const r = await fetch(url, { ...opcoes, headers: { 'xi-api-key': chave(), ...(opcoes.headers ?? {}) } });
    if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 2000 * (tentativa + 1))); continue; }
    return r;
  }
  throw new Error('A ElevenLabs não respondeu depois de várias tentativas.');
}

async function listar() {
  const r = await eleven('/v1/voices');
  if (!r.ok) throw new Error(`Não consegui listar as vozes (${r.status}). Confira a chave.`);
  const { voices } = await r.json();
  console.log('Vozes da conta (voice_id, nome, sotaque):\n');
  for (const v of voices) console.log(`${v.voice_id}  ${v.name}  ${v.labels?.accent ?? ''}`);
}

async function gerarUma(cfg, texto, destino) {
  if (tem('--simular')) {   // áudio mudo com duração proporcional ao texto, só para testar o app
    const seg = Math.max(0.8, texto.length * 0.065).toFixed(2);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', seg, '-b:a', `${config.bitrate}`, destino]);
    return;
  }
  const r = await eleven(`/v1/text-to-speech/${cfg.voz}?output_format=${config.formato}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: preparar(texto, cfg.idioma), model_id: config.modelo, language_code: cfg.idioma, voice_settings: config.ajustes }),
  });
  if (r.status === 401 || r.status === 403) throw new Error('Chave recusada pela ElevenLabs. Confira ELEVENLABS_API_KEY no app/.env.');
  if (!r.ok) throw new Error(`ElevenLabs respondeu ${r.status}: ${(await r.text()).slice(0, 300)}`);
  writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
}

async function main() {
  const simular = tem('--simular');
  const dry = tem('--dry');
  if (!simular && !dry && !chave()) throw new Error('Defina ELEVENLABS_API_KEY (variável de ambiente ou arquivo app/.env).');
  if (tem('--listar')) return listar();

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
    const frases = listarFalas(so.idioma);   // cada voz fala só as frases da sua língua
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
