import { createRoot } from "react-dom/client";
import App from "@/App";
import "@/styles/global.css";
import "@/index.css";

import { initI18n } from "@/i18n";

initI18n({ storageKey: "wildfire-app_language" });

// Feedback overlay temporarily disabled: @spatialhub/feedback not available locally.
// import { FeedbackOverlay } from "@spatialhub/feedback";

createRoot(document.getElementById("root")!).render(<App />);
