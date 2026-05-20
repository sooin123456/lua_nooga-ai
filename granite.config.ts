import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "nuga-wrong-ai",
  description:
    "미스 노짱이 대화 싸움을 무료로 판독하고, 990원 판례 판독 연결을 준비하는 Toss 미니앱",
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
