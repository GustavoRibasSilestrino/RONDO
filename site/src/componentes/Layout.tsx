import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <header className="nav">
        <div className="wrap nav-in">
          <Link to="/" className="logo">
            Yester<span>you</span>
          </Link>
          <nav>
            <NavLink to="/planos">Planos</NavLink>
            <NavLink to="/profissionais/cadastro">Para profissionais</NavLink>
            <Link to="/planos" className="btn small">Começar</Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="foot">
        <div className="wrap foot-in">
          <div>
            <div className="logo">Yester<span>you</span></div>
            <p>Compita com quem você foi ontem.</p>
          </div>
          <div className="foot-links">
            <Link to="/termos">Termos e privacidade</Link>
            <Link to="/profissionais/cadastro">Cadastro de profissionais</Link>
          </div>
        </div>
        <p className="wrap aviso">
          O Rondo organiza e acompanha, mas não substitui avaliação profissional.
        </p>
      </footer>
    </>
  );
}
