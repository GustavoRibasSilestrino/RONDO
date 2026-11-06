import { Btn } from "./ui";

/* Topo: tela cheia em violeta, um corredor em movimento (vulto borrado e o eco dele, o seu ontem) e o título à esquerda. */
export function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-grao" aria-hidden="true" />
      <p className="hero-marca" aria-hidden="true">RONDO</p>

      {/* o corredor: a foto em preto sobre branco, que o violeta atravessa; atrás dele, o eco dele, o seu ontem */}
      <div className="hero-corredor" aria-hidden="true">
        <img className="eco e2" src="/corredor.webp" alt="" width="1280" height="1240" decoding="async" />
        <img className="eco e1" src="/corredor.webp" alt="" width="1280" height="1240" decoding="async" />
        <img className="vulto" src="/corredor.webp" alt="" width="1280" height="1240" fetchPriority="high" />
      </div>

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
