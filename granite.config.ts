import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "lua-nooga-ai",
  brand: {
    displayName: "누가 잘못 AI",
    primaryColor: "#FFDF6E",
    icon: "/nuga-wrong-ai-icon.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
