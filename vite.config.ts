import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/server/**",
      "**/api/**/*.test.mjs",
    ],
    globals: true,
    passWithNoTests: true,
    setupFiles: "./src/test/setup.ts",
  },
});
