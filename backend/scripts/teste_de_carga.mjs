// Teste de carga simples: N pedidos ao mesmo tempo contra uma API (padrão: a local).
//   node backend/scripts/teste_de_carga.mjs [url] [pedidos]
// Cria uma conta de teste (e-mail @example.com), publica alguns posts e dispara os pedidos juntos nas rotas mais usadas.
// Use SEMPRE contra um banco de teste (SQLite local), nunca contra o Supabase de produção.
const base = process.argv[2] ?? 'http://localhost:8123';
const total = Number(process.argv[3] ?? 400);
const email = `carga-${Date.now()}@example.com`;

const cad = await fetch(base + '/auth/cadastro', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nome: 'Carga', email, senha: 'segredo123', nascimento: '1990-01-01', aceita_termos: true, aceita_privacidade: true }),
});
if (!cad.ok) throw new Error(`Cadastro falhou: ${cad.status} ${await cad.text()}`);
const h = { Authorization: 'Bearer ' + (await cad.json()).token };
for (let i = 0; i < 25; i++) await fetch(base + '/social/posts', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: `post ${i}` }) });

const rotas = ['/social/feed', '/social/resumo', '/social/notificacoes', '/social/stories', '/clubes'];
const inicio = Date.now();
const status = await Promise.all(Array.from({ length: total }, (_, i) => fetch(base + rotas[i % rotas.length], { headers: h }).then((r) => r.status).catch(() => 0)));
const contagem = {};
for (const s of status) contagem[s] = (contagem[s] ?? 0) + 1;
console.log(`${total} pedidos simultâneos em ${Date.now() - inicio} ms ->`, JSON.stringify(contagem));
console.log('esperado: tudo 200 (ou 429 se o limite por endereço estiver ligado); 500 ou 0 indicam problema');
