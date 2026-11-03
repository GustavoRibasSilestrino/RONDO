/* Navegação do celular: um único item embaixo, com o nome da seção atual.
   Ao tocar, sobe uma roda com as outras seções: deslize para o lado para girar e toque em um ícone
   para abrir a seção na hora. */
(() => {
  const S = window.YY_SECTIONS;
  const single = document.getElementById("navSingle");
  const cur = document.getElementById("navCur");
  const overlay = document.getElementById("wheel");
  const sheet = document.getElementById("wheelSheet");
  const ring = document.getElementById("wheelRing");
  const label = document.getElementById("wheelLabel");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let current = 0;   // índice da seção que está na tela
  let items = [];    // seções mostradas na roda: todas menos a atual ({ s, i, el, a })
  let step = 36;     // graus entre dois ícones
  let period = 360;  // volta completa dos ícones (nº de ícones × passo)
  let rot = 0;       // giro da roda, em graus (contínuo, sem voltar a zero)
  let active = -1;   // ícone parado no topo
  let drag = null;
  let moved = false;
  let opened = false;   // estado real da roda (evita corrida entre abrir, fechar e os quadros de animação)

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
    const list = S.map((s, i) => ({ s, i })).filter((o) => o.i !== current);
    step = Math.min(360 / list.length, 40);
    period = list.length * step;
    ring.querySelectorAll(".wheel-item").forEach((n) => n.remove());
    items = list.map((o, k) => {
      const a = document.createElement("a");
      a.className = "wheel-item";
      a.href = o.s.href;
      a.dataset.k = k;
      a.setAttribute("aria-label", o.s.label);
      a.innerHTML = icon(o.s.icon);
      ring.appendChild(a);
      return { ...o, el: a, a: undefined };
    });
  }

  /* posiciona cada ícone no arco; quem passa do limite dá a volta por trás (escondido) */
  function layout() {
    items.forEach((o, k) => {
      const a = ((((k * step + rot + period / 2) % period) + period) % period) - period / 2;
      const jump = o.a !== undefined && Math.abs(a - o.a) > period / 2;   // salto de um lado ao outro: sem animar
      if (jump) o.el.style.transition = "none";
      o.el.style.setProperty("--a", `${a.toFixed(2)}deg`);
      o.el.classList.toggle("far", Math.abs(a) > 90);
      o.a = a;
      if (jump) { void o.el.offsetWidth; o.el.style.transition = ""; }
    });
  }

  function paint() {
    items.forEach((o, k) => o.el.classList.toggle("active", k === active));
    label.textContent = items[active].s.label;
  }
  function setRot(r) {
    rot = r;
    layout();
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
    opened = true;
    overlay.hidden = false;
    requestAnimationFrame(() => { if (opened) overlay.classList.add("open"); });
    single.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function close() {
    opened = false;
    overlay.classList.remove("open");
    single.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(() => { if (!opened) overlay.hidden = true; }, reduce ? 0 : 320);
  }
  function goTo(s) {
    close();
    history.replaceState(null, "", s.href === "#inicio" ? location.pathname + location.search : s.href);
    if (s.href === "#inicio") { scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); return; }
    document.querySelector(s.href)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  single.addEventListener("click", () => (opened ? close() : open()));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();   // só o fundo fecha; a área da roda não
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
    if (!opened) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setRot(rot - step); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setRot(rot + step); }
    else if (e.key === "Enter" && !e.target.closest("a, button")) goTo(items[active].s);
  });

  /* ao voltar para a tela larga, a roda não faz sentido */
  matchMedia("(min-width: 981px)").addEventListener("change", (m) => { if (m.matches && opened) close(); });
})();
