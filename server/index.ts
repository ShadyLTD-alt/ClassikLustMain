import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log as viteLog } from "./vite";
import { syncAllGameData } from "./utils/unifiedDataLoader";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import logger from "./logger";
import adminRouter from "./routes/admin";
import { requireAuth, requireAdmin } from "./middleware/auth";

// ✅ Import character selection & gallery routes
import playerRoutes from "./routes/player-routes.js";
import adminRoutes from "./routes/admin-routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const app = express();

// Error handlers at the very top
process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  process.exit(1);
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
  res.json = function (bodyJson: any[]) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson]);
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
  logger.info('🚀 Starting server initialization...');

  // 🌙 Initialize Luna Bug (ESM-safe dynamic imports)
  let luna = null;
  let lunaRouter = null;
  let setLunaInstance = null;
  try {
    // @ts-ignore
    const { default: LunaBug } = await import('../LunaBug/luna.js');
    // @ts-ignore
    const lunaApi = await import('./routes/luna.js');
    lunaRouter = lunaApi.router;
    setLunaInstance = lunaApi.setLunaInstance;
    luna = new LunaBug();
    setLunaInstance(luna);
    logger.info('✅ Luna Bug initialized');
  } catch (err) {
    const error = err as Error;
    logger.warn('⚠️ Luna init skipped:', error?.message || err);
  }

  // ✅ UNIFIED DATA LOADER: Sync ALL game data from progressive-data directories ONLY
  logger.info('🔄 Starting unified game data sync from progressive-data...');
  try {
    await syncAllGameData();
    logger.info('✅ Game data synced successfully from progressive-data - memory cache populated');
    logger.info('📍 Data Source: main-gamedata/progressive-data/ (SINGLE SOURCE OF TRUTH)');
  } catch (err) {
    logger.error("❌ CRITICAL: Failed to sync game data on startup:", err);
    logger.warn("⚠️ Server may not work correctly without game data");
  }

  logger.info('📝 Registering routes...');
  const server = await registerRoutes(app);

  // ✅ REGISTER CHARACTER SELECTION & GALLERY ROUTES
  logger.info('👤 Registering player routes (character selection & gallery)...');
  app.use('/api/player', playerRoutes);
  logger.info('✅ Player routes registered at /api/player/*');

  // ✅ REGISTER ADMIN ROUTES - Full CRUD for all entities + media sync
  logger.info('🔧 Registering admin routes...');
  app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
  app.use('/api/admin', adminRoutes);
  logger.info('✅ Admin routes registered at /api/admin/*');

  // Add Luna API routes if available
  if (luna && lunaRouter) {
    app.use('/api/luna', lunaRouter);
    logger.info('✅ Luna API routes registered');
  }
  
  logger.info('✅ Routes registered successfully');

  logger.info('📁 Setting up static file serving...');
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
  logger.info('✅ Static files configured');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error('💥 ERROR:', {
      status,
      message,
      stack: err.stack,
      ...err,
    });

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

  logger.info(`🌍 Starting server on port ${port}...`);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info(`✅ Server listening on port ${port}`);
    logger.info(`✅ Server is ready and accepting connections on http://0.0.0.0:${port}`);
    logger.info(`📦 Game Config: Using unifiedDataLoader (progressive-data only)`);
    logger.info(`🔧 Admin Panel API: http://0.0.0.0:${port}/api/admin/*`);
    logger.info(`👤 Player API: http://0.0.0.0:${port}/api/player/*`);

    // Start Luna monitoring if initialized
    if (luna) {
      setTimeout(async () => {
        try {
          await luna.start();
          logger.info('🌙 Luna Bug monitoring started');
        } catch (err) {
          logger.error('❌ Failed to start Luna Bug:', err);
        }
      }, 2000);
    }
  });
})();
