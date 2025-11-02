import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "node:url";

// Helper to resolve project-root-relative paths reliably
const r = (...segs: string[]) => path.resolve(path.dirname(fileURLToPath(import.meta.url)), ...segs);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": r("client", "src"),
      "@shared": r("shared"),
      "@assets": r("attached_assets"),
      // Game data aliases
      "@data": r("main-gamedata"),
      "@master": r("main-gamedata", "master-data"),
      // 🌙 LUNABUG ALIAS - Bulletproof import path!
      "@lunabug": r("LunaBug"),
    },
  },
  root: r("client"),
  build: {
    outDir: r("dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      // Allow serving files from these directories
      allow: [r("main-gamedata"), r("LunaBug")],
      deny: ["**/.*"],
    },
  },
});