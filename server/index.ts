import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { syncAllGameData } from "./utils/dataLoader";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import logger from "./logger";
import { quietApiLogger } from "./middleware/quietApiLogger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();

// Reduce API console spam
app.use(quietApiLogger);

app.use(express.json({
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// 🖼️ Serve uploads statically BEFORE any SPA fallback
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  fallthrough: false,
  index: false,
  maxAge: '1y'
}));

(async () => {
  await syncAllGameData();
  const server = await registerRoutes(app);
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true });
})();
