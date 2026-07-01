import { createRoot } from "react-dom/client";
import App from "@/App";
import "@/styles/global.css";

// Initialize the wildfire-owned i18n. App-specific strings are already baked
// into the locale files under src/i18n/locales, so there is no runtime merge.
import { initI18n } from "@/i18n";

initI18n({ storageKey: 'wildfire-app_language' });

// Feedback overlay temporarily disabled: @spatialhub/feedback not available locally.
// import { FeedbackOverlay } from "@spatialhub/feedback";

createRoot(document.getElementById("root")!).render(
  <App />
);
