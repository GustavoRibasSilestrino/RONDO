import { useLayoutEffect, useRef } from "react";
import { gsap } from "../lib/gsap";
import { reduceMotion } from "../lib/util";
import { Btn } from "./ui";

/* Topo: tela cheia com a foto das montanhas (o nome RONDO já está nelas) e o título à esquerda. */
export function Hero() {
  const raiz = useRef<HTMLElement>(null);
  /* GSAP: a entrada em sequência (título, frase, botões) */
  useLayoutEffect(() => {
    if (reduceMotion || !raiz.current) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(".hero-title .ln", { yPercent: 40, opacity: 0, duration: 1, stagger: 0.14, clearProps: "transform,opacity" }, 0.15)
        .from(".hero-texto .lead", { y: 24, opacity: 0, duration: 0.9, clearProps: "transform,opacity" }, 0.55)
        .from(".hero-cta .btn", { y: 20, opacity: 0, duration: 0.8, stagger: 0.1, clearProps: "transform,opacity" }, 0.7);
    }, raiz);
    return () => ctx.revert();
  }, []);
  return (
    <section className="hero" id="inicio" ref={raiz}>
      <div className="hero-grao" aria-hidden="true" />

      <div className="wrap hero-in hero-grade">
        <div className="hero-texto">
          <h1 className="hero-title" aria-label="Vença o você de ontem.">
            <span className="ln">Vença o você</span>
            <span className="ln trail">de ontem.</span>
          </h1>
          <p className="lead">Treino, dieta, constância e comunidade em um só app, e recados de voz para o seu eu do futuro.</p>
          <div className="hero-cta">
            <Btn href="#cadastro">Criar conta grátis <span className="arrow">→</span></Btn>
            <Btn href="#recursos" kind="ghost">Ver o app</Btn>
          </div>
        </div>
      </div>

    </section>
  );
}
