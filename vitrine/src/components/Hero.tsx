import { Btn } from "./ui";

/* Topo: tela cheia em violeta, um corredor em movimento (vulto borrado e o eco dele, o seu ontem) e o título à esquerda. */
export function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-grao" aria-hidden="true" />
      <p className="hero-marca" aria-hidden="true">RONDO</p>

      {/* o corredor em movimento: um vulto borrado e, logo atrás, o eco dele, o seu ontem */}
      <svg className="hero-corredor" viewBox="0 0 760 760" aria-hidden="true" focusable="false">
        <defs>
          <filter id="borra-forte" x="-40%" y="-20%" width="180%" height="140%"><feGaussianBlur stdDeviation="34 3" /></filter>
          <filter id="borra-media" x="-30%" y="-20%" width="160%" height="140%"><feGaussianBlur stdDeviation="14 2" /></filter>
          <filter id="borra-leve" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2 0.8" /></filter>
          <g id="vulto" fill="none" stroke="#070212" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="452" cy="128" r="40" fill="#070212" stroke="none" />
            <path d="M432 186 L352 372" strokeWidth="78" />
            <path d="M420 208 L336 270 L282 352" strokeWidth="34" />
            <path d="M438 214 L518 276 L580 214" strokeWidth="34" />
            <path d="M352 372 L282 500 L168 566" strokeWidth="56" />
            <path d="M168 566 L112 650" strokeWidth="38" />
            <path d="M352 372 L478 438 L492 580" strokeWidth="60" />
            <path d="M492 580 L560 634" strokeWidth="38" />
          </g>
        </defs>
        <g className="eco" transform="translate(-150 6)" opacity=".4" filter="url(#borra-forte)"><use href="#vulto" /></g>
        <g className="eco" transform="translate(-72 3)" opacity=".5" filter="url(#borra-media)"><use href="#vulto" /></g>
        <g opacity=".42" filter="url(#borra-media)"><use href="#vulto" /></g>
        <g opacity=".92" filter="url(#borra-leve)"><use href="#vulto" /></g>
      </svg>

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

      <a className="hero-rola" href="#recursos" aria-label="Rolar para ver mais">
        <span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v13M6 13l6 6 6-6" /></svg></span>
      </a>
    </section>
  );
}
