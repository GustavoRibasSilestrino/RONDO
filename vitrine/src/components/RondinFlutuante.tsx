import { useEffect, useRef, useState } from "react";
import { desenharOrbe, esfera } from "../lib/orbe";
import { APP_CRIAR } from "../lib/rotas";
import { tocarNotificacao } from "../lib/som";
import { reduceMotion } from "../lib/util";
import { Btn } from "./ui";

/* O RONDIN no canto da tela (pedido do dono em 2026-11-12): aparece por alguns segundos com "Oi, quer me conhecer?",
   some, e volta depois, cada vez num dos quatro cantos, sorteado, com um som de notificação (lib/som.ts; só depois que
   a pessoa já interagiu com a página, regra dos navegadores). Tocar nele abre um balão de fala com o convite e o botão que leva a criar a conta no app.
   Com o cursor (ou o foco) em cima ele não some. Para quem pede menos movimento, fica sempre ali, parado.
   No celular (desde 2026-11-13): só nos cantos de baixo, e só depois que a pessoa rola para fora da primeira tela (nela,
   ele ficava em cima do nome RONDO da foto ou dos botões). */
const PRIMEIRA = 2500;     // ms até a primeira aparição
const VISIVEL = 5000;      // ms que ele fica na tela
const ESCONDIDO = 7000;    // ms até voltar

/* os quatro cantos da tela: superior/inferior + esquerdo/direito */
type Canto = "se" | "sd" | "ie" | "id";
const CANTOS: Canto[] = ["se", "sd", "ie", "id"];
/* no celular e no tablet, só os cantos de baixo: os de cima cobririam o nome RONDO da foto e o menu */
const TELA_PEQUENA = "(max-width: 960px), (max-aspect-ratio: 4/5)";
const pequena = () => typeof matchMedia !== "undefined" && matchMedia(TELA_PEQUENA).matches;
const sortearCanto = (anterior: Canto | null): Canto => {
  const opcoes = CANTOS.filter((c) => c !== anterior && (!pequena() || c === "ie" || c === "id"));
  return opcoes[Math.floor(Math.random() * opcoes.length)];
};

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

  /* no celular a primeira tela é ocupada inteira pela foto, pelo título e pelos botões: enquanto ela estiver à vista, o
     RONDIN espera (ele cobriria o texto e os botões). Aparece depois que a pessoa rola a página. */
  const [heroNaTela, setHeroNaTela] = useState(false);
  useEffect(() => {
    const hero = document.querySelector(".hero");
    if (!hero || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setHeroNaTela(pequena() && e.intersectionRatio > 0.2), { threshold: [0, 0.2, 0.5, 1] });
    io.observe(hero);
    return () => io.disconnect();
  }, []);
  const esperando = heroNaTela && !aberto;

  /* o ciclo: aparece, fica alguns segundos, some, volta; cada vez num canto sorteado (nunca o mesmo da vez anterior) */
  const [canto, setCanto] = useState<Canto>("id");
  const primeira = useRef(true);
  useEffect(() => {
    if (esperando) { setVisivel(false); return; }
    if (reduceMotion || aberto || segurando) return;
    const espera = visivel ? VISIVEL : primeira.current ? PRIMEIRA : ESCONDIDO;
    const id = setTimeout(() => {
      if (!visivel) {
        setCanto((atual) => sortearCanto(primeira.current ? null : atual));
        tocarNotificacao();
      }
      primeira.current = false;
      setVisivel(!visivel);
    }, espera);
    return () => clearTimeout(id);
  }, [visivel, aberto, segurando, esperando]);

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

  const mostrando = aberto || (!esperando && (visivel || segurando || reduceMotion));
  return (
    <div className={`rondin-canto canto-${canto}${mostrando ? " is-on" : ""}${aberto ? " is-aberto" : ""}`}>
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
