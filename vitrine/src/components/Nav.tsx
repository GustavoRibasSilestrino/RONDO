import { useEffect, useRef, useState } from "react";
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

/* ---------- celular e tablet: menu de tela cheia aberto pelos três riscos ---------- */
const LINKS = SECTIONS.filter((s) => s.href !== "#entrar");

function MobileMenu({ open, current, onClose }: { open: boolean; current: number; onClose: () => void }) {
  const first = useRef<HTMLAnchorElement>(null);

  /* trava a rolagem da página e leva o foco para o primeiro link */
  useEffect(() => {
    if (!open) return;
    const y = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    first.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = y; document.removeEventListener("keydown", key); };
  }, [open, onClose]);

  /* ao voltar para a tela larga, o menu de celular não faz sentido */
  useEffect(() => {
    const m = matchMedia("(min-width: 981px)");
    const f = () => { if (m.matches) onClose(); };
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, [onClose]);

  const go = (e: React.MouseEvent, s: Sec) => {
    e.preventDefault();
    onClose();
    history.replaceState(null, "", s.href === "#inicio" ? location.pathname + location.search : s.href);
    const behavior = reduceMotion ? "auto" : "smooth";
    document.body.style.overflow = "";   // destrava a rolagem já, sem esperar o efeito de fechar
    if (s.href === "#inicio") scrollTo({ top: 0, behavior });
    else document.querySelector(s.href)?.scrollIntoView({ behavior, block: "start" });
  };

  return (
    <div className={`mnav${open ? " open" : ""}`} id="mnav" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open} inert={!open}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <nav className="mnav-list" aria-label="Seções">
        {LINKS.map((s, i) => (
          <a key={s.href} href={s.href} ref={i === 0 ? first : undefined} style={vars({ "--i": i })}
            aria-current={i === current ? "true" : undefined} onClick={(e) => go(e, s)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.icon }} />
            {s.label}
          </a>
        ))}
      </nav>
      <div className="mnav-cta" style={vars({ "--i": LINKS.length })} onClick={(e) => go(e, SECTIONS[SECTIONS.length - 1])}>
        <Btn href="#entrar">Entrar na lista</Btn>
      </div>
    </div>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [closing, setClosing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [current, setCurrent] = useState(0);   // índice da seção que está na tela
  const currentRef = useRef(0);
  const closeTimer = useRef(0);
  const closeMenu = useRef(() => setMenuOpen(false)).current;

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

  /* clique em um link do menu de cima: vai ao momento certo e fecha o painel */
  const onNavClick = (e: React.MouseEvent) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[href^='#']");
    if (!a) return;
    if (a.dataset.moment) { e.preventDefault(); goMoment(a.dataset.moment); }
    if (a.closest(".mega")) closeMega();
    if (menuOpen) closeMenu();
  };

  return (
    <>
      <header className={`nav${scrolled ? " scrolled" : ""}${closing ? " closing" : ""}${menuOpen ? " menu-open" : ""}`} id="nav" onClick={onNavClick}>
        <div className="nav-in">
          <a href="#" className="logo logo-nome" aria-label="RONDO"><Mark className="logo-mark" />RONDO</a>
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
          <button className="burger" type="button" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} aria-controls="mnav"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}>
            <span aria-hidden="true"><i /><i /><i /></span>
          </button>
        </div>
      </header>
      <MobileMenu open={menuOpen} current={current} onClose={closeMenu} />
    </>
  );
}
