/* Streak interativo: 12 semanas de registros.
   Clique em um quadrado: ele registra ou desfaz o dia, cresce e volta, e uma onda passa pelos vizinhos.
   A sequência é recalculada na hora: a primeira falha é folga; uma segunda em até 7 dias quebra. */
(() => {
  const heat = document.getElementById("heat");
  const countEl = document.getElementById("streakN");
  const board = heat && heat.closest(".streak-board");
  if (!heat || !countEl || !board) return;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const WEEKS = 12, ROWS = 7, N = WEEKS * ROWS;
  const seed = [1,1,1,0,1,1,1, 1,1,0,1,1,1,1, 1,1,1,1,0,1,1, 1,0,1,1,1,1,1, 1,1,1,1,1,0,1, 1,1,1,1,1,1,1, 1,1,0,1,1,1,1, 1,1,1,1,1,1,0, 1,1,1,1,0,0,1, 1,1,1,1,0,1,1, 1,1,1,1,1,1,1, 1,1,1,0,1,1,1];
  const days = Array.from({ length: N }, (_, i) => seed[i] ?? 1);

  /* ---------- regras ---------- */
  function streak() {
    let count = 0, start = N, lastMiss = null;
    for (let i = N - 1; i >= 0; i--) {
      if (days[i]) { count++; start = i; continue; }
      if (lastMiss !== null && lastMiss - i < 7) break;
      lastMiss = i;
    }
    return { count, start };                       // start: primeiro dia que ainda conta na sequência
  }
  // falta isolada (sem outra na mesma janela de 7 dias) é folga e não quebra a sequência
  function missIsRest(i) {
    const from = Math.max(0, i - 6);
    return !days.slice(from, i + 7).some((v, k) => !v && from + k !== i);
  }
  const stateOf = (i, start) => days[i] ? (i >= start ? "run" : "past") : missIsRest(i) ? (i > start ? "restrun" : "rest") : "off";

  const rel = (i) => { const ago = N - 1 - i; return ago === 0 ? "Hoje" : ago === 1 ? "Ontem" : `Há ${ago} dias`; };
  const TXT = { run: "registrado", past: "registrado", off: "sem registro", rest: "folga, não quebra a sequência", restrun: "folga, não quebra a sequência" };

  /* ---------- quadrados ---------- */
  const cells = [];
  for (let i = 0; i < N; i++) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "c";
    b.tabIndex = i === N - 1 ? 0 : -1;             // um só ponto de tabulação; as setas andam pela grade
    b.style.setProperty("--d", `${(Math.floor(i / ROWS) + (i % ROWS)) * 24}ms`);   // atraso da entrada em diagonal
    heat.appendChild(b);
    cells.push(b);
  }
  cells[N - 1].classList.add("today");
  heat.setAttribute("role", "group");

  function paint() {
    const { count, start } = streak();
    const span = N - 1 - start;
    cells.forEach((b, i) => {
      const s = stateOf(i, start);
      if (b.dataset.s !== s) b.dataset.s = s;
      if (s === "run") b.style.setProperty("--k", (span > 0 ? (i - start) / span : 1).toFixed(3));
      else b.style.removeProperty("--k");
      b.setAttribute("aria-pressed", days[i] ? "true" : "false");
      b.setAttribute("aria-label", `${rel(i)}: ${TXT[s]}`);
    });
    return count;
  }

  /* ---------- número que sobe ---------- */
  let shown = 0, raf = 0;
  function showCount(n, instant) {
    cancelAnimationFrame(raf);
    if (reduce || instant) { shown = n; countEl.textContent = n; return; }
    const from = shown;
    if (n === from) { countEl.textContent = n; return; }
    const t0 = performance.now(), dur = Math.min(900, 300 + Math.abs(n - from) * 22);
    const step = (t) => {
      const k = Math.min((t - t0) / dur, 1);
      shown = Math.round(from + (n - from) * (1 - Math.pow(1 - k, 3)));
      countEl.textContent = shown;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    countEl.classList.remove("bump"); void countEl.offsetWidth; countEl.classList.add("bump");
  }
  const sr = document.createElement("span");
  sr.className = "sr-only"; sr.setAttribute("role", "status");
  board.appendChild(sr);
  const announce = (n) => { sr.textContent = `${n} ${n === 1 ? "dia seguido" : "dias seguidos"}`; };

  /* ---------- dica flutuante ---------- */
  const tip = document.createElement("div");
  tip.className = "heat-tip"; tip.setAttribute("aria-hidden", "true");
  board.appendChild(tip);
  let tipTimer = 0, holdUntil = 0;
  function showTip(i, hold = 0) {
    const b = cells[i];
    tip.innerHTML = `<b>${rel(i)}</b> · ${TXT[b.dataset.s]}`;
    const half = tip.offsetWidth / 2;
    const x = Math.min(board.clientWidth - half - 8, Math.max(half + 8, b.offsetLeft + b.offsetWidth / 2));
    tip.style.left = `${x}px`;
    tip.style.top = `${b.offsetTop - (hold ? b.offsetHeight * 0.5 : 0) - 8}px`;   // com o quadrado ampliado, a dica sobe junto
    clearTimeout(tipTimer);
    tip.classList.add("on");
    holdUntil = hold ? performance.now() + hold : 0;
    if (hold) tipTimer = setTimeout(hideTip, hold);
  }
  const hideTip = () => tip.classList.remove("on");
  const hideUnlessHeld = () => { if (performance.now() > holdUntil) hideTip(); };

  /* ---------- clique: cresce, volta, e a onda passa ---------- */
  function restart(b, cls, anim) {
    b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls);
    const done = (e) => {
      if (e.animationName !== anim) return;
      b.classList.remove(cls); b.removeEventListener("animationend", done);
    };
    b.addEventListener("animationend", done);
  }
  function burst(i) {
    if (reduce) return;
    const wi = Math.floor(i / ROWS), di = i % ROWS;
    cells.forEach((b, j) => {
      if (j === i) { restart(b, "c-pop", "cellPop"); return; }
      const dist = Math.hypot(Math.floor(j / ROWS) - wi, (j % ROWS) - di);
      if (dist > 3.3) return;
      b.style.setProperty("--rs", (1 + 0.22 / dist).toFixed(3));      // quanto mais perto, mais cresce
      b.style.setProperty("--rd", `${Math.round(dist * 60)}ms`);      // e mais cedo
      restart(b, "c-wave", "cellWave");
    });
  }

  function toggle(i) {
    days[i] = days[i] ? 0 : 1;
    const n = paint();
    showCount(n);
    announce(n);
    burst(i);
    showTip(i, 1800);
  }

  /* ---------- eventos ---------- */
  heat.addEventListener("click", (e) => {
    const b = e.target.closest(".c");
    if (b) toggle(cells.indexOf(b));
  });
  heat.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const b = e.target.closest(".c");
    if (b) showTip(cells.indexOf(b));
  });
  heat.addEventListener("pointerleave", hideUnlessHeld);
  let focusIdx = N - 1;
  heat.addEventListener("focusin", (e) => {
    const i = cells.indexOf(e.target);
    if (i < 0) return;
    cells[focusIdx].tabIndex = -1; focusIdx = i; cells[i].tabIndex = 0;
    showTip(i);
  });
  heat.addEventListener("focusout", hideUnlessHeld);
  heat.addEventListener("keydown", (e) => {
    const i = cells.indexOf(document.activeElement);
    if (i < 0) return;
    const step = { ArrowRight: ROWS, ArrowLeft: -ROWS, ArrowDown: 1, ArrowUp: -1 }[e.key];
    const j = step !== undefined ? i + step : e.key === "Home" ? 0 : e.key === "End" ? N - 1 : -1;
    if (j < 0 || j >= N) return;
    e.preventDefault();
    cells[j].focus();
  });

  /* ---------- início: os quadrados chegam em diagonal quando a grade entra na tela ---------- */
  const current = paint();
  announce(current);
  if (reduce || !("IntersectionObserver" in window)) {
    showCount(current, true);
  } else {
    heat.classList.add("arm");
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      setTimeout(() => {
        heat.classList.add("go");
        showCount(streak().count);                   // recalcula: o dia pode ter mudado antes da entrada
        setTimeout(() => heat.classList.remove("arm", "go"), 1700);
      }, 250);
    }, { threshold: 0.35 });
    io.observe(heat);
  }
})();
