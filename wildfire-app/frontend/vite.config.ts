import node_path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import cesium from "vite-plugin-cesium";

export default defineConfig({
	resolve: {
		dedupe: ["react", "react-dom", "react-router-dom"],
		alias: {
			"@": node_path.resolve(__dirname, "src"),
			"@spatialhub/forms": node_path.resolve(__dirname, "../../libs/forms/src"),
			"@spatialhub/auth": node_path.resolve(__dirname, "../../libs/auth/src"),
			"@spatialhub/ui": node_path.resolve(__dirname, "../../libs/ui/src"),
			"react": node_path.resolve(__dirname, "node_modules/react"),
			"react-dom": node_path.resolve(__dirname, "node_modules/react-dom"),
			"react-i18next": node_path.resolve(__dirname, "node_modules/react-i18next"),
			"i18next": node_path.resolve(__dirname, "node_modules/i18next"),
			"i18next-browser-languagedetector": node_path.resolve(__dirname, "node_modules/i18next-browser-languagedetector"),
		},
	},
	plugins: [react(), tailwindcss(), cesium()],
	server: {
		port: 3000,
		proxy: {
			"/api": {
				target: "http://localhost:8002",
				changeOrigin: true,
			},
		},
	},
	define: {
		global: "globalThis",
	},
});
