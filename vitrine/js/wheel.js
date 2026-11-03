/* Cabeçalho do celular: um único item com o nome da seção atual.
   Ao tocar, abre no pé da tela uma roda com as outras seções: deslize para o lado para girar,
   toque em um ícone para abrir a seção na hora. */
(() => {
  const S = window.YY_SECTIONS;
  const single = document.getElementById("navSingle");
  const cur = document.getElementById("navCur");
  const overlay = document.getElementById("wheel");
  const sheet = document.getElementById("wheelSheet");
  const ring = document.getElementById("wheelRing");
  const label = document.getElementById("wheelLabel");
  const closeBtn = document.getElementById("wheelClose");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let current = 0;   // índice da seção que está na tela
  let items = [];    // seções mostradas na roda: todas menos a atual
  let step = 36;     // graus entre dois itens
  let rot = 0;       // giro da roda, em graus (contínuo, sem voltar a zero)
  let active = -1;   // item parado no topo
  let drag = null;
  let moved = false;

  /* ---------- qual seção está na tela ---------- */
  let ticking = false;
  function spy() {
    ticking = false;
    const y = innerHeight * 0.35;
    let idx = 0;
    S.forEach((s, i) => {
      const el = document.querySelector(s.href);
      if (el && el.getBoundingClientRect().top <= y) idx = i;
    });
    if (idx !== current) { current = idx; cur.textContent = S[idx].label; }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  spy();

  /* ---------- monta a roda ---------- */
  const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  function build() {
    items = S.map((s, i) => ({ s, i })).filter((o) => o.i !== current);
    step = 360 / items.length;
    ring.querySelectorAll(".wheel-item").forEach((n) => n.remove());
    items.forEach((o, k) => {
      const a = document.createElement("a");
      a.className = "wheel-item";
      a.href = o.s.href;
      a.dataset.k = k;
      a.setAttribute("aria-label", o.s.label);
      a.style.setProperty("--base", `${k * step}deg`);
      a.innerHTML = icon(o.s.icon);
      ring.appendChild(a);
    });
  }

  function paint() {
    ring.querySelectorAll(".wheel-item").forEach((n, k) => n.classList.toggle("active", k === active));
    label.textContent = items[active].s.label;
  }
  function setRot(r) {
    rot = r;
    ring.style.setProperty("--rot", `${rot}deg`);
    const k = ((Math.round(-rot / step) % items.length) + items.length) % items.length;
    if (k !== active) { active = k; paint(); }
  }
  const snap = () => setRot(-Math.round(-rot / step) * step);

  /* ---------- abrir e fechar ---------- */
  function open() {
    build();
    active = -1;
    const next = items.findIndex((o) => o.i > current);   // a próxima seção da página começa no topo
    setRot(-Math.max(0, next) * step);
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("open"));
    single.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    closeBtn.focus({ preventScroll: true });
  }
  function close(returnFocus = true) {
    overlay.classList.remove("open");
    single.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(() => { if (!overlay.classList.contains("open")) overlay.hidden = true; }, reduce ? 0 : 320);
    if (returnFocus) single.focus({ preventScroll: true });
  }
  function goTo(s) {
    close(false);
    history.replaceState(null, "", s.href === "#inicio" ? location.pathname + location.search : s.href);
    if (s.href === "#inicio") { scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); return; }
    document.querySelector(s.href)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  single.addEventListener("click", () => (overlay.hidden ? open() : close()));
  closeBtn.addEventListener("click", () => close());
  overlay.addEventListener("click", (e) => {
    if (e.target !== overlay) return;   // só o fundo fecha; a área da roda não
    close();
  });

  /* ---------- deslizar para girar ---------- */
  sheet.addEventListener("pointerdown", (e) => {
    const R = ring.offsetWidth / 2;
    drag = { r0: rot, x: e.clientX, k: 180 / (Math.PI * R) };   // 1 px de deslize = 1 px ao longo do arco
    moved = false;
    sheet.classList.add("dragging");
    ring.classList.add("dragging");
  });
  addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) moved = true;
    if (moved) setRot(drag.r0 + dx * drag.k);
  });
  const end = () => {
    if (!drag) return;
    drag = null;
    sheet.classList.remove("dragging");
    ring.classList.remove("dragging");
    if (moved) snap();
  };
  addEventListener("pointerup", end);
  addEventListener("pointercancel", end);

  /* ---------- tocar em um ícone: abre direto a seção ---------- */
  ring.addEventListener("click", (e) => {
    const a = e.target.closest(".wheel-item");
    if (!a) return;
    e.preventDefault();
    if (moved) { moved = false; return; }
    goTo(items[+a.dataset.k].s);   // sem confirmação: tocou, abriu
  });

  /* ---------- teclado ---------- */
  document.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setRot(rot - step); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setRot(rot + step); }
    else if (e.key === "Enter" && !e.target.closest("a, button")) goTo(items[active].s);
  });

  /* ao voltar para a tela larga, a roda não faz sentido */
  matchMedia("(min-width: 981px)").addEventListener("change", (m) => { if (m.matches && !overlay.hidden) close(false); });
})();
