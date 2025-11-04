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
      // 🌙 LUNABUG ALIAS - Use path.resolve for absolute path
      "@lunabug": path.resolve(r(), "LunaBug"),
      // Alternative: direct file alias for init.js
      "@lunabug/init": path.resolve(r(), "LunaBug", "init.js"),
    },
  },
  root: r("client"),
  build: {
    outDir: r("dist/public"),
    emptyOutDir: true,
    // Add rollup options to handle external dependencies
    rollupOptions: {
      // Don't bundle LunaBug - let it be external
      external: (id) => {
        // Only externalize in SSR mode, not client build
        return false;
      }
    }
  },
  server: {
    fs: {
      strict: false, // Allow access to parent directories
      // Allow serving files from these directories
      allow: [r(), r("main-gamedata"), r("LunaBug")],
      deny: ["**/node_modules/**", "**/.git/**"],
    },
    // Add more lenient CORS for development
    cors: true,
  },
  // Optimize deps to prevent reload issues
  optimizeDeps: {
    include: [],
    exclude: ['@lunabug/init']
  }
});