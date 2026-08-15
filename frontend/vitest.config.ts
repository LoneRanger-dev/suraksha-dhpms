import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  // Next's postcss.config.mjs uses string-named plugins, which plain Vite's
  // PostCSS loader can't resolve. Component tests don't need CSS, so replace
  // discovery with an empty inline config instead of the project's file.
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
