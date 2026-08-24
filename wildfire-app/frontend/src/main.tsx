import { createRoot } from "react-dom/client";
import App from "@/App";
import "@fontsource-variable/inter";
import "@/styles/global.css";
import "@/index.css";

import { initI18n } from "@/i18n";
import { FeedbackOverlay } from "@/feedback";

initI18n({ storageKey: "wildfire-app_language" });

createRoot(document.getElementById("root")!).render(
	<FeedbackOverlay
		apiUrl={import.meta.env.VITE_FEEDBACK_API_URL ?? ""}
		workshopToken={import.meta.env.VITE_WORKSHOP_TOKEN ?? ""}
		workshopTag={import.meta.env.VITE_WORKSHOP_TAG ?? ""}
	>
		<App />
	</FeedbackOverlay>,
);
