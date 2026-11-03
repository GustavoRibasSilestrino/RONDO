const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

/* escreve uma variável CSS só quando o valor muda (o laço de animação roda a cada quadro) */
const lastVar = new Map();
function setVar(el, name, value) {
  const key = el === root ? name : el.id + name;
  if (lastVar.get(key) === value) return;
  lastVar.set(key, value);
  el.style.setProperty(name, value);
}

/* ---------- nav ---------- */
const nav = $("#nav");
addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 20), { passive: true });

/* ---------- revelar ao rolar ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: 0.12 });
$$(".reveal").forEach((el) => io.observe(el));

/* ---------- títulos com eco: a cópia fantasma é o próprio texto ---------- */
$$(".echo").forEach((el) => { el.dataset.echo = el.textContent.replace(/\s+/g, " ").trim(); });

/* ---------- hero: você corre, o seu ontem vem logo atrás ---------- */
const hero = $("#inicio"), lanesEl = $("#lanes"), laneYou = $("#laneYou"), laneGhost = $("#laneGhost");
const lane = { target: 0.5, you: 0.12, ghost: 0.1, auto: true, visible: true };
hero.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  const r = lanesEl.getBoundingClientRect();
  lane.auto = false;
  lane.target = clamp((e.clientX - r.left) / r.width, 0.02, 0.98);
});
hero.addEventListener("pointerleave", () => { lane.auto = true; });
new IntersectionObserver(([en]) => { lane.visible = en.isIntersecting; }).observe(hero);
function paintLanes(t) {
  if (lane.auto) lane.target = 0.5 + 0.4 * Math.sin(t / 2200);
  lane.you += (lane.target - lane.you) * 0.07;
  lane.ghost += (lane.you * 0.88 - lane.ghost) * 0.035;   // o ontem fica sempre cerca de 12% atrás
  setVar(laneYou, "--x", lane.you.toFixed(4));
  setVar(laneGhost, "--x", lane.ghost.toFixed(4));
}

/* ---------- um dia inteiro: a linha do tempo anda na horizontal conforme você rola ---------- */
const pin = $("#dayPin"), track = $("#dayTrack"), clock = $("#dayClock"), dayBar = $("#dayBar"), barWrap = $("#dayBarWrap");
const moments = $$(".moment");
const mins = moments.map((m) => { const [h, mm] = m.dataset.time.split(":").map(Number); return h * 60 + mm; });
moments.forEach((_, i) => {
  const tick = document.createElement("i");
  tick.className = "tick";
  tick.style.left = `${(i / (moments.length - 1)) * 100}%`;
  barWrap.appendChild(tick);
});
const narrow = matchMedia("(max-width: 980px)");
let dist = 0, lastClock = "";
const measure = () => { dist = Math.max(0, track.offsetWidth - track.parentElement.clientWidth); };
measure();
addEventListener("resize", measure);
document.fonts?.ready.then(measure);

function dayUpdate() {
  if (narrow.matches) { if (track.style.transform) track.style.transform = ""; return; }
  const r = pin.getBoundingClientRect(), total = pin.offsetHeight - innerHeight;
  if (r.bottom < -60 || r.top > innerHeight + 60) return;
  const p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
  track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
  dayBar.style.transform = `scaleX(${p.toFixed(4)})`;
  const f = p * (moments.length - 1), i0 = Math.floor(f), i1 = Math.min(i0 + 1, moments.length - 1);
  const m = Math.round(mins[i0] + (mins[i1] - mins[i0]) * (f - i0));
  const text = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  if (text !== lastClock) { lastClock = text; clock.textContent = text; clock.dateTime = text; }
  const act = Math.round(f);
  moments.forEach((el, i) => el.classList.toggle("on", i === act));
}

/* vai direto a um momento do dia (usado pelo menu) */
window.goMoment = (name) => {
  const i = moments.findIndex((m) => m.dataset.name === name);
  if (i < 0) return;
  const behavior = reduceMotion ? "auto" : "smooth";
  if (narrow.matches) { moments[i].scrollIntoView({ behavior, block: "start" }); return; }
  const total = pin.offsetHeight - innerHeight, top = pin.getBoundingClientRect().top + scrollY;
  scrollTo({ top: top + (i / (moments.length - 1)) * total, behavior });
};

/* ---------- laço de animação: eco da rolagem, trilho lateral, horizonte, corrida e o dia ---------- */
const rail = $("#rail");
let lastY = scrollY, lastT = 0, vel = 0, railYou = 0, railGhost = 0;
function loop(t) {
  const y = scrollY;
  // velocidade em px por quadro de 60 Hz; o decaimento depende do tempo, não do número de quadros
  const dt = lastT ? clamp((t - lastT) / 16.667, 0.5, 60) : 1;
  lastT = t;
  vel += ((y - lastY) / dt - vel) * (1 - Math.pow(0.82, dt));
  lastY = y;
  setVar(root, "--ga", Math.min(Math.abs(vel) / 26, 1).toFixed(3));
  setVar(root, "--gy", clamp(vel * 1.4, -26, 26).toFixed(1));

  const max = root.scrollHeight - innerHeight, p = max > 0 ? y / max : 0;
  railYou += (p - railYou) * 0.22;
  railGhost += (p * 0.88 - railGhost) * 0.05;
  setVar(rail, "--y1", railYou.toFixed(4));
  setVar(rail, "--y2", railGhost.toFixed(4));
  setVar(root, "--skyo", (1 - 0.6 * p).toFixed(3));

  if (lane.visible) paintLanes(t);
  dayUpdate();
  requestAnimationFrame(loop);
}
if (reduceMotion) {
  setVar(laneYou, "--x", "0.66");
  setVar(laneGhost, "--x", "0.58");
  dayUpdate();
  addEventListener("scroll", dayUpdate, { passive: true });
} else {
  requestAnimationFrame(loop);
}

/* ---------- comparador ontem x hoje ---------- */
const cmp = $("#cmp"), cmpRange = $("#cmpRange");
const setPos = (v) => cmp.style.setProperty("--pos", v + "%");
cmpRange.addEventListener("input", () => setPos(cmpRange.value));
if (!reduceMotion) {
  new IntersectionObserver(([en], ob) => {
    if (!en.isIntersecting) return;
    ob.disconnect();
    let t0;
    const intro = (t) => {
      t0 ??= t;
      const k = Math.min((t - t0) / 1400, 1);
      const v = 92 - 42 * (1 - Math.pow(1 - k, 3));
      cmpRange.value = v; setPos(v);
      if (k < 1) requestAnimationFrame(intro);
    };
    requestAnimationFrame(intro);
  }, { threshold: 0.5 }).observe(cmp);
}

/* ---------- momentos do dia ---------- */
$$("#m-treino .ok").forEach((b) => b.addEventListener("click", () => b.classList.toggle("on")));

let rest = 90;
setInterval(() => {
  rest = rest > 0 ? rest - 1 : 90;
  $("#rest").textContent = `${String(Math.floor(rest / 60)).padStart(2, "0")}:${String(rest % 60).padStart(2, "0")}`;
}, 1000);

const cups = $$("#cups .cup");
const paintCups = (n) => {
  cups.forEach((c, i) => c.classList.toggle("on", i < n));
  $("#cupN").textContent = n;
  $("#cupsNow").textContent = `${n} ${n === 1 ? "copo" : "copos"}`;
};
cups.forEach((c, i) => c.addEventListener("click", () => paintCups(c.classList.contains("on") && !cups[i + 1]?.classList.contains("on") ? i : i + 1)));

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
