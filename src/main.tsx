import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { edition, displayName, subline } from "./config/edition";

if (edition === "dci") {
  document.documentElement.dataset.edition = edition;
  document.title = `${displayName}: ${subline}`;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
