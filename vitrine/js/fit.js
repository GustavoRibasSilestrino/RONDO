/* Camada "fit": movimento por cima da página. Falha em silêncio: sem isso, o site continua inteiro. */
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const qa = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- títulos de seção: palavra por palavra ---------- */
  if (!reduce) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("w-in"); io.unobserve(e.target); }
    }), { threshold: 0.3 });
    qa("h2.display").forEach((h) => {
      let n = 0;
      const walk = (node) => {
        [...node.childNodes].forEach((c) => {
          if (c.nodeType === 3) {
            const frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.append(part); return; }
              const w = document.createElement("span"), i = document.createElement("span");
              w.className = "w"; w.setAttribute("aria-hidden", "true");
              i.style.setProperty("--i", n++); i.textContent = part;
              w.append(i); frag.append(w);
            });
            c.replaceWith(frag);
          } else if (c.nodeType === 1) walk(c);
        });
      };
      const label = h.textContent.replace(/\s+/g, " ").trim();
      walk(h);
      h.setAttribute("aria-label", label);
      h.classList.add("js-split");
      io.observe(h);
    });
  }

  /* ---------- hero: +12% sobe de zero ---------- */
  const delta = document.querySelector(".delta");
  if (delta && !reduce) {
    const target = parseFloat(delta.textContent.replace(/[^\d.-]/g, "")) || 0;
    const sign = delta.textContent.trim().startsWith("-") ? "-" : "+";
    const t0 = performance.now() + 700, dur = 1500;
    delta.textContent = `${sign}0%`;
    const tick = (t) => {
      const k = Math.min(Math.max((t - t0) / dur, 0), 1);
      delta.textContent = `${sign}${Math.round(target * (1 - Math.pow(1 - k, 4)))}%`;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- cards: luz que segue o cursor ---------- */
  if (fine) {
    const sel = ".tool, .panel, .pro, .plan, .s-card";
    qa(sel).forEach((c) => {
      const s = document.createElement("i");
      s.className = "spot"; s.setAttribute("aria-hidden", "true");
      c.prepend(s);
    });
    document.addEventListener("pointermove", (e) => {
      const c = e.target.closest?.(sel);
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", `${e.clientX - r.left}px`);
      c.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, { passive: true });

    /* ---------- botões primários: atração magnética ---------- */
    if (!reduce) {
      qa(".btn-primary").forEach((b) => {
        b.addEventListener("pointermove", (e) => {
          const r = b.getBoundingClientRect();
          b.style.setProperty("--tx", `${((e.clientX - r.left) / r.width - 0.5) * 10}px`);
          b.style.setProperty("--ty", `${((e.clientY - r.top) / r.height - 0.5) * 8}px`);
        });
        b.addEventListener("pointerleave", () => { b.style.removeProperty("--tx"); b.style.removeProperty("--ty"); });
      });
    }
  }

  /* ---------- batimento no topo das seções ---------- */
  const NS = "http://www.w3.org/2000/svg";
  const ecgIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("on"); ecgIO.unobserve(e.target); }
  }), { threshold: 0.6 });
  qa("section.section").forEach((sec, k) => {
    const x = [28, 64, 41, 72, 36, 58][k % 6] * 10;           // onde o pulso cai, em um eixo de 0 a 1000
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "ecg"); svg.setAttribute("viewBox", "0 0 1000 26");
    svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
    const mk = (d, cls) => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", d); p.setAttribute("pathLength", "1");
      if (cls) p.setAttribute("class", cls);
      svg.append(p);
    };
    mk(`M0 13H${x - 40}l7-3 8 3H${x - 12}l5-2 4 2 4 0 6-11 8 24 7-17 5 5H1000`);
    mk(`M${x - 12} 13l5-2 4 2 4 0 6-11 8 24 7-17 5 5`, "beat");
    sec.append(svg);
    reduce ? svg.classList.add("on") : ecgIO.observe(svg);
  });
})();
