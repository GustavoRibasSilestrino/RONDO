import { useEffect } from "react";
import { Backdrop } from "./components/Backdrop";
import { Compare } from "./components/Compare";
import { Constancia } from "./components/Constancia";
import { Day } from "./components/Day";
import { GymScene } from "./components/GymScene";
import { Hero } from "./components/Hero";
import { Nav } from "./components/Nav";
import { Recado } from "./components/Recado";
import { Clube, Entrar, Faq, Footer, Planos, Profissionais } from "./components/Sections";
import { Tools } from "./components/Tools";
import { usePauseOffscreen, useSpotlight } from "./components/ui";
import { APP_CRIAR } from "./lib/rotas";

/* links antigos para #cadastro (e-mails, favoritos) levam para a conversa com o RONDIN, no app */
const irParaOApp = () => { if (location.hash === "#cadastro") location.replace(APP_CRIAR); };

export default function App() {
  useEffect(() => {
    irParaOApp();
    addEventListener("hashchange", irParaOApp);
    return () => removeEventListener("hashchange", irParaOApp);
  }, []);
  useSpotlight();
  usePauseOffscreen();
  return (
    <>
      <Backdrop />
      <Nav />
      <main id="conteudo">
        <Hero />
        <GymScene />
        <Day />
        <Compare />
        <Recado />
        <Tools />
        <Constancia />
        <Clube />
        <Profissionais />
        <Planos />
        <Faq />
        <Entrar />
      </main>
      <Footer />
    </>
  );
}
