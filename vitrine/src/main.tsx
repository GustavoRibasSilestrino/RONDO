import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/menu.css";
import "./styles/nav-mobile.css";
import "./styles/day.css";
import "./styles/fit.css";
import "./styles/streak.css";
import "./styles/mobile.css";
import "./styles/responsive.css";
import "./styles/cadastro.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
