/* Gera os áudios do RONDIN no ElevenLabs: um mp3 por frase e por sotaque, em public/vozes/<sotaque>/<frase>.mp3, mais o
   public/vozes/manifest.json (quais frases têm áudio e quanto duram). O app toca esses arquivos; o que faltar cai na voz do aparelho.

   Uso (dentro da pasta app):
     npm run vozes -- --listar                lista as vozes da sua conta (para escolher os ids em scripts/vozes.config.json)
     npm run vozes -- --dry                   só conta os caracteres que seriam gerados (não gasta crédito)
     npm run vozes -- --sotaque br            gera só um sotaque (comece por aqui: cabe no plano grátis)
     npm run vozes                            gera todos os sotaques
     npm run vozes -- --forcar                regenera mesmo o que já existe (use depois de trocar a voz)
     npm run vozes -- --simular               áudios mudos de teste, sem chamar o ElevenLabs (só para testar o app)

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

function chave() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const env = join(raiz, '.env');
  if (existsSync(env)) {
    const linha = readFileSync(env, 'utf8').split(/\r?\n/).find((l) => l.startsWith('ELEVENLABS_API_KEY='));
    if (linha) return linha.slice('ELEVENLABS_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

async function api(caminho, opcoes = {}) {
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    const r = await fetch(`https://api.elevenlabs.io${caminho}`, { ...opcoes, headers: { 'xi-api-key': chave(), ...(opcoes.headers ?? {}) } });
    if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 1500 * (tentativa + 1))); continue; }
    return r;
  }
  throw new Error('O ElevenLabs não respondeu depois de várias tentativas.');
}

async function listar() {
  const r = await api('/v1/voices');
  if (!r.ok) throw new Error(`Não consegui listar as vozes (${r.status}). Confira a chave.`);
  const { voices } = await r.json();
  console.log(`${voices.length} vozes na sua conta:\n`);
  for (const v of voices) {
    const l = v.labels ?? {};
    console.log(`${v.voice_id}  ${v.name}  [${[l.accent, l.gender, l.age, l.descriptive].filter(Boolean).join(', ')}]`);
  }
}

/* o texto que vai para o modelo: a tag de estilo na frente (só o eleven_v3 a entende) */
const textoDoModelo = (cfg, texto) => (cfg.tag && cfg.modelo === 'eleven_v3' ? `${cfg.tag} ${texto}` : texto);

async function gerarUma(cfg, texto, destino) {
  if (tem('--simular')) {   // áudio mudo com duração proporcional ao texto, só para testar o app
    const seg = Math.max(0.8, texto.length * 0.065).toFixed(2);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', seg, '-b:a', '64k', destino]);
    return;
  }
  const r = await api(`/v1/text-to-speech/${cfg.voz}?output_format=${config.formato}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: textoDoModelo(cfg, texto), model_id: cfg.modelo,
      voice_settings: { stability: config.estabilidade, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
    }),
  });
  if (r.status === 401) throw new Error('Chave recusada pelo ElevenLabs (401). Confira ELEVENLABS_API_KEY.');
  if (!r.ok) throw new Error(`ElevenLabs respondeu ${r.status}: ${(await r.text()).slice(0, 300)}`);
  writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
}

async function main() {
  if (tem('--listar')) { if (!chave()) throw new Error('Defina ELEVENLABS_API_KEY (ou app/.env).'); return listar(); }
  const simular = tem('--simular');
  if (!simular && !tem('--dry') && !chave()) throw new Error('Defina ELEVENLABS_API_KEY (variável de ambiente ou arquivo app/.env).');

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
    mkdirSync(join(pasta, id), { recursive: true });
    manifesto[id] ??= {};
    for (const texto of frases) {
      const h = hashFala(texto);
      const destino = join(pasta, id, `${h}.mp3`);
      if (existsSync(destino) && manifesto[id][h] && !tem('--forcar')) { pulados += 1; continue; }
      chars += texto.length;
      if (tem('--dry')) continue;
      await gerarUma(cfg, texto, destino);
      const bytes = readFileSync(destino).length;
      manifesto[id][h] = Math.round((bytes * 8) / 64000 * 100) / 100;   // mp3 de 64 kbps: duração = bytes / 8000
      feitos += 1;
      process.stdout.write(`\r${id}: ${feitos} gerados`);
      writeFileSync(manifestoCaminho, JSON.stringify(manifesto));   // grava a cada frase: se parar no meio, nada se perde
    }
    process.stdout.write('\n');
  }
  console.log(tem('--dry')
    ? `Seriam gerados ${chars} caracteres em ${ids.length} sotaque(s). (${pulados} frases já existem.)`
    : `Pronto: ${feitos} áudios novos, ${pulados} já existiam, ${chars} caracteres usados.`);
}

main().catch((e) => { console.error(`\nErro: ${e.message}`); process.exit(1); });
