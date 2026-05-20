import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "mr-know",
  brand: {
    displayName: "미스터 노우",
    primaryColor: "#FFDF6E",
    icon: "/mr-know-icon.svg",
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
