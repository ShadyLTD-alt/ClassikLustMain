import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log as viteLog } from "./vite";
import { syncAllGameData } from "./utils/dataLoader";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Error handlers at the very top using Winston
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  // Do not exit immediately on Replit; allow log capture
});

declare module 'http' {
  interface IncomingMessage { rawBody: unknown }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const p = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  } as any;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const base = { method: req.method, path: p, status: res.statusCode, duration };

    if (p.startsWith("/api")) {
      const payload = capturedJsonResponse && JSON.stringify(capturedJsonResponse).slice(0, 500);
      logger.info({ ...base, payload });
    } else {
      logger.debug(base as any);
    }
  });

  // Log if request takes more than 5 seconds
  setTimeout(() => {
    if (!res.headersSent) {
      logger.warn({ msg: 'REQUEST HANGING', method: req.method, url: req.url, ms: Date.now() - start });
    }
  }, 5000);

  next();
});

(async () => {
  logger.info('Starting server initialization...');

  // Sync game data from JSON files FIRST (blocking)
  logger.info('Starting game data sync...');
  try {
    await syncAllGameData();
    logger.info('Game data synced successfully - memory cache populated');
  } catch (err) {
    logger.error('CRITICAL: Failed to sync game data on startup', { err });
    logger.warn('Server may not work correctly without game data');
  }

  logger.info('Registering routes...');
  const server = await registerRoutes(app);
  logger.info('Routes registered successfully');

  logger.info('Setting up static file serving...');
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
  logger.info('Static files configured');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error('ERROR handler', { status, message, stack: err.stack, ...err });

    res.status(status).json({ message, error: err.message });
  });

  if (app.get("env") === "development") {
    logger.info('Setting up Vite dev server...');
    await setupVite(app, server);
    logger.info('Vite dev server ready');
  } else {
    logger.info('Serving static files (production mode)...');
    serveStatic(app);
    logger.info('Static files ready');
  }

  const port = parseInt(process.env.PORT || '5000', 10);

  logger.info(`Starting server on port ${port}...`);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    viteLog(`Server listening on port ${port}`);
    logger.info(`Server is ready and accepting connections on http://0.0.0.0:${port}`);
  });
})();
