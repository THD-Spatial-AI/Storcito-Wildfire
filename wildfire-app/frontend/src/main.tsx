import { createRoot } from "react-dom/client";
import App from "@/App";
import "@fontsource-variable/inter";
import "@/styles/global.css";

import { initI18n } from "@/i18n";
import { FeedbackOverlay } from "@/feedback";

initI18n({ storageKey: "wildfire-app_language" });

const RELOAD_FLAG = "wildfire-app_chunk-reload";
const RELOAD_COOLDOWN_MS = 60_000;

const reloadOnceForStaleBuild = () => {
  let lastReload = 0;
  try {
    lastReload = Number(sessionStorage.getItem(RELOAD_FLAG)) || 0;
  } catch {
    return;
  }

  if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) return;

  try {
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
};

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadOnceForStaleBuild();
});

createRoot(document.getElementById("root")!).render(
  <FeedbackOverlay
    apiUrl={import.meta.env.VITE_FEEDBACK_API_URL ?? ""}
    workshopToken={import.meta.env.VITE_WORKSHOP_TOKEN ?? ""}
    workshopTag={import.meta.env.VITE_WORKSHOP_TAG ?? ""}
  >
    <App />
  </FeedbackOverlay>
);
