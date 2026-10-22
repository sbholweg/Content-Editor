import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/bricolage-grotesque/700.css";
import "@fontsource/bricolage-grotesque/800.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
