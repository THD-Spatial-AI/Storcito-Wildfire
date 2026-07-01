import node_path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	resolve: {
		dedupe: ["react", "react-dom", "react-router-dom"],
		alias: {
			"@": node_path.resolve(__dirname, "src"),
			"@spatialhub/feedback": node_path.resolve(__dirname, "../../../feeedback_pipeline/frontend_overlay/src"),
			"@spatialhub/forms": node_path.resolve(__dirname, "../../libs/forms/src"),
			"@spatialhub/auth": node_path.resolve(__dirname, "../../libs/auth/src"),
			"@spatialhub/ui": node_path.resolve(__dirname, "../../libs/ui/src"),
			// i18n is now owned by the wildfire app (src/i18n). The shared auth/forms
			// libs still import "@spatialhub/i18n", so re-point that alias to the local
			// module — everything then shares one i18next instance + wildfire's locales.
			"@spatialhub/i18n": node_path.resolve(__dirname, "src/i18n"),
			"react": node_path.resolve(__dirname, "node_modules/react"),
			"react-dom": node_path.resolve(__dirname, "node_modules/react-dom"),
			"react-i18next": node_path.resolve(__dirname, "node_modules/react-i18next"),
			"i18next": node_path.resolve(__dirname, "node_modules/i18next"),
			"i18next-browser-languagedetector": node_path.resolve(__dirname, "node_modules/i18next-browser-languagedetector"),
		},
	},
	plugins: [react(), tailwindcss()],
	server: {
		port: 3000,
		proxy: {
			"/api": {
				target: "http://localhost:8000",
				changeOrigin: true,
			},
		},
	},
	define: {
		global: "globalThis",
	},
});
