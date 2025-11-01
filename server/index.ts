import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { syncAllGameData } from "./utils/dataLoader";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Error handlers at the very top
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  // Log if request takes more than 5 seconds
  setTimeout(() => {
    if (!res.headersSent) {
      console.error(`⚠️ REQUEST HANGING: ${req.method} ${req.url} - ${Date.now() - start}ms`);
    }
  }, 5000);

  next();
});

(async () => {
  console.log('🚀 Starting server initialization...');

  // Sync game data from JSON files FIRST (blocking)
  console.log('🔄 Starting game data sync...');
  try {
    await syncAllGameData();
    console.log('✅ Game data synced successfully - memory cache populated');
  } catch (err) {
    console.error("❌ CRITICAL: Failed to sync game data on startup:", err);
    console.log("⚠️ Server may not work correctly without game data");
    // Still continue startup but log the issue
  }

  console.log('📝 Registering routes...');
  const server = await registerRoutes(app);
  console.log('✅ Routes registered successfully');

  console.log('📁 Setting up static file serving...');
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
  console.log('✅ Static files configured');

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('💥 ERROR:', {
      status,
      message,
      stack: err.stack,
      ...err,
    });

    res.status(status).json({ message, error: err.message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    console.log('⚙️ Setting up Vite dev server...');
    await setupVite(app, server);
    console.log('✅ Vite dev server ready');
  } else {
    console.log('📦 Serving static files (production mode)...');
    serveStatic(app);
    console.log('✅ Static files ready');
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);

  console.log(`🌐 Starting server on port ${port}...`);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`✅ Server listening on port ${port}`);
    console.log(`✅ Server is ready and accepting connections on http://0.0.0.0:${port}`);
  });
})();