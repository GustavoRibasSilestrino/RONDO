const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- nav ---------- */
const nav = $("#nav");
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 20), { passive: true });

/* ---------- faixa em loop: duplica o conteúdo ---------- */
const track = $("#marquee");
track.innerHTML += track.innerHTML;

/* ---------- revelar ao rolar ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: 0.12 });
$$(".reveal").forEach((el) => io.observe(el));

/* ---------- comparador ontem x hoje ---------- */
const cmp = $("#cmp"), cmpRange = $("#cmpRange");
const setPos = (v) => cmp.style.setProperty("--pos", v + "%");
cmpRange.addEventListener("input", () => setPos(cmpRange.value));
if (!reduceMotion) {
  let t0;
  const intro = (t) => {
    t0 ??= t;
    const k = Math.min((t - t0) / 1400, 1);
    const v = 92 - 42 * (1 - Math.pow(1 - k, 3));
    cmpRange.value = v; setPos(v);
    if (k < 1) requestAnimationFrame(intro);
  };
  setTimeout(() => requestAnimationFrame(intro), 500);
}

/* ---------- abas de recursos ---------- */
const tabs = $$(".tab");
function openTab(name) {
  tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  $$(".screen").forEach((s) => s.classList.toggle("on", s.id === "s-" + name));
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => openTab(t.dataset.tab));
  t.addEventListener("keydown", (e) => {
    const j = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : null;
    if (j === null) return;
    e.preventDefault();
    const n = tabs[(j + tabs.length) % tabs.length];
    n.focus(); openTab(n.dataset.tab);
  });
});

/* séries do treino */
$$("#s-treino .ok").forEach((b) => b.addEventListener("click", () => b.classList.toggle("on")));

/* cronômetro de descanso */
let rest = 90;
setInterval(() => {
  rest = rest > 0 ? rest - 1 : 90;
  $("#rest").textContent = `${String(Math.floor(rest / 60)).padStart(2, "0")}:${String(rest % 60).padStart(2, "0")}`;
}, 1000);

/* copos de água */
const cups = $$("#cups .cup");
const paintCups = (n) => { cups.forEach((c, i) => c.classList.toggle("on", i < n)); $("#cupN").textContent = n; };
cups.forEach((c, i) => c.addEventListener("click", () => paintCups(c.classList.contains("on") && !cups[i + 1]?.classList.contains("on") ? i : i + 1)));

/* heatmap do celular */
const mini = $("#miniHeat");
const miniPattern = [3,3,2,3,0,3,3, 3,2,3,3,3,1,3, 3,3,3,0,3,3,3, 2,3,3,3,3,3,0, 3,3,2,3,3,3,3];
mini.innerHTML = miniPattern.map((l) => `<i class="${l === 0 ? "rest" : "l" + l}"></i>`).join("");

/* ---------- ondas de áudio ---------- */
function buildWave(el, n) {
  el.innerHTML = Array.from({ length: n }, (_, i) => {
    const h = 18 + Math.abs(Math.sin(i * 1.7) * 52) + ((i * 37) % 22);
    return `<i style="--h:${Math.min(h, 100)}%;--d:${(i % 9) * 0.11}s"></i>`;
  }).join("");
}
buildWave($("#miniWave"), 26);
buildWave($("#wave"), 54);

/* ---------- gravador de recado (simulação, sem acessar o microfone) ---------- */
const questions = [
  "Do que você tem orgulho esta semana?",
  "Por que você está começando agora?",
  "O que te tirou do sério hoje?",
  "Qual treino você quase pulou e fez mesmo assim?",
  "Como você quer se sentir daqui a 90 dias?",
];
let qi = 0;
$("#nextQ").addEventListener("click", () => { qi = (qi + 1) % questions.length; $("#question").textContent = questions[qi]; });

