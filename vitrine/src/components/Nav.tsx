import { useEffect, useMemo, useRef, useState } from "react";
import { MENU } from "../data/menu";
import { SECTIONS, type Sec } from "../data/sections";
import { goMoment } from "../lib/bus";
import { reduceMotion, vars } from "../lib/util";
import { Btn, Mark } from "./ui";

/* ---------- menu com painéis (abre ao passar o mouse, só em tela larga) ---------- */
/* o painel começa na borda esquerda do item; se não couber à direita, é empurrado para dentro da tela */
function posicionar(item: HTMLElement) {
  const mega = item.querySelector<HTMLElement>(".mega");
  if (!mega) return;
  const largura = Math.min(700, innerWidth - 32);
  const esquerda = item.getBoundingClientRect().left;
  const ajustada = Math.max(16, Math.min(esquerda, innerWidth - largura - 16));
  mega.style.setProperty("--mx", `${(ajustada - esquerda).toFixed(1)}px`);
}

/* ---------- a roda do celular ---------- */
/* Um arco que sobe do item de baixo. Deslize para o lado para girar; o ícone parado no topo é o escolhido; toque para abrir. */
function Wheel({ open, current, onClose }: { open: boolean; current: number; onClose: () => void }) {
  const items = useMemo(() => SECTIONS.map((s, i) => ({ s, i })).filter((o) => o.i !== current), [current]);
  const n = items.length;
  const step = Math.min(360 / n, 40);   // graus entre dois ícones
  const period = n * step;              // volta completa
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(false);
  const [rot, setRotState] = useState(0);
  const [jumps, setJumps] = useState<boolean[]>([]);
  const [dragging, setDragging] = useState(false);
  const prevA = useRef<number[]>([]);
  const drag = useRef<{ r0: number; x: number; k: number } | null>(null);
  const moved = useRef(false);
  const ringRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);

  const angle = (k: number, r: number) => ((((k * step + r + period / 2) % period) + period) % period) - period / 2;
  const setRot = (r: number) => {
    const as = items.map((_, k) => angle(k, r));
    // quem dá a volta por trás salta de um lado ao outro: sem animar
    setJumps(as.map((a, k) => prevA.current[k] !== undefined && Math.abs(a - prevA.current[k]) > period / 2));
    prevA.current = as;
    setRotState(r);
  };
  const active = ((Math.round(-rot / step) % n) + n) % n;

  /* abrir e fechar */
  useEffect(() => {
    clearTimeout(timer.current);
    if (open) {
      const next = items.findIndex((o) => o.i > current);   // a próxima seção da página começa no topo
      prevA.current = [];
      setRot(-Math.max(0, next) * step);
      setVisible(true);
      const id = requestAnimationFrame(() => setShown(true));
      document.body.style.overflow = "hidden";
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    document.body.style.overflow = "";
    timer.current = window.setTimeout(() => setVisible(false), reduceMotion ? 0 : 320);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  const goTo = (s: Sec) => {
    onClose();
    history.replaceState(null, "", s.href === "#inicio" ? location.pathname + location.search : s.href);
    const behavior = reduceMotion ? "auto" : "smooth";
    if (s.href === "#inicio") { scrollTo({ top: 0, behavior }); return; }
    document.querySelector(s.href)?.scrollIntoView({ behavior, block: "start" });
  };

  /* deslizar para girar */
  const onDown = (e: React.PointerEvent) => {
    const R = (ringRef.current?.offsetWidth ?? 320) / 2;
    drag.current = { r0: rot, x: e.clientX, k: 180 / (Math.PI * R) };   // 1 px de deslize = 1 px ao longo do arco
    moved.current = false;
    setDragging(true);
  };
  const latest = useRef({ setRot, step, rot });
  latest.current = { setRot, step, rot };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 6) moved.current = true;
      if (moved.current) latest.current.setRot(d.r0 + dx * d.k);
    };
    const end = () => {
      if (!drag.current) return;
      drag.current = null;
      setDragging(false);
      const { setRot: sr, step: st, rot: r } = latest.current;
      if (moved.current) sr(-Math.round(-r / st) * st);
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
    return () => { removeEventListener("pointermove", move); removeEventListener("pointerup", end); removeEventListener("pointercancel", end); };
  }, []);

  /* teclado */
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      const { setRot: sr, step: st, rot: r } = latest.current;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); sr(r - st); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); sr(r + st); }
      else if (e.key === "Enter" && !(e.target as Element).closest("a, button")) goTo(items[active].s);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, items]);

  /* ao voltar para a tela larga, a roda não faz sentido */
  useEffect(() => {
    const m = matchMedia("(min-width: 981px)");
    const f = () => { if (m.matches && open) onClose(); };
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [open, onClose]);

  return (
    <div
      className={`wheel-overlay${shown ? " open" : ""}`} id="wheel" role="dialog" aria-modal="true" aria-label="Navegar pelas seções"
      hidden={!visible}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}   // só o fundo fecha; a área da roda não
    >
      <div className={`wheel-sheet${dragging ? " dragging" : ""}`} onPointerDown={onDown}>
        <div className="wheel-center"><b>{items[active]?.s.label}</b></div>
        <div className={`wheel${dragging ? " dragging" : ""}`} ref={ringRef}>
          {items.map((o, k) => {
            const a = angle(k, rot);
            return (
              <a
                key={o.s.href} href={o.s.href} aria-label={o.s.label}
                className={`wheel-item${k === active ? " active" : ""}${Math.abs(a) > 90 ? " far" : ""}`}
                style={{ ...vars({ "--a": `${a.toFixed(2)}deg` }), ...(jumps[k] ? { transition: "none" } : null) }}
                onClick={(e) => {
                  e.preventDefault();
                  if (moved.current) { moved.current = false; return; }
                  goTo(o.s);   // sem confirmação: tocou, abriu
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: o.s.icon }} />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [closing, setClosing] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [current, setCurrent] = useState(0);   // índice da seção que está na tela
  const currentRef = useRef(0);
  const closeTimer = useRef(0);

  useEffect(() => {
    let ticking = false;
    const spy = () => {
      ticking = false;
      setScrolled(scrollY > 20);
      const y = innerHeight * 0.35;
      let idx = 0;
      SECTIONS.forEach((s, i) => {
        const el = document.querySelector(s.href);
        if (el && el.getBoundingClientRect().top <= y) idx = i;
      });
      if (idx !== currentRef.current) { currentRef.current = idx; setCurrent(idx); }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    spy();
    return () => { removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); };
  }, []);

  const closeMega = () => {
    setClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setClosing(false), 700);
  };
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closeMega();
      (document.activeElement as HTMLElement | null)?.blur?.();
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);

  /* clique em um link do menu: vai ao momento certo e fecha o painel */
  const onNavClick = (e: React.MouseEvent) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[href^='#']");
    if (!a) return;
    if (a.dataset.moment) { e.preventDefault(); goMoment(a.dataset.moment); }
    if (a.closest(".mega")) closeMega();
  };

  return (
    <>
      <header className={`nav${scrolled ? " scrolled" : ""}${closing ? " closing" : ""}`} id="nav" onClick={onNavClick}>
        <div className="nav-in">
          <a href="#" className="logo logo-nome" aria-label="RONDO">RONDO</a>
          <nav className="nav-links" aria-label="Principal">
            {MENU.map((m) => (
              <div className="nav-item" key={m.key} onPointerEnter={(e) => posicionar(e.currentTarget)} onFocusCapture={(e) => posicionar(e.currentTarget)}>
                <a className="nav-trigger" href={m.href}>{m.trigger}</a>
                <div className="mega" role="region" aria-label={m.label}>
                  <div className="mega-card">
                    {m.cols.map((c) => (
                      <div className="mega-col" key={c.t}>
                        <h5>{c.t}</h5><p>{c.d}</p>
                        {c.items.map((i) => (
                          <a className="mi" key={i.t} href={i.href} data-moment={i.moment}><b>{i.t}</b><span>{i.d}</span></a>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </nav>
          <div className="nav-end"><Btn href="#entrar" small>Entrar na lista</Btn></div>
          <button className="nav-single" type="button" aria-haspopup="dialog" aria-expanded={wheelOpen} aria-controls="wheel" onClick={() => setWheelOpen((o) => !o)}>
            <span className="mark"><Mark /></span>
            <span className="cur">{SECTIONS[current].label}</span>
            <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </div>
      </header>
      <Wheel open={wheelOpen} current={current} onClose={() => setWheelOpen(false)} />
    </>
  );
}
