import { Backdrop } from "./components/Backdrop";
import { CadastroModal } from "./components/CadastroModal";
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

export default function App() {
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
      <CadastroModal />
    </>
  );
}