const rec = $("#recorder"), mic = $("#micBtn"), out = $("#recResult"), timeEl = $("#recTime");
let recTimer = null, secs = 0;
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function dateIn(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
function stopRec(auto) {
  clearInterval(recTimer); recTimer = null;
  rec.classList.remove("on"); mic.setAttribute("aria-pressed", "false");
  if (secs === 0) { out.textContent = "Aperte o microfone para simular uma gravação."; return; }
  const days = +$('input[name="when"]:checked').value;
  out.innerHTML = `Recado de ${fmt(secs)} guardado${auto ? " (limite de 1 minuto)" : ""}. Ele chega a você em <b>${dateIn(days)}</b>.`;
}
mic.addEventListener("click", () => {
  if (recTimer) return stopRec(false);
  secs = 0; timeEl.textContent = "0:00"; out.textContent = "Gravando… fale com o seu eu do futuro.";
  rec.classList.add("on"); mic.setAttribute("aria-pressed", "true");
  recTimer = setInterval(() => {
    secs++; timeEl.textContent = fmt(secs);
    if (secs >= 60) stopRec(true);
  }, 1000);
});
$$('input[name="when"]').forEach((r) => r.addEventListener("change", () => { if (!recTimer && secs > 0) stopRec(false); }));

/* ---------- ferramentas ---------- */
const num = (id) => parseFloat($(id).value) || 0;
function calc1rm() {
  const carga = num("#carga"), reps = Math.max(1, num("#reps"));
  const rm = carga * (1 + reps / 30);
  $("#o1rm").textContent = Math.round(rm);
  $("#onext").textContent = (Math.round(carga * 1.04 * 2) / 2).toString().replace(".", ",");
}
["#carga", "#reps"].forEach((id) => $(id).addEventListener("input", calc1rm));
calc1rm();

function calcKcal() {
  const peso = num("#peso"), altura = num("#altura"), idade = num("#idade");
  const m = $("#sexo").value === "m";
  const tmb = 10 * peso + 6.25 * altura - 5 * idade + (m ? 5 : -161);
  const piso = m ? 1500 : 1200;
  const kcal = Math.max(piso, Math.round(tmb * num("#ativ") * num("#obj")));
  $("#okcal").textContent = kcal.toLocaleString("pt-BR");
  $("#oprot").textContent = Math.round(peso * 2);
}
$$("#fkcal input, #fkcal select").forEach((el) => el.addEventListener("input", calcKcal));
calcKcal();

/* ---------- streak interativo ---------- */
const WEEKS = 12, heat = $("#heat");
const seed = [1,1,1,0,1,1,1, 1,1,0,1,1,1,1, 1,1,1,1,0,1,1, 1,0,1,1,1,1,1, 1,1,1,1,1,0,1, 1,1,1,1,1,1,1, 1,1,0,1,1,1,1, 1,1,1,1,1,1,0, 1,1,1,1,0,0,1, 1,1,1,1,0,1,1, 1,1,1,1,1,1,1, 1,1,1,0,1,1,1];
const days = Array.from({ length: WEEKS * 7 }, (_, i) => seed[i] ?? 1);
function computeStreak() {
  let streak = 0, lastMiss = null;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i]) { streak++; continue; }
    if (lastMiss !== null && lastMiss - i < 7) break;
    lastMiss = i;
  }
  return streak;
}
// falta isolada (sem outra na mesma janela de 7 dias) é folga e não quebra a sequência
function missIsRest(i) {
  const from = Math.max(0, i - 6);
  return !days.slice(from, i + 7).some((v, k) => !v && from + k !== i);
}
function paintHeat() {
  heat.innerHTML = "";
  days.forEach((on, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", `Dia ${i + 1}: ${on ? "registrado" : "sem registro"}`);
    b.className = on ? "l3" : "";
    if (!on && missIsRest(i)) b.className = "rest";
    b.addEventListener("click", () => { days[i] = days[i] ? 0 : 1; paintHeat(); });
    heat.appendChild(b);
  });
  $("#streakN").textContent = computeStreak();
}
paintHeat();

/* ---------- lista de espera (ainda sem backend) ---------- */
$("#signup").addEventListener("submit", (e) => {
  e.preventDefault();
  // TODO: enviar para a API (POST /lista-de-espera) quando o backend existir.
  $("#signupOk").textContent = "Anotado! Avisaremos quando o beta abrir.";
  e.target.reset();
});
