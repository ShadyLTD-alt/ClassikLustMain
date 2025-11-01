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
      // New: single source of truth for game data JSONs
      "@data": r("main-gamedata"),
      // Optional: direct shortcuts
      "@master": r("main-gamedata", "master-data"),
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
      // Allow serving JSON from main-gamedata via the new aliases
      allow: [r("main-gamedata")],
      deny: ["**/.*"],
    },
  },
});