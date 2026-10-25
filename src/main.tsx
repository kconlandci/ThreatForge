import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { edition, browserTitle } from "./config/edition";

if (edition === "dci") {
  document.documentElement.dataset.edition = edition;
  document.title = browserTitle;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
