import type { Request, Response, NextFunction } from "express";

export function quietApiLogger(req: Request, res: Response, next: NextFunction) {
  // Only log summary once per 5s window per route to avoid spam
  const key = `${req.method} ${req.path}`;
  const now = Date.now();
  const win: any = (global as any).__QUIET_LOG_WIN__ || ((global as any).__QUIET_LOG_WIN__ = {});

  const originalJson = res.json.bind(res);
  (res as any).json = (body: any) => {
    const last = win[key] || 0;
    if (now - last > 5000) {
      console.info(`[API] ${key} -> ${res.statusCode} (${typeof body === 'object' ? 'json' : 'raw'})`);
      win[key] = now;
    }
    return originalJson(body);
  };

  next();
}
