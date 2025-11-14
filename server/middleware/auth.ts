import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

declare module 'express-serve-static-core' {
  interface Request {
    player?: {
      id: string;
      telegramId: string | null;
      username: string;
      isAdmin: boolean;
    };
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.headers['authorization']?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return res.status(401).json({ 
      error: 'Authentication required', 
      message: 'You must be logged in to access this resource. Please authenticate with Telegram.' 
    });
  }
  
  try {
    const session = await storage.getSessionByToken(sessionToken);
    
    if (!session) {
      return res.status(401).json({ 
        error: 'Invalid session', 
        message: 'Your session has expired or is invalid. Please log in again.' 
      });
    }
    
    req.player = {
      id: session.player.id,
      telegramId: session.player.telegramId,
      username: session.player.username,
      isAdmin: session.player.isAdmin,
    };
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// ✅ ADD: Export alias for backward compatibility
export const authenticateToken = requireAuth;

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check admin token first (for external admin tools)
  const adminToken = req.headers['x-admin-token'] as string;
  const envAdminToken = process.env.ADMIN_TOKEN;
  
  if (envAdminToken && adminToken === envAdminToken) {
    return next();
  }
  
  // If no admin token, check if user is authenticated and is admin
  if (!req.player) {
    return res.status(401).json({ 
      error: 'Authentication required', 
      message: 'You must be logged in as an admin to access this resource.' 
    });
  }
  
  if (!req.player.isAdmin) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Admin access required. This action is restricted to administrators.' 
    });
  }
  
  next();
}

// New middleware: Optional admin - works for both admin users and admin token
export function optionalAdmin(req: Request, res: Response, next: NextFunction) {
  const adminToken = req.headers['x-admin-token'] as string;
  const envAdminToken = process.env.ADMIN_TOKEN;
  
  // Allow if valid admin token
  if (envAdminToken && adminToken === envAdminToken) {
    return next();
  }
  
  // Allow if authenticated user is admin
  if (req.player?.isAdmin) {
    return next();
  }
  
  // Deny access
  return res.status(403).json({ 
    error: 'Admin access required', 
    message: 'You need admin privileges or a valid admin token to access this resource.' 
  });
}