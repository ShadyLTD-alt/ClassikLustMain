import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 🖼️ Image Error Handler Middleware
 * Handles missing image files by serving placeholder or logging errors
 */
export function imageErrorHandler(req: Request, res: Response, next: NextFunction) {
  // Only handle image requests
  if (!req.path.startsWith('/uploads/') || !req.path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return next();
  }

  // Create a custom error handler for images
  const originalSend = res.send;
  const originalStatus = res.status;
  
  let hasError = false;
  
  res.status = function(code: number) {
    if (code >= 400) {
      hasError = true;
      console.warn(`🖼️ Image not found: ${req.path} (${code})`);
      
      // Try to serve placeholder instead
      const placeholderPath = path.join(__dirname, '../../uploads/placeholder-character.jpg');
      
      if (fs.existsSync(placeholderPath)) {
        console.log(`🖼️ Serving placeholder for: ${req.path}`);
        return res.sendFile(placeholderPath);
      } else {
        // Create a simple 1x1 transparent PNG as fallback
        const transparentPNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8q6QAAAABJRU5ErkJggg==', 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', transparentPNG.length);
        return originalSend.call(this, transparentPNG);
      }
    }
    return originalStatus.call(this, code);
  };
  
  next();
}

/**
 * Create placeholder image if it doesn't exist
 */
export function ensurePlaceholderImage(): void {
  const uploadsDir = path.join(__dirname, '../../uploads');
  const placeholderPath = path.join(uploadsDir, 'placeholder-character.jpg');
  
  if (!fs.existsSync(placeholderPath)) {
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Create a simple placeholder message
    console.log('🖼️ Creating placeholder image at:', placeholderPath);
    
    // This would be better with a real placeholder image, but for now just log
    console.warn('⚠️ No placeholder image found. Add placeholder-character.jpg to uploads/');
  }
}