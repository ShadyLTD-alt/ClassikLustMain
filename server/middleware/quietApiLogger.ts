import type { Request, Response, NextFunction } from "express";

export function quietApiLogger(req: Request, res: Response, next: NextFunction) {
  // Skip logging for static assets and uploads to prevent console spam
  if (req.path.startsWith('/uploads/') || req.path.includes('.js') || req.path.includes('.css') || req.path.includes('.png') || req.path.includes('.jpg')) {
    return next();
  }
  
  // Only log summary once per 5s window per route to avoid spam
  const key = `${req.method} ${req.path}`;
  const now = Date.now();
  const win: any = (global as any).__QUIET_LOG_WIN__ || ((global as any).__QUIET_LOG_WIN__ = {});
  const last = win[key] || 0;
  
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    if (now - last > 5000) {
      // 🔧 FIX: Only log actual API calls, not static assets
      if (req.path.startsWith('/api/')) {
        console.info(`[API] ${key} -> ${res.statusCode} (${typeof body === 'object' ? 'json' : 'raw'})`);
      }
      win[key] = now;
    }
    return originalJson(body);
  } 
  next();
}