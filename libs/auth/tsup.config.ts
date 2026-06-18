import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "react-router-dom"],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
  },
});
