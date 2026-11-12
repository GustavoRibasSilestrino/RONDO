import { useEffect, useRef, useState } from "react";
import { desenharOrbe, esfera } from "../lib/orbe";
import { APP_CRIAR } from "../lib/rotas";
import { reduceMotion } from "../lib/util";
import { Btn } from "./ui";

/* O RONDIN no canto da tela (pedido do dono em 2026-11-12): aparece por alguns segundos com "Oi, quer me conhecer?",
   some, e volta depois. Tocar nele abre um balão de fala com o convite e o botão que leva a criar a conta no app.
   Com o cursor (ou o foco) em cima ele não some. Para quem pede menos movimento, fica sempre ali, parado. */
const PRIMEIRA = 2500;     // ms até a primeira aparição
const VISIVEL = 5000;      // ms que ele fica na tela
const ESCONDIDO = 7000;    // ms até voltar

function Esfera({ tamanho, vivo }: { tamanho: number; vivo: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = canvas.height = tamanho * dpr;
    ctx.scale(dpr, dpr);
    const pts = esfera(tamanho > 80 ? 420 : 170);
    if (reduceMotion || !vivo) { desenharOrbe(ctx, pts, 2, 0.1, tamanho); return; }
    let id = 0;
    const t0 = performance.now();
    const quadro = (agora: number) => {
      const t = (agora - t0) / 1000;
      desenharOrbe(ctx, pts, t + 2, 0.12 + 0.06 * Math.sin(t * 1.6), tamanho);
      id = requestAnimationFrame(quadro);
    };
    id = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(id);
  }, [tamanho, vivo]);
  return <canvas ref={ref} className="rondin-esfera" style={{ width: tamanho, height: tamanho }} aria-hidden="true" />;
}

export function RondinFlutuante() {
  const [visivel, setVisivel] = useState(reduceMotion);
  const [aberto, setAberto] = useState(false);
  const [segurando, setSegurando] = useState(false);   // cursor ou foco em cima: não some
  const balao = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  /* o ciclo: aparece, fica alguns segundos, some, volta */
  const primeira = useRef(true);
  useEffect(() => {
    if (reduceMotion || aberto || segurando) return;
    const espera = visivel ? VISIVEL : primeira.current ? PRIMEIRA : ESCONDIDO;
    const id = setTimeout(() => { primeira.current = false; setVisivel((v) => !v); }, espera);
    return () => clearTimeout(id);
  }, [visivel, aberto, segurando]);

  /* o balão aberto: Esc ou um toque fora fecha, e o foco volta para o RONDIN */
  useEffect(() => {
    if (!aberto) return;
    balao.current?.querySelector<HTMLElement>(".btn")?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    const fora = (e: PointerEvent) => {
      const alvo = e.target as Node;
      if (!balao.current?.contains(alvo) && !botao.current?.contains(alvo)) fechar(false);
    };
    addEventListener("keydown", tecla);
    addEventListener("pointerdown", fora);
    return () => { removeEventListener("keydown", tecla); removeEventListener("pointerdown", fora); };
  }, [aberto]);

  const fechar = (devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  };

  const mostrando = visivel || aberto || segurando;
  return (
    <div className={`rondin-canto${mostrando ? " is-on" : ""}${aberto ? " is-aberto" : ""}`}>
      {aberto ? (
        <div className="rondin-balao" role="dialog" aria-labelledby="rondin-balao-texto" ref={balao}>
          <button type="button" className="rondin-fechar" aria-label="Fechar" onClick={() => fechar()}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 3.5l9 9m0-9l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
          <Esfera tamanho={96} vivo />
          <p id="rondin-balao-texto">Oi, eu sou o <b>RONDIN</b>. Quer me conhecer?</p>
          <Btn href={APP_CRIAR} className="rondin-conhecer">Conhecer RONDIN <span className="arrow">→</span></Btn>
        </div>
      ) : null}
      <button
        type="button" ref={botao} className="rondin-chamada"
        aria-label="RONDIN: oi, quer me conhecer?" aria-expanded={aberto} tabIndex={mostrando ? 0 : -1}
        onClick={() => setAberto((a) => !a)}
        onPointerEnter={() => setSegurando(true)} onPointerLeave={() => setSegurando(false)}
        onFocus={() => setSegurando(true)} onBlur={() => setSegurando(false)}
      >
        {!aberto ? <span className="rondin-fala" aria-hidden="true">Oi, quer me conhecer?</span> : null}
        <span className="rondin-orbe"><Esfera tamanho={64} vivo={mostrando} /></span>
      </button>
    </div>
  );
}
