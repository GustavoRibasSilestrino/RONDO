/* Grava a voz do RONDIN para a tela de entrar do site (/entrar, components/Entrar.tsx), pedido do dono em 2026-11-18:
   a mesma voz do app (Will, ElevenLabs, as mesmas configurações de app/scripts/vozes.config.json) dizendo a saudação e a
   legenda. Pede também o tempo de cada letra (rota "with-timestamps"), para a legenda do site aparecer palavra por palavra
   no momento em que ele diz cada uma.

   Gera:
     src/assets/rondin/fala-entrar-<caso>.mp3   o áudio de cada caso (loja, inicio)
     src/data/falaEntrar.ts                     o texto, quando cada palavra começa (em segundos) e a duração

   Uso (dentro da pasta vitrine):  node scripts/gerar-voz-entrar.mjs
   A chave fica em ELEVENLABS_API_KEY (variável de ambiente ou app/.env, que o git ignora); nunca é impressa nem vai para o
   site. A chave só precisa do acesso "Texto para fala". Mudou o texto? Mude aqui e rode de novo (o Entrar.tsx usa o texto
   do arquivo gerado). Gasta uns 250 créditos. As falas do app (app/public/vozes) não são tocadas. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(raiz, '..', 'app', 'scripts', 'vozes.config.json'), 'utf8'));
const VOZ = config.sotaques.br.voz;

/* o que ele diz em cada caso: a saudação (o título) e a legenda logo abaixo */
const FALAS = {
  loja: {
    ola: 'Olá, eu sou o RONDIN.',
    legenda: 'Você quer adotar um mascote? Para adotar, entre na sua conta ou crie uma agora. Ele vai direto para ela.',
  },
  inicio: {
    ola: 'Olá, eu sou o RONDIN e irei lhe acompanhar nessa jornada.',
    legenda: 'Entre na sua conta do RONDO ou crie uma agora.',
  },
};

function chave() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const env = join(raiz, '..', 'app', '.env');
  if (existsSync(env)) {
    const linha = readFileSync(env, 'utf8').replace(/^﻿/, '').split(/\r?\n/).find((l) => l.startsWith('ELEVENLABS_API_KEY='));
    if (linha) return linha.slice('ELEVENLABS_API_KEY='.length).trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('Sem ELEVENLABS_API_KEY (variável de ambiente ou app/.env).');
}

/* como os nomes da marca se falam (igual ao app): RONDO é "Rôndo" e RONDIN não é soletrado */
const preparar = (t) => t.replace(/RONDIN/g, 'Rondin').replace(/RONDO/g, 'Rôndo');

async function gravar(texto) {
  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}/with-timestamps?output_format=${config.formato}`, {
      method: 'POST',
      headers: { 'xi-api-key': chave(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: preparar(texto), model_id: config.modelo, language_code: 'pt', voice_settings: config.ajustes }),
    });
    if (r.status === 429 || r.status >= 500) { await new Promise((ok) => setTimeout(ok, 2000 * (tentativa + 1))); continue; }
    if (!r.ok) {
      let motivo = '';
      try { const d = await r.json(); motivo = d?.detail?.status ?? d?.detail?.message ?? ''; } catch { /* sem corpo */ }
      throw new Error(`ElevenLabs respondeu ${r.status}${motivo ? ` (${motivo})` : ''}.`);
    }
    return r.json();
  }
  throw new Error('A ElevenLabs não respondeu depois de várias tentativas.');
}

/* quando cada palavra começa: a primeira letra depois de um espaço */
function inicios(alinhamento, palavras) {
  const { characters: letras, character_start_times_seconds: comeco } = alinhamento;
  const t = [];
  for (let i = 0; i < letras.length; i += 1) {
    if (letras[i].trim() && (i === 0 || !letras[i - 1].trim())) t.push(Math.round(comeco[i] * 1000) / 1000);
  }
  if (t.length !== palavras) throw new Error(`O alinhamento tem ${t.length} palavras e o texto, ${palavras}.`);
  return t;
}

const saida = {};
for (const [caso, f] of Object.entries(FALAS)) {
  const texto = `${f.ola} ${f.legenda}`;
  const palavras = texto.split(' ').length;
  const r = await gravar(texto);
  writeFileSync(join(raiz, 'src', 'assets', 'rondin', `fala-entrar-${caso}.mp3`), Buffer.from(r.audio_base64, 'base64'));
  const a = r.alignment ?? r.normalized_alignment;
  const fim = a.character_end_times_seconds.at(-1);
  saida[caso] = { ...f, inicios: inicios(a, palavras), duracao: Math.round(fim * 100) / 100 };
  console.log(`${caso}: ${palavras} palavras, ${saida[caso].duracao} s`);
}

writeFileSync(join(raiz, 'src', 'data', 'falaEntrar.ts'),
  `/* Gerado por scripts/gerar-voz-entrar.mjs: o que o RONDIN diz na tela de entrar do site e quando cada palavra começa na
   gravação (em segundos, a partir do início do áudio). Não edite à mão: mude o texto no script e rode de novo. */
export const FALAS_ENTRAR = ${JSON.stringify(saida, null, 2)} as const;
`);
console.log('pronto: src/assets/rondin/fala-entrar-*.mp3 e src/data/falaEntrar.ts');
