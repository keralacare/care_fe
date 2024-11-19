import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import App from "@/App";
import { initSentry } from "@/Integrations/Sentry";
import "@/i18n";
import "@/style/index.css";

if (import.meta.env.PROD) {
  initSentry();
}

if ("serviceWorker" in navigator) {
  registerSW({ immediate: false });
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
