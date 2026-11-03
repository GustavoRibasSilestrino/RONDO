import { Route, Routes } from "react-router-dom";
import Layout from "./componentes/Layout";
import Inicio from "./paginas/Inicio";
import Planos from "./paginas/Planos";
import Checkout from "./paginas/Checkout";
import CadastroProfissional from "./paginas/CadastroProfissional";
import Termos from "./paginas/Termos";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/planos" element={<Planos />} />
        <Route path="/checkout/:planoId" element={<Checkout />} />
        <Route path="/profissionais/cadastro" element={<CadastroProfissional />} />
        <Route path="/termos" element={<Termos />} />
      </Route>
    </Routes>
  );
}
