import { createRoot } from "react-dom/client";
import "./index.css";

if (
  window.location.pathname === "/reset-password" &&
  (window.location.hash || window.location.search)
) {
  sessionStorage.setItem(
    "ofertativa-password-recovery-url",
    `${window.location.search}${window.location.hash}`
  );
}

import("./App.tsx").then(({ default: App }) => {
  createRoot(document.getElementById("root")!).render(<App />);
});
