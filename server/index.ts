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

  // 🌙 Phase 1: Initialize Luna Bug (ESM-safe dynamic imports)
  let luna = null;
  let lunaRouter = null;
  let setLunaInstance = null;
  
  try {
    logger.info('🌙 [PHASE 1] Initializing LunaBug system...');
    
    // Step 1: Load LunaBug config first
    const lunaConfigPath = path.join(__dirname, '..', 'LunaBug', 'config', 'default.json');
    let lunaConfig = {};
    
    try {
      if (fs.existsSync(lunaConfigPath)) {
        const configData = fs.readFileSync(lunaConfigPath, 'utf-8');
        lunaConfig = JSON.parse(configData);
        logger.info('✅ LunaBug config loaded from', lunaConfigPath);
      } else {
        logger.warn('⚠️ LunaBug config not found, using defaults');
      }
    } catch (configErr) {
      logger.warn('⚠️ Failed to load LunaBug config:', configErr);
    }

    // Step 2: Import LunaBug class
    // @ts-ignore
    const { default: LunaBug } = await import('../LunaBug/luna.js');
    logger.info('✅ LunaBug class imported');
    
    // Step 3: Import Luna API routes
    // @ts-ignore
    const lunaApi = await import('./routes/luna.js');
    lunaRouter = lunaApi.router;
    setLunaInstance = lunaApi.setLunaInstance;
    logger.info('✅ Luna API routes imported');
    
    // Step 4: Create Luna instance with config
    luna = new LunaBug(lunaConfig);
    logger.info('✅ LunaBug instance created');
    
    // Step 5: Connect routes to Luna instance
    if (setLunaInstance && luna) {
      setLunaInstance(luna);
      logger.info('✅ Luna instance connected to API routes');
    }
    
    logger.info('✅ 🌙 Luna Bug initialized successfully');
  } catch (err) {
    const error = err as Error;
    logger.error('❌ [PHASE 1] Luna initialization failed:', error?.message || err);
    logger.warn('⚠️ Server will continue without Luna Bug');
  }

  // ✅ Phase 2: UNIFIED DATA LOADER - Sync ALL game data from progressive-data directories ONLY
  logger.info('🔄 [PHASE 2] Starting unified game data sync from progressive-data...');
  try {
    await syncAllGameData();
    logger.info('✅ Game data synced successfully from progressive-data - memory cache populated');
    logger.info('📍 Data Source: main-gamedata/progressive-data/ (SINGLE SOURCE OF TRUTH)');
  } catch (err) {
    logger.error("❌ CRITICAL: Failed to sync game data on startup:", err);
    logger.warn("⚠️ Server may not work correctly without game data");
  }

  // ✅ Phase 3: Register core routes
  logger.info('📝 [PHASE 3] Registering core routes...');
  const server = await registerRoutes(app);
  logger.info('✅ Core routes registered');

  // ✅ Phase 4: Register player routes (ESM)
  logger.info('👤 [PHASE 4] Registering player routes (ESM)...');
  try {
    // @ts-ignore
    const { default: playerRoutes } = await import('./routes/player-routes.mjs');
    app.use('/api/player', playerRoutes);
    logger.info('✅ Player routes registered at /api/player/* (ESM)');
  } catch (err) {
    logger.error('❌ Failed to load player routes:', err);
  }

  // ✅ Phase 5: Register admin routes (legacy + new ESM)
  logger.info('🔧 [PHASE 5] Registering admin routes...');
  app.use('/api/admin', requireAuth, requireAdmin, adminRouter);
  logger.info('✅ Admin routes registered at /api/admin/*');
  
  // Try to load additional admin routes from ESM
  try {
    // @ts-ignore
    const { default: adminRoutesExtra } = await import('./routes/admin-routes.mjs');
    app.use('/api/admin', requireAuth, requireAdmin, adminRoutesExtra);
    logger.info('✅ Additional admin routes registered (ESM)');
  } catch (err) {
    logger.warn('⚠️ Additional admin routes not available:', err);
  }

  // ✅ Phase 6: Add Luna API routes if available
  if (luna && lunaRouter) {
    logger.info('🌙 [PHASE 6] Registering Luna API routes...');
    app.use('/api/luna', lunaRouter);
    logger.info('✅ Luna API routes registered at /api/luna/*');
  } else {
    logger.warn('⚠️ [PHASE 6] Luna API routes not available');
  }

  logger.info('✅ All routes registered successfully');

  // ✅ Phase 7: Static file serving
  logger.info('📁 [PHASE 7] Setting up static file serving...');
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
  logger.info('✅ Static files configured at /uploads');

  // Error handler middleware
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

  // ✅ Phase 8: Vite setup or static serving
  logger.info('👨‍💻 [PHASE 8] Setting up frontend serving...');
  if (app.get("env") === "development") {
    logger.info('Setting up Vite dev server...');
    await setupVite(app, server);
    logger.info('Vite dev server ready');
  } else {
    logger.info('Serving static files (production mode)...');
    serveStatic(app);
    logger.info('Static files ready');
  }

  // ✅ Phase 9: Start server
  const port = parseInt(process.env.PORT || '5000', 10);
  logger.info(`🌍 [PHASE 9] Starting server on port ${port}...`);
  
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
    if (luna) {
      logger.info(`🌙 Luna Bug API: http://0.0.0.0:${port}/api/luna/*`);
    }

    // ✅ Phase 10: Start Luna monitoring if initialized
    if (luna) {
      logger.info('🌙 [PHASE 10] Starting Luna Bug monitoring...');
      setTimeout(async () => {
        try {
          await luna.start();
          logger.info('✅ 🌙 Luna Bug monitoring started successfully');
        } catch (err) {
          logger.error('❌ Failed to start Luna Bug monitoring:', err);
        }
      }, 2000);
    } else {
      logger.info('⚠️ [PHASE 10] Luna Bug monitoring skipped (not initialized)');
    }
    
    logger.info('🎉 ✅ ALL PHASES COMPLETE - Server fully operational');
  });
})();
